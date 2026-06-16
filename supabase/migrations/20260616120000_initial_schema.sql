-- BiblEagles — schema inicial (issue #2)
-- Tabelas + RLS para leitura bíblica em família.

create extension if not exists pgcrypto with schema extensions;

-- ════════════════════════════════════════════════════════════════════════
-- Tabelas
-- ════════════════════════════════════════════════════════════════════════

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  preferred_version text not null default 'NVI',
  preferred_language text not null default 'pt' check (preferred_language in ('pt', 'en', 'es', 'de')),
  notification_enabled boolean not null default false,
  notification_time time not null default '07:00:00',
  created_at timestamptz not null default now()
);

create table public.reading_packages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_date date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.reading_plan_days (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.reading_packages (id) on delete cascade,
  date date not null,
  title text not null,
  passages jsonb not null check (jsonb_typeof(passages) = 'array'),
  created_at timestamptz not null default now(),
  unique (package_id, date)
);

create table public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan_day_id uuid not null references public.reading_plan_days (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, plan_day_id)
);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  book text not null,
  chapter integer not null check (chapter > 0),
  verse integer not null check (verse > 0),
  bible_version text not null,
  color text not null check (color in ('yellow', 'green', 'rose', 'blue')),
  created_at timestamptz not null default now(),
  unique (user_id, book, chapter, verse, bible_version)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  book text not null,
  chapter integer not null check (chapter > 0),
  verse integer not null check (verse > 0),
  bible_version text not null,
  content text not null,
  parent_id uuid references public.comments (id) on delete cascade,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  comment_id uuid not null references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, comment_id)
);

-- ════════════════════════════════════════════════════════════════════════
-- Índices
-- ════════════════════════════════════════════════════════════════════════

create index reading_plan_days_package_date_idx on public.reading_plan_days (package_id, date);
create index reading_progress_plan_day_idx on public.reading_progress (plan_day_id);
create index bookmarks_verse_idx on public.bookmarks (book, chapter, verse, bible_version);
create index comments_verse_idx on public.comments (book, chapter, verse, bible_version);
create index comments_parent_idx on public.comments (parent_id);
create index comment_likes_comment_idx on public.comment_likes (comment_id);

-- ════════════════════════════════════════════════════════════════════════
-- Funções auxiliares e triggers
-- ════════════════════════════════════════════════════════════════════════

-- security definer: precisa ler public.users sem ficar sujeita à própria RLS
-- que está protegendo essa mesma tabela (evita recursão).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- Cria o perfil em public.users automaticamente quando alguém se cadastra
-- via Supabase Auth (e-mail/senha — ver PRD 3.1).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Apenas admins podem alterar o "role" de um usuário (promoção/rebaixamento
-- ocorre dentro do app — PRD 3.11 — nunca pelo próprio usuário).
create or replace function public.protect_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() é nulo fora do contexto PostgREST autenticado (SQL direto,
  -- service_role, painel do Supabase) — é assim que o primeiro admin é
  -- definido manualmente (PRD 3.2). Só restringe usuários autenticados.
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Apenas administradores podem alterar o papel (role) de um usuário.';
  end if;
  return new;
end;
$$;

create trigger protect_user_role_trigger
  before update on public.users
  for each row execute function public.protect_user_role();

-- Threading de comentários tem só 1 nível de profundidade (PRD 3.6/12):
-- não é permitido responder a uma resposta.
create or replace function public.enforce_comment_depth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  grandparent_id uuid;
begin
  if new.parent_id is not null then
    select parent_id into grandparent_id from public.comments where id = new.parent_id;
    if grandparent_id is not null then
      raise exception 'Respostas só podem ter 1 nível de profundidade.';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_comment_depth_trigger
  before insert on public.comments
  for each row execute function public.enforce_comment_depth();

-- Edição de comentário deve afetar somente o conteúdo; demais campos são
-- imutáveis após a criação.
create or replace function public.protect_comment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.book is distinct from old.book
    or new.chapter is distinct from old.chapter
    or new.verse is distinct from old.verse
    or new.bible_version is distinct from old.bible_version
    or new.parent_id is distinct from old.parent_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Apenas o conteúdo do comentário pode ser editado.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger protect_comment_fields_trigger
  before update on public.comments
  for each row execute function public.protect_comment_fields();

-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════════

alter table public.users enable row level security;
alter table public.reading_packages enable row level security;
alter table public.reading_plan_days enable row level security;
alter table public.reading_progress enable row level security;
alter table public.bookmarks enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;

-- users: todo autenticado lê; cada um edita o próprio perfil (role protegido
-- pelo trigger acima); não há policy de insert/delete — perfis só são
-- criados pelo trigger handle_new_user (security definer) e nunca apagados
-- via API.
create policy "users_select_authenticated" on public.users
  for select using (auth.uid() is not null);

create policy "users_update_own_or_admin" on public.users
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- reading_packages: todo autenticado lê; somente admin cria/edita/remove.
create policy "reading_packages_select_authenticated" on public.reading_packages
  for select using (auth.uid() is not null);

create policy "reading_packages_admin_insert" on public.reading_packages
  for insert with check (public.is_admin());

create policy "reading_packages_admin_update" on public.reading_packages
  for update using (public.is_admin()) with check (public.is_admin());

create policy "reading_packages_admin_delete" on public.reading_packages
  for delete using (public.is_admin());

-- reading_plan_days: todo autenticado lê; somente admin cria/edita/remove
-- (inclusive dias retroativos — PRD 3.2).
create policy "reading_plan_days_select_authenticated" on public.reading_plan_days
  for select using (auth.uid() is not null);

create policy "reading_plan_days_admin_insert" on public.reading_plan_days
  for insert with check (public.is_admin());

create policy "reading_plan_days_admin_update" on public.reading_plan_days
  for update using (public.is_admin()) with check (public.is_admin());

create policy "reading_plan_days_admin_delete" on public.reading_plan_days
  for delete using (public.is_admin());

-- reading_progress: todo autenticado lê (acompanhar progresso da família);
-- cada um só registra/edita/remove a própria leitura.
create policy "reading_progress_select_authenticated" on public.reading_progress
  for select using (auth.uid() is not null);

create policy "reading_progress_own_insert" on public.reading_progress
  for insert with check (auth.uid() = user_id);

create policy "reading_progress_own_update" on public.reading_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reading_progress_own_delete" on public.reading_progress
  for delete using (auth.uid() = user_id);

-- bookmarks: todo autenticado lê (destaques da família); cada um gerencia
-- os próprios.
create policy "bookmarks_select_authenticated" on public.bookmarks
  for select using (auth.uid() is not null);

create policy "bookmarks_own_insert" on public.bookmarks
  for insert with check (auth.uid() = user_id);

create policy "bookmarks_own_update" on public.bookmarks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "bookmarks_own_delete" on public.bookmarks
  for delete using (auth.uid() = user_id);

-- comments: todo autenticado lê; cada um gerencia os próprios comentários.
create policy "comments_select_authenticated" on public.comments
  for select using (auth.uid() is not null);

create policy "comments_own_insert" on public.comments
  for insert with check (auth.uid() = user_id);

create policy "comments_own_update" on public.comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "comments_own_delete" on public.comments
  for delete using (auth.uid() = user_id);

-- comment_likes: todo autenticado lê; cada um curte/descurte por si mesmo
-- (sem update — like é só insert/delete).
create policy "comment_likes_select_authenticated" on public.comment_likes
  for select using (auth.uid() is not null);

create policy "comment_likes_own_insert" on public.comment_likes
  for insert with check (auth.uid() = user_id);

create policy "comment_likes_own_delete" on public.comment_likes
  for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════════
-- Grants — PostgREST só expõe o que tiver GRANT explícito para a role.
-- ════════════════════════════════════════════════════════════════════════

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.users,
  public.reading_packages,
  public.reading_plan_days,
  public.reading_progress,
  public.bookmarks,
  public.comments,
  public.comment_likes
to authenticated;

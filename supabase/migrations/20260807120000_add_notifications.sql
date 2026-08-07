-- Notificações in-app de comentário/resposta/like (issue #23) + rastro de
-- última visita a /family, pra saber o que é novo desde então.

alter table public.users
  add column family_feed_seen_at timestamptz;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id) on delete cascade,
  actor_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('comment_reply', 'comment_on_thread', 'comment_like')),
  comment_id uuid not null references public.comments (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Contagem de não lidas é a query mais frequente (badge na navegação, toda
-- página) — índice cobre exatamente o filtro (recipient_id, read_at is null).
create index notifications_recipient_unread_idx on public.notifications (recipient_id, read_at);

-- ════════════════════════════════════════════════════════════════════════
-- Triggers — usuário nunca insere notificação diretamente (sem policy de
-- insert pra authenticated); tudo nasce daqui, security definer.
-- ════════════════════════════════════════════════════════════════════════

-- Dispara em todo novo comentário (raiz ou resposta):
--  1) resposta direta a um comentário -> notifica o autor do comentário pai (comment_reply).
--  2) qualquer comentário num verso onde outras pessoas já comentaram -> notifica
--     esses outros participantes da conversa do verso (comment_on_thread), exceto
--     o autor do próprio comentário e o autor do pai (que já recebeu comment_reply
--     acima — evita notificar a mesma pessoa duas vezes pelo mesmo evento).
-- Mesma regra de "conversa" usada no Leitor (ReaderData.commentsByVerse): agrupa
-- por book/chapter/verse, sem filtrar bible_version (comentário é sobre a
-- referência, não sobre o texto de uma tradução específica).
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author uuid;
begin
  if new.parent_id is not null then
    select user_id into parent_author from public.comments where id = new.parent_id;
    if parent_author is not null and parent_author <> new.user_id then
      insert into public.notifications (recipient_id, actor_id, type, comment_id)
      values (parent_author, new.user_id, 'comment_reply', new.id);
    end if;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, comment_id)
  select distinct c.user_id, new.user_id, 'comment_on_thread', new.id
  from public.comments c
  where c.book = new.book
    and c.chapter = new.chapter
    and c.verse = new.verse
    and c.id <> new.id
    and c.user_id <> new.user_id
    and c.user_id is distinct from parent_author;

  return new;
end;
$$;

create trigger notify_on_comment_trigger
  after insert on public.comments
  for each row execute function public.notify_on_comment();

-- Curtir um comentário notifica o autor dele (comment_like) — nunca a si mesmo.
create or replace function public.notify_on_comment_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  comment_author uuid;
begin
  select user_id into comment_author from public.comments where id = new.comment_id;
  if comment_author is not null and comment_author <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, comment_id)
    values (comment_author, new.user_id, 'comment_like', new.comment_id);
  end if;
  return new;
end;
$$;

create trigger notify_on_comment_like_trigger
  after insert on public.comment_likes
  for each row execute function public.notify_on_comment_like();

-- ════════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════════

alter table public.notifications enable row level security;

-- Só o destinatário vê/marca como lida a própria notificação; sem policy de
-- insert/delete pro usuário — só os triggers acima (security definer) criam.
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = recipient_id);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- Admin também pode remover likes de qualquer membro da família, mesma
-- extensão já dada a bookmarks/comments em 20260719160000.
create policy "comment_likes_admin_delete" on public.comment_likes
  for delete using (public.is_admin());

grant select, insert, update, delete on public.notifications to authenticated;

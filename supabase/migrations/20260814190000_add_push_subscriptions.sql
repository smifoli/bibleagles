-- Notificações push de verdade no aparelho (iPhone via Web Push do Safari,
-- instalado na Tela de Início — só funciona em standalone; Android/desktop
-- funcionam em qualquer navegador com Push API). Uma linha por combinação de
-- usuário + aparelho/navegador: o mesmo usuário pode ter várias inscrições
-- (celular, notebook, etc), cada uma com seu próprio endpoint do push service.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Busca mais comum: "todas as inscrições de um usuário" (send-push Edge
-- Function, disparada a cada notificação nova).
create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Cada usuário só vê/gerencia as próprias inscrições — cria a sua ao ativar
-- notificações no aparelho, remove ao desativar ou quando o navegador avisa
-- que o endpoint expirou.
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;

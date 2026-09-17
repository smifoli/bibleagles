-- Aviso livre do admin pra família inteira ("Nova atualização, leia!") — mesmo
-- pipeline de push das notificações existentes (o trigger abaixo já dispara a
-- Edge Function pra qualquer tipo novo em public.notifications), só faltava um
-- tipo que carregasse texto livre em vez de apontar pra um comment_id ou
-- book/chapter. Sem UI de admin ainda (pedido pontual) — quem dispara hoje é
-- um insert direto (script/console), coberto pela policy abaixo.

alter table public.notifications add column message text;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('comment_reply', 'comment_on_thread', 'comment_like', 'comment_on_read_chapter', 'comment_on_any_chapter', 'chapter_read', 'announcement'));

-- Reescreve o payload check (20260815010000) pra três formatos em vez de
-- dois: chapter_read (book+chapter), announcement (message), e o resto
-- (comment_id).
alter table public.notifications drop constraint notifications_payload_check;
alter table public.notifications
  add constraint notifications_payload_check
  check (
    (type = 'chapter_read' and comment_id is null and book is not null and chapter is not null and message is null)
    or (type = 'announcement' and comment_id is null and book is null and chapter is null and message is not null)
    or (type not in ('chapter_read', 'announcement') and comment_id is not null and book is null and chapter is null and message is null)
  );

-- Único tipo que o usuário (autenticado como admin) insere direto — todos os
-- outros só nascem via trigger security definer (ver 20260807120000). Uma
-- linha por destinatário, sempre em nome de quem está logado.
create policy "notifications_admin_insert_announcement" on public.notifications
  for insert
  with check (public.is_admin() and type = 'announcement' and actor_id = auth.uid());

-- Webhook de push passa a levar message também — pro tipo announcement a
-- Edge Function não tem comment_id nem book/chapter de onde tirar o corpo.
create or replace function public.notify_push_on_new_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  service_role_key text;
begin
  select decrypted_secret into service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if service_role_key is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://xfhqezcybochqlxwhnrs.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'notification_id', new.id,
      'recipient_id', new.recipient_id,
      'actor_id', new.actor_id,
      'type', new.type,
      'comment_id', new.comment_id,
      'book', new.book,
      'chapter', new.chapter,
      'message', new.message
    )
  );

  return new;
end;
$$;

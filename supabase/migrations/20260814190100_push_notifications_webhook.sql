-- Dispara um push de verdade (Web Push, chega no aparelho mesmo com o app
-- fechado) toda vez que uma linha nasce em public.notifications. Postgres não
-- faz requisição HTTP sozinho — pg_net (net.http_post) manda a chamada, de
-- forma assíncrona, pra Edge Function send-push (supabase/functions/send-push),
-- que decide quais inscrições (push_subscriptions) do destinatário existem e
-- envia o Web Push de fato.
--
-- A service_role_key usada no header Authorization NUNCA fica hardcoded aqui
-- (arquivo vai pro git) — é lida do Vault (supabase_vault), inserida à parte
-- via `supabase db query --linked` fora de qualquer migration versionada. Sem
-- o secret configurado (ex: banco local de dev que ninguém populou o Vault),
-- a função simplesmente não dispara o push — não deve quebrar o insert do
-- comentário/like que originou a notificação.

create extension if not exists pg_net;

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
      'comment_id', new.comment_id
    )
  );

  return new;
end;
$$;

create trigger notify_push_on_new_notification_trigger
  after insert on public.notifications
  for each row execute function public.notify_push_on_new_notification();

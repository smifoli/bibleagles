-- Lembrete diário de leitura (Perfil > Notificações > "Lembrete diário"): o
-- card já salvava notification_enabled/notification_time em users, mas nada
-- lia esses campos — não existia agendamento nenhum. Agora um job do pg_cron
-- roda a cada 5 minutos e chama a Edge Function send-reminder, que decide, no
-- fuso de cada usuário, quem deve ser lembrado agora (horário bateu, ainda não
-- leu o dia, ainda não foi lembrado hoje) e envia o Web Push.

-- Fuso IANA de cada usuário, persistido por TimezoneSync (antes só vivia num
-- cookie de navegador — e o cron não tem cookie de ninguém). O default cobre a
-- família hoje e some no primeiro acesso de cada um após este deploy.
alter table public.users
  add column timezone text not null default 'America/Sao_Paulo';

-- Trava de idempotência: a data LOCAL (no fuso do usuário) do último lembrete
-- enviado — sem ela, o job de 5 em 5 minutos reenviaria dentro da janela.
alter table public.users
  add column reminder_last_sent_on date;

create extension if not exists pg_cron;

-- Mesmo padrão de notify_push_on_new_notification: a service_role_key vem do
-- Vault (nunca hardcoded em migration versionada); sem o secret, vira no-op.
create or replace function public.invoke_send_reminder()
returns void
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
    return;
  end if;

  perform net.http_post(
    url := 'https://xfhqezcybochqlxwhnrs.supabase.co/functions/v1/send-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

-- cron.schedule com nome é upsert — reaplicar a migration só re-agenda. A
-- janela de 5min é espelhada em WINDOW_MINUTES na função send-reminder.
select cron.schedule('send-daily-reminder', '*/5 * * * *', 'select public.invoke_send_reminder()');

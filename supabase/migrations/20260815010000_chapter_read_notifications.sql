-- Aviso de leitura: quando alguém marca um capítulo como lido, o resto da
-- família fica sabendo ("Kevin leu Atos 11"). Opt-out por usuário
-- (users.chapter_read_notifications, ligado por padrão — o card fica em
-- Perfil > Notificações). Diferente das notificações de comentário, aqui não
-- existe comment_id: a notificação carrega (book, chapter) direto.

alter table public.users
  add column chapter_read_notifications boolean not null default true;

-- comment_id deixa de ser obrigatório; (book, chapter) entram pro novo tipo.
-- O check garante que cada tipo carrega exatamente o payload que lhe cabe.
alter table public.notifications alter column comment_id drop not null;
alter table public.notifications
  add column book text,
  add column chapter integer;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('comment_reply', 'comment_on_thread', 'comment_like', 'comment_on_read_chapter', 'comment_on_any_chapter', 'chapter_read'));

alter table public.notifications
  add constraint notifications_payload_check
  check (
    (type = 'chapter_read' and comment_id is null and book is not null and chapter is not null)
    or (type <> 'chapter_read' and comment_id is not null and book is null and chapter is null)
  );

-- Dispara em toda leitura marcada (dia de pacote ou capítulo avulso — os dois
-- formatos de reading_progress desde 20260722150000). Anti-rajada: quem marca
-- vários capítulos atrasados de uma vez gera UM aviso por destinatário (o
-- primeiro), não um por capítulo — pula quem já recebeu aviso de leitura
-- deste mesmo ator nos últimos 30 minutos.
create or replace function public.notify_on_chapter_read()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_book text;
  target_chapter int;
begin
  if new.plan_day_id is not null then
    select passages->0->>'book', (passages->0->>'chapter_start')::int
      into target_book, target_chapter
      from public.reading_plan_days
      where id = new.plan_day_id;
  else
    target_book := new.book;
    target_chapter := new.chapter;
  end if;

  if target_book is null or target_chapter is null then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, book, chapter)
  select u.id, new.user_id, 'chapter_read', target_book, target_chapter
  from public.users u
  where u.id <> new.user_id
    and u.is_deleted = false
    and u.chapter_read_notifications
    and not exists (
      select 1
      from public.notifications n
      where n.recipient_id = u.id
        and n.actor_id = new.user_id
        and n.type = 'chapter_read'
        and n.created_at > now() - interval '30 minutes'
    );

  return new;
end;
$$;

create trigger notify_on_chapter_read_trigger
  after insert on public.reading_progress
  for each row execute function public.notify_on_chapter_read();

-- O webhook de push passa a levar (book, chapter) junto — pro tipo
-- chapter_read a Edge Function não tem comment_id de onde tirar a referência.
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
      'chapter', new.chapter
    )
  );

  return new;
end;
$$;

-- Issue #24: quem já leu um capítulo (avulso ou via pacote de leitura) deve
-- ser avisado de qualquer comentário novo nele, mesmo sem nunca ter comentado
-- ali. Continuação da #23, que só cobria quem já participou da conversa do
-- mesmo versículo (comment_reply / comment_on_thread).

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('comment_reply', 'comment_on_thread', 'comment_like', 'comment_on_read_chapter'));

-- IDs de quem já leu (book, chapter), juntando os dois formatos que
-- reading_progress suporta desde 20260722150000_freeform_reading_progress.sql:
--  1) leitura avulsa: reading_progress.book/chapter direto.
--  2) leitura de pacote: reading_progress.plan_day_id -> reading_plan_days.passages
--     (jsonb array de Passage), mesma regra de passageMatches() em lib/reading-plan.ts
--     (chapter_end nulo == mesmo que chapter_start), portada pra SQL.
create or replace function public.chapter_readers(target_book text, target_chapter int)
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select rp.user_id
  from public.reading_progress rp
  where rp.book = target_book
    and rp.chapter = target_chapter

  union

  select rp.user_id
  from public.reading_progress rp
  join public.reading_plan_days rpd on rpd.id = rp.plan_day_id
  cross join lateral jsonb_array_elements(rpd.passages) as passage
  where (passage->>'book') = target_book
    and target_chapter >= (passage->>'chapter_start')::int
    and target_chapter <= coalesce((passage->>'chapter_end')::int, (passage->>'chapter_start')::int)
$$;

-- Estende o trigger de novo comentário (20260807120000_add_notifications.sql) com
-- a terceira regra: notifica todo leitor do capítulo (chapter_readers) que
-- ainda não foi coberto por comment_reply (autor do pai) nem comment_on_thread
-- (quem já comentou nesse mesmo versículo) — sem duplicar notificação do
-- mesmo evento, e nunca notificando o autor do próprio comentário.
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

  insert into public.notifications (recipient_id, actor_id, type, comment_id)
  select distinct reader_id, new.user_id, 'comment_on_read_chapter', new.id
  from public.chapter_readers(new.book, new.chapter) as reader_id
  where reader_id <> new.user_id
    and reader_id is distinct from parent_author
    and not exists (
      select 1
      from public.comments c
      where c.book = new.book
        and c.chapter = new.chapter
        and c.verse = new.verse
        and c.id <> new.id
        and c.user_id = reader_id
    );

  return new;
end;
$$;

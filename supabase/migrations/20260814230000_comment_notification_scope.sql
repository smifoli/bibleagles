-- Preferência por usuário pro alcance das notificações de comentários novos:
--   'read_chapters' (padrão) — só comentários em capítulos que a pessoa já leu
--                              (comportamento que já existia, agora opcional);
--   'all'                    — qualquer comentário novo, tenha lido ou não.
-- Respostas, conversas do mesmo versículo e curtidas não passam por aqui —
-- são sempre sobre um comentário SEU, então continuam notificando sempre.

alter table public.users
  add column comment_notification_scope text not null default 'read_chapters'
  check (comment_notification_scope in ('read_chapters', 'all'));

-- Novo tipo pro caso "escopo all e não leu o capítulo" — precisa ser distinto de
-- comment_on_read_chapter porque o texto exibido ("...que você já leu") mentiria.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('comment_reply', 'comment_on_thread', 'comment_like', 'comment_on_read_chapter', 'comment_on_any_chapter'));

-- Mesma estrutura de 20260807180000_notify_chapter_readers.sql, com a terceira
-- regra trocada: em vez de notificar só chapter_readers, notifica cada usuário
-- conforme o próprio comment_notification_scope — leitor do capítulo ganha
-- comment_on_read_chapter; quem optou por 'all' e não leu ganha
-- comment_on_any_chapter. Continua sem duplicar quem já foi coberto por
-- comment_reply/comment_on_thread e sem notificar o próprio autor.
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
  select u.id,
         new.user_id,
         case when r.reader_id is not null then 'comment_on_read_chapter' else 'comment_on_any_chapter' end,
         new.id
  from public.users u
  left join (
    select distinct reader_id from public.chapter_readers(new.book, new.chapter) as reader_id
  ) r on r.reader_id = u.id
  where u.id <> new.user_id
    and u.is_deleted = false
    and u.id is distinct from parent_author
    and (r.reader_id is not null or u.comment_notification_scope = 'all')
    and not exists (
      select 1
      from public.comments c
      where c.book = new.book
        and c.chapter = new.chapter
        and c.verse = new.verse
        and c.id <> new.id
        and c.user_id = u.id
    );

  return new;
end;
$$;

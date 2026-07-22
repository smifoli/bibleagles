-- Permite marcar como lido qualquer capítulo, não só os que fazem parte de
-- algum dia de plano. Antes, reading_progress só sabia representar "completei
-- o dia X do pacote Y" (plan_day_id not null); agora uma linha também pode
-- representar "li Gênesis 3", sem pacote nenhum envolvido, via (book, chapter).
--
-- As duas formas são mutuamente exclusivas por linha (reading_progress_target_check):
-- plan_day_id OU (book, chapter), nunca os dois nem nenhum. Estatísticas de
-- pacote (lib/package-stats-data.ts) continuam filtrando só por plan_day_id,
-- então leituras livres nunca inflam o progresso de um pacote.

alter table public.reading_progress
  alter column plan_day_id drop not null,
  add column book text,
  add column chapter integer;

alter table public.reading_progress
  add constraint reading_progress_target_check check (
    (plan_day_id is not null and book is null and chapter is null)
    or (plan_day_id is null and book is not null and chapter is not null and chapter > 0)
  );

-- Evita marcar o mesmo capítulo como lido duas vezes fora de um plano. NULLs
-- em (book, chapter) — o caso das linhas ligadas a plan_day_id — não colidem
-- entre si no Postgres, então isso não interfere nas linhas de plano.
alter table public.reading_progress
  add constraint reading_progress_book_chapter_unique unique (user_id, book, chapter);

-- Preferência de tamanho de fonte do app (issue "meu pai não consegue ler
-- direito") + soft-delete de usuário: ao remover um membro, o admin escolhe
-- entre apagar o conteúdo dele também ou preservá-lo (nesse caso o nome
-- segue aparecendo com "(deletado)" ao lado — a linha em public.users não é
-- removida, só marcada, pra não perder o autor de comentários/destaques
-- antigos). Admin também passa a poder remover comentários/destaques de
-- qualquer membro da família, não só os próprios.

alter table public.users
  add column font_size text not null default 'normal' check (font_size in ('normal', 'large', 'xlarge')),
  add column is_deleted boolean not null default false;

create policy "bookmarks_admin_delete" on public.bookmarks
  for delete using (public.is_admin());

create policy "comments_admin_delete" on public.comments
  for delete using (public.is_admin());

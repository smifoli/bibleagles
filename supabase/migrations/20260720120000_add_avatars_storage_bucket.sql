-- Bucket de Storage pra foto de perfil (upload manual, substitui a bolinha
-- com a inicial nos comentários/destaques quando o usuário tiver uma).
-- `avatar_url` na tabela users já existe desde o schema inicial (hoje só é
-- preenchido via OAuth) — esse bucket é o primeiro upload de arquivo do app.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Fotos são públicas pra leitura (aparecem pra toda a família em
-- comentários/destaques), mas só o dono pode escrever no próprio caminho
-- (`{user_id}/...`).
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

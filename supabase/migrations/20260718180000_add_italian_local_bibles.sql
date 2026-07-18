-- Suporte a italiano + troca do default de preferred_version: os textos bíblicos
-- passaram a ser baixados uma vez (npm run bible:download) e empacotados como JSON
-- estático no app em vez de chamados ao vivo via API.Bible. Apenas versões de
-- domínio público / licença livre são empacotadas, então NVT (comercial) sai do
-- catálogo e do default.

alter table public.users
  drop constraint users_preferred_language_check;

alter table public.users
  add constraint users_preferred_language_check check (preferred_language in ('pt', 'en', 'es', 'de', 'it'));

alter table public.users
  alter column preferred_version set default 'BLT';

-- Novo status 'finished' pra pacote de leitura: distinto de 'archived' (arquivar é
-- "esconder/desistir do pacote"), finalizar é "o plano acabou de verdade". Os dois têm
-- o mesmo efeito prático na home (pacote não-'active' não aparece mais como pendente),
-- mas o admin agora tem os dois botões, além de poder reabrir (voltar pra 'active')
-- tanto um pacote arquivado quanto um finalizado.

alter table public.reading_packages
  drop constraint reading_packages_status_check;

alter table public.reading_packages
  add constraint reading_packages_status_check check (status in ('draft', 'active', 'finished', 'archived'));

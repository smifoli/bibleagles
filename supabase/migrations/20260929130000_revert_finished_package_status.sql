-- Reverte a migration anterior (20260929120000): 'finished' não vira mais um status
-- que o admin seta manualmente em reading_packages. Se um plano foi 100% lido ou não
-- é calculado por usuário, na hora de montar a home (lib/home-data.ts) — não é um
-- estado global do pacote. O admin só arquiva (ou deleta) um pacote ativo.

-- Algum pacote pode ter ficado com status='finished' enquanto o botão "Finalizar"
-- esteve no ar (curta janela entre as duas migrations) — volta pra 'active' antes
-- de reapertar o constraint, senão a alteração abaixo falha.
update public.reading_packages set status = 'active' where status = 'finished';

alter table public.reading_packages
  drop constraint reading_packages_status_check;

alter table public.reading_packages
  add constraint reading_packages_status_check check (status in ('draft', 'active', 'archived'));

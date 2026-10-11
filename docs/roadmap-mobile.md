# Roadmap — BiblEagles Mobile

**Status:** Aprovado (2026-10-10)
**Base:** `docs/requirements-mobile.md` (RF/RNF) e `docs/architecture-mobile.md` (D-*)

## Princípios

- **Cada etapa entrega algo que funciona** no iPhone, mesmo que pequeno.
- **O mais arriscado primeiro:** a sincronização offline é provada cedo (etapa 3).
- **Do simples ao complexo:** destaques antes de comentários; grupos antes de visibilidade.
- **Passos revisáveis:** Claude escreve o código em passos pequenos; Lucas revisa cada um antes do próximo.

## Decisões

- Ordem das etapas aprovada.
- Código num **repositório novo** (ex.: `bibleagles-mobile`), separado do PWA — inclui as
  migrations do Supabase e as Edge Functions novas.
- **Conta Apple Developer (US$99/ano)** o mais tarde possível: até lá, o app roda no iPhone com
  Apple ID grátis (precisa reinstalar a cada poucos dias). Pagar quando isso atrapalhar demais,
  ou no máximo antes do TestFlight (etapa 11).

---

## Etapa 0 — Preparação ✅ (2026-10-10)

- Repositório novo para o app.
- Projeto Expo (React Native + TypeScript) rodando no iPhone.
- Projeto Supabase novo, na UE (D-MIG-04).
- **Entrega:** um app "olá" abrindo no seu iPhone.

## Etapa 1 — Bíblia offline ✅ (2026-10-10)

- Texto bíblico embutido no app (reaproveitando `data/bibles`).
- Navegação Testamento → Livro → Capítulo, busca por referência.
- Leitor: capítulo anterior/próximo, gesto de deslizar, tamanho e tipo de letra, último lido.
- Navegação nativa, modo escuro (RNF-UX).
- **Entrega:** ler a Bíblia inteira sem internet. Sem login, sem servidor.
- Requisitos: RF-VER, RF-NAV, RF-LEI-01 a 08, RNF-OFF-01.

## Etapa 2 — Login ✅ (2026-10-10)

- Supabase Auth com e-mail e senha.
- Perfil básico (nome, foto, idioma, versão preferida).
- **Entrega:** criar conta, entrar, sair.
- Requisitos: RF-CON-01 a 04, RF-PER.
- Pendente: confirmação de e-mail e "esqueci a senha" (exigem SMTP próprio).

## Etapa 3 — Fundação da sincronização ✅ (2026-10-11)

- PowerSync + SQLite no aparelho.
- Schema mínimo no servidor: Usuário, Grupo, Membro do grupo, com colunas de sincronização.
- Primeiras regras de sincronização (cada um recebe só os seus grupos).
- Testar: criar offline, sincronizar, ver em outro aparelho.
- **Entrega:** um dado criado offline num iPhone aparece no outro.
- Decisões: D-DAD-01 a 08, D-SYN-01, D-SYN-02, D-TEC-04.
- Testado: grupo criado no iPhone em modo avião apareceu no simulador após reconectar.

## Etapa 4 — Destaques e leitura pessoal ✅ (2026-10-11)

- Destacar versículos (4 cores), marcar capítulo como lido, percentual lido.
- Tudo offline, sincronizando.
- **Entrega:** primeira funcionalidade "de verdade" sincronizada.
- Requisitos: RF-LEI-10 a 14, RF-LEI-20 a 22, RF-DST, RF-HIS.
- Feito: destaques com seleção de vários versículos (privados), marcar capítulo e livro
  inteiro como lido (RF-NAV-05), percentual (Bíblia, testamento, livro, grade), histórico.
  Design definido no caminho (`design-mobile.md`, D-VIS-01 a 12).
- Movido: RF-LEI-12 a 14 (dependem de planos) → etapa 7. RF-DST-01 a 03 (visibilidade) e
  RF-DST-10 a 14 (telas de destaques e comentários, inclusive "Meus destaques") → etapa 6.

## Etapa 5 — Grupos

- Criar grupo (aberto/fechado), buscar, entrar, pedir para entrar, aprovar.
- Convites por link/código. Papéis (dono, admin, membro), transferir, sair do grupo.
- Mudanças de acesso sincronizando (entrar baixa tudo; sair limpa).
- **Entrega:** a família vira um grupo de teste.
- Requisitos: RF-GRP, seção 2. Decisões: D-SYN-03 a 06.
- **Status (2026-10-11):** tudo feito e testado no iPhone e no simulador: criar, editar
  (nome, tipo, descrição), apagar, busca com detalhes, pedir/aprovar, papéis, transferir, sair,
  convites por código, link e QR code (a tela do convite fecha sozinha quando alguém o usa).
  O PowerSync passou a usar WebSocket (o streaming HTTP caía no iOS). Falta a entrega: a família
  entrar, que depende do SMTP próprio (confirmação de e-mail e "esqueci a senha").
- Ficou para as etapas 6 e 7: RF-GRP-12 (manter ou apagar o conteúdo ao sair) e limpar
  comentários, destaques e planos ao apagar um grupo.

## Etapa 6 — Comentários e visibilidade

- Comentar, responder, editar, apagar ("comentário removido"), curtir.
- Seleção de grupos (padrões, configurações), filtro do olho, resumo do capítulo.
- Visibilidade também nos destaques.
- Recusas e aceitação parcial com aviso claro.
- **Entrega:** o coração do app funcionando.
- Telas de destaques e comentários: por versículo, na página do grupo e "Meus destaques".
- Requisitos: RF-COM, RF-DST-01 a 03, RF-DST-10 a 14, RF-LEI-23/24/30 a 32/40. Decisões: D-SYN-07 a 09.
- **Status (2026-10-11):** partes 1 a 3 feitas e testadas no iPhone: destaques visíveis nos
  grupos (na cor de quem destacou), comentários (responder, editar, apagar/removido, curtir,
  trechos de versículos), filtro do olho por grupo e "meus comentários", resumo do capítulo.
  Parte 4 feita: "Destaques e comentários" na página do grupo e "Meus destaques" na aba Você
  (RF-DST-10 a 14), um item por versículo com o texto, filtros por livro (e grupo/cor nos meus).
  Parte 5 feita: padrão de visibilidade na aba Você (RF-COM-03, vale também para destaques),
  admin remove comentário só do grupo dele com as respostas ficando (RF-LEI-40), e aviso claro
  de toda mudança recusada pelo servidor (D-SYN-08).
  Depois, polimento pedido pelo Lucas (D-VIS-13 a 15): topo do leitor, folha de comentários,
  segurar para comentar e troca de capítulo pelo dedo numa faixa de três páginas. Testado no
  iPhone. Próxima: etapa 7.

## Etapa 7 — Planos

- Criar plano de grupo e pessoal (automático e manual), com ou sem datas.
- Progresso por capítulo, diálogo "marcar como lido onde?", atrasos.
- Home com leituras pendentes; estatísticas do plano; histórico.
- **Entrega:** a família consegue seguir um plano juntos.
- Requisitos: RF-PLN, RF-HOME-10 a 13, RF-EST, RF-HIS, RF-LEI-12 a 14.

## Etapa 8 — Notificações

- Home como caixa de entrada, agrupada por grupo; histórico.
- Push (Expo Push), níveis por grupo, lembrete diário, avisos do admin.
- Canal em tempo real (app aberto).
- **Entrega:** a família é avisada do que acontece.
- Requisitos: RF-NOT, RF-HOME-01 a 05. Decisões: D-SYN-10/11, D-TEC-07.

## Etapa 9 — Conta completa, moderação e idiomas

- Login com Apple e Google; excluir conta; exportar dados.
- Bloquear usuário, denunciar comentário, remover membro.
- Interface em inglês.
- **Entrega:** pronto para as regras da App Store.
- Requisitos: RF-CON-02/05, RNF-MOD, RNF-PRI, RNF-I18N, RF-MEM.

## Etapa 10 — Assinatura

- RevenueCat, produtos (individual, faixas de grupo), teste grátis.
- Verificação no servidor, modo somente leitura, isenção da família.
- **Entrega:** dá para cobrar.
- Requisitos: RF-ASS. Decisões: D-ASS.

## Etapa 11 — Polimento e lançamento

- Sentry, PostHog, acessibilidade (VoiceOver, Dynamic Type), desempenho.
- Política de privacidade e termos; decisão sobre a NVI.
- Beta com a família via TestFlight; envio para revisão da App Store.
- **Entrega:** app na App Store.

## Etapa 12 — Migração da família

- Script de migração testado numa cópia; conferência por contagem.
- Dia da virada; PWA passa a mostrar "baixe o app".
- **Entrega:** a família inteira no app, sem perder nada.
- Decisões: D-MIG.

## Etapa 13 — Android

- Ajustes de plataforma, Google Play Billing, publicação na Play Store.

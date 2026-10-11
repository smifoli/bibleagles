# Design — BiblEagles Mobile

**Status:** Aprovado (2026-10-11)
**Base:** `docs/requirements-mobile.md` (RF/RNF), `docs/architecture-mobile.md` (D-*) e o design
do PWA (`design/index.html`).

Decisões visuais do app. Cada uma tem um ID (D-VIS-*) para citar no código e nos commits.

## 1. Identidade

- **D-VIS-01** **Híbrido:** estrutura nativa do iOS, identidade do PWA onde ela importa.
  - **Nativo:** barra de abas, sheets, SF Symbols, fonte do sistema (SF) na interface,
    Dynamic Type, modo escuro automático, haptics.
  - **Do PWA:** o **leitor** em papel creme com o texto bíblico em *Spectral* (serifada), as
    **4 cores de destaque**, o **marrom** como cor de destaque (botões, links, ícone ativo) e o
    logo da águia.
  - **Modo escuro:** o papel vira marrom bem escuro; os destaques têm versões próprias para
    esse fundo.
  - **Por quê:** o app parece e se comporta como iOS, mas o leitor — onde a família passa mais
    tempo — continua sendo "o BiblEagles". *Space Grotesk* sai da interface: ao lado dos
    componentes nativos, ela faria o app parecer um site. (Continua como opção de fonte do
    leitor, RF-LEI-05; *Spectral* é a padrão.)
- **D-VIS-12** **O papel vale para o app inteiro** (decidido depois de ver no iPhone): fundos e
  barras de título de todas as telas em creme / marrom escuro, não no branco / preto do iOS.
  Linhas de lista e campos num tom de superfície; texto em tons de tinta. Continuam do sistema
  só o vermelho de erro e o efeito de "pressionado".
- **D-VIS-02** **Margens menores que as do PWA** (que usa 18 px nas laterais e 14 px dentro do
  versículo destacado). Ajustado no iPhone: texto a 18 pt da borda esquerda; à direita, 8 pt de
  margem + 10 de respiro.

## 2. Navegação

- **D-VIS-03** **4 abas nativas** (barra de abas do sistema):

  | Aba | Conteúdo | Requisitos |
  |---|---|---|
  | **Início** | Leituras pendentes de todos os planos, cards por plano, atividade dos outros (curtir/responder no card) | RF-HOME |
  | **Bíblia** | Abre no último capítulo lido; Testamento → Livro → Capítulo; busca (referência e palavra) na barra do topo; percentual por livro | RF-NAV, RF-LEI |
  | **Grupos** | Lista de grupos → página do grupo (feed, membros, planos do grupo, destaques do grupo) | RF-GPG, RF-DST-13 |
  | **Você** | Perfil, Meus destaques, histórico, percentual da Bíblia, planos pessoais, ajustes | RF-PER, RF-DST-14, RF-HIS |

  - **Sem aba de Notificações:** o Início já é a caixa de entrada (RF-HOME-01 a 05).
  - **Sem aba de Planos:** cada plano aparece onde é usado — os do dia no Início, os de grupo
    no grupo, os pessoais em Você.
  - **Busca dentro da Bíblia**, na barra do topo, não como aba.
  - **A barra de abas fica sempre à mostra**, sem encolher ao rolar (pedido do Lucas,
    2026-10-11). A barra de seleção do leitor flutua logo acima dela.

## 3. Leitor

- **D-VIS-04** **Papel:** claro `#fbf7ef` com texto `#2c2218`; escuro `#1c150e` com texto
  `#e6dac6`. O modo escuro **segue o sistema**, sem opção própria no leitor.
- **D-VIS-05** **Texto:** Spectral 20 por padrão, ajustável de 14 a 32 (A−/A+, RF-LEI-05);
  entrelinha 1,55.
- **D-VIS-06** **Um bloco por versículo** (cada um começa numa linha), como no PWA.
  - **Por quê:** toque e destaque precisos, e é o que a família conhece. Texto corrido é mais
    bonito, mas um versículo destacado no meio do parágrafo fica difícil de ver e de tocar.
- **D-VIS-07** **Número do versículo** pequeno, semibold, cor areia (`#a3927d`), no início do bloco.
- **D-VIS-08** **Destaque:** o bloco inteiro na cor, **encostado na borda esquerda** (sem raio
  desse lado) e com raio de 20 pt à direita, a 8 pt da borda direita. Destaques seguidos **da
  mesma cor** formam um bloco só (sem fresta e sem raio onde se encontram); de cores
  diferentes ficam separados, cada um com os seus cantos e 3 pt de fresta. Meu destaque
  na minha cor; destacado só por outros na cor de quem destacou, com as iniciais no selo do
  versículo (RF-LEI-22; antes era areia neutra, mudado a pedido do Lucas em 2026-10-11).
  Blocos só se juntam com a mesma cor e a mesma pessoa. No escuro, versões mais
  fechadas das 4 cores.
  - Escolhido no iPhone, comparando 4 estilos (arredondado com margem, ponta a ponta, encostado
    à esquerda, ponta a ponta com faixa). Raio: 20 pt; com 24, versículos de uma linha ficariam
    com a ponta em pílula (o raio passa da metade da altura do bloco).
- **Contexto do plano** (RF-LEI-13) numa linha abaixo do título, só quando a leitura vem de um
  plano: "Lendo Mateus · Dia 12 de 28".

## 4. Interações

- **D-VIS-09** **Seleção de versículos** (RF-LEI-20/21): tocar num versículo o **seleciona**
  (contorno sutil; selecionados seguidos formam um contorno só) e uma **barra pequena** aparece
  logo abaixo do título, por cima do texto, com "N versículos", as 4 cores e ✕. Tocar em outros versículos soma à seleção; tocar de novo tira. Escolher uma cor
  destaca todos de uma vez, com vibração leve, e fecha a barra. A cor marcada (✓) é a que todos
  os selecionados já têm; tocar nela remove o destaque deles. Quando algum selecionado tem cor,
  aparece também um botão **remover** (borracha), mais claro para quem não conhece o atalho.
  O contorno é desenhado **por cima**, um por grupo de selecionados seguidos, arredondado nas
  pontas e sem fresta: o fundo dos destaques não muda. Trocar de capítulo cancela.
  - **Por quê:** destacar uma passagem inteira de uma vez, sem um painel cobrindo o texto a
    cada versículo. Substitui a sheet de um versículo só (decidido no iPhone).
  - **Comentar** continua sendo de um versículo (RF-VER-04): entra na barra quando a seleção
    tiver um só (etapa 6), assim como "quem destacou".
- **D-VIS-10** **Marcar como lido** (RF-LEI-10/12): botão grande **no fim do capítulo**, acima de
  anterior/próximo. "✓ Marcar como lido" → depois "Lido em 11 de out." (tocar desmarca).
  Vibração de sucesso. Com plano ativo contendo o capítulo (etapa 7), abre uma sheet de "onde
  marcar", tudo pré-selecionado; sem plano, marca direto.
  - **Por quê só no fim:** quem leu chega ao fim; a barra do topo já tem voltar, título e a
    engrenagem.
- **D-VIS-11** **Percentual lido e aba Bíblia** (RF-NAV-03/04), no visual do PWA (pedido do
  Lucas): no topo, "Você leu X% da Bíblia" com barras verdes de AT e NT; livros **agrupados nas
  seções do PWA** (Pentateuco, Históricos, Poéticos, Profetas, Evangelhos, Cartas…), em **cards
  de 2 colunas** cujo fundo se enche de verde na proporção do lido, com ✓ quando termina,
  "N capítulos" e "N destaques". Na grade de capítulos, ✓ verde pequeno no canto do lido. Na
  busca, os livros voltam a ser linhas de lista. O mesmo número na aba Você, junto do histórico.
- **D-VIS-13** **Olho e engrenagem no topo do leitor** (pedido do Lucas, 2026-10-11): a
  engrenagem abre "Ajustes de leitura" (tamanho e tipo de letra, versão) e substitui "Aa" e a
  sigla da versão. O olho fica ao lado, à vista, porque muda o que aparece no capítulo (riscado
  quando esconde algo); abre só o filtro de grupos, assim como o aviso "grupos escondidos".
- **D-VIS-14** **Folha de comentários** (pedido do Lucas, 2026-10-11): o texto do versículo (ou
  trecho) logo abaixo do título, na fonte do leitor; comentários em 18 pt (respostas 17), nome e
  hora em 14. Onde aparece: uma linha "Visível em: …" acima do campo, que abre ali mesmo a lista
  de grupos com ✓ e "Privado (só você)"; numa resposta, a linha só informa. Segurar o dedo num
  versículo abre direto para comentar (o toque continua selecionando).

## 5. Tokens

Ponto de partida, a ajustar no iPhone. Valem para o app inteiro (D-VIS-12); no código, em
`src/theme/colors.ts`.

| Token | Claro | Escuro |
|---|---|---|
| `paper` (fundo das telas e barras) | `#fbf7ef` | `#1c150e` |
| `surface` (linhas de lista, campos) | `#f4ede1` | `#2a2118` |
| `ink` (texto principal e bíblico) | `#2c2218` | `#e6dac6` |
| `inkSecondary` | `#7d6c58` | `#a3927d` |
| `inkTertiary` (apoio, placeholder) | `#a3927d` | `#7d6c58` |
| `separator` | `#e6dac6` | `#3a3023` |
| `verseNumber` | `#a3927d` | `#a3927d` |
| `accent` (botões, links, aba ativa) | `#52442f` | `#d9cbb5` |
| `onAccent` (texto sobre `accent`) | `#fbf7ef` | `#1c150e` |
| `read` (✓ e barras de "lido") | `#5c8a52` | `#86ad7b` |
| `readFill` (fundo verde dos livros) | `rgba(92,138,82,.22)` | `rgba(134,173,123,.22)` |

Destaques (fundo / texto / número; no escuro, também a bolinha das listas):

| Cor | Claro | Escuro |
|---|---|---|
| Amarelo | `#f1e6a0` / `#3a2f17` / `#9a883e` | `#6a5a1c` / `#f6edc0` / `#d4c070` / `#d9c25a` |
| Verde | `#bcd0b3` / `#2f3a26` / `#5e7350` | `#3d5a32` / `#e0ecd8` / `#a8c49a` / `#8fb57f` |
| Rosa | `#e6b3a6` / `#4a2820` / `#8a5a4d` | `#6d3a2d` / `#f5d8cf` / `#dba08f` / `#d48a74` |
| Azul | `#b3c4d6` / `#1f2c38` / `#4f6478` | `#2f4d6b` / `#d8e4f0` / `#a0bad4` / `#7fa3c9` |
| Areia (só de outros) | `#ece0cf` / `#4a3f2c` / `#a3927d` | `#3a3023` / `#e6dac6` / `#a3927d` |

No escuro, os primeiros tons ficaram apagados no iPhone (2026-10-11): os fundos ficaram mais
vivos, com o texto acima de 5,8:1, e a bolinha das listas ganhou um tom próprio, mais claro.

Tipografia e espaço:

- Interface: fonte do sistema (SF), tamanhos do Dynamic Type.
- Texto bíblico: Spectral 20 (14–32), entrelinha 1,55; número 13 semibold.
- Texto a 18 pt da borda esquerda; destaque encostado à esquerda, raio de 20 pt à direita.

## 6. Como validar

Sem protótipo separado: as decisões já são concretas, e o leitor é implementado direto no app,
com Lucas ajustando no iPhone (margens, cores do escuro, tamanhos). Mudanças voltam para este
documento.

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
- **D-VIS-02** **Margens menores que as do PWA** (que usa 18 px nas laterais e 14 px dentro do
  versículo destacado). Ponto de partida: 16 pt nas laterais, 10 pt dentro do destaque; ajustar
  no iPhone.

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

## 3. Leitor

- **D-VIS-04** **Papel:** claro `#fbf7ef` com texto `#2c2218`; escuro `#1c150e` com texto
  `#e6dac6`. O modo escuro **segue o sistema**, sem opção própria no leitor.
- **D-VIS-05** **Texto:** Spectral 20 por padrão, ajustável de 14 a 32 (A−/A+, RF-LEI-05);
  entrelinha 1,55.
- **D-VIS-06** **Um bloco por versículo** (cada um começa numa linha), como no PWA.
  - **Por quê:** toque e destaque precisos, e é o que a família conhece. Texto corrido é mais
    bonito, mas um versículo destacado no meio do parágrafo fica difícil de ver e de tocar.
- **D-VIS-07** **Número do versículo** pequeno, semibold, cor areia (`#a3927d`), no início do bloco.
- **D-VIS-08** **Destaque:** o bloco inteiro na cor, cantos de 8 pt, 10 pt de respiro
  (D-VIS-02). Meu destaque na minha cor; destacado só por outros em areia neutra (RF-LEI-22).
  No escuro, versões mais fechadas das 4 cores.
- **Contexto do plano** (RF-LEI-13) numa linha abaixo do título, só quando a leitura vem de um
  plano: "Lendo Mateus · Dia 12 de 28".

## 4. Interações

- **D-VIS-09** **Painel do versículo** (RF-LEI-20/21): tocar no versículo abre uma **sheet nativa
  pequena** (altura só do conteúdo); o versículo ganha um contorno sutil enquanto ela está
  aberta. Em cima, as 4 cores (tocar na já escolhida remove); escolher dá vibração leve e fecha
  a sheet. Comentar e "quem destacou" entram nas próximas etapas, abaixo das cores.
  - **Por quê não o toque longo:** muita gente não descobre o toque longo, e o painel vai
    crescer (comentários, respostas).
- **D-VIS-10** **Marcar como lido** (RF-LEI-10/12): botão grande **no fim do capítulo**, acima de
  anterior/próximo. "✓ Marcar como lido" → depois "Lido em 11 de out." (tocar desmarca).
  Vibração de sucesso. Com plano ativo contendo o capítulo (etapa 7), abre uma sheet de "onde
  marcar", tudo pré-selecionado; sem plano, marca direto.
  - **Por quê só no fim:** quem leu chega ao fim; a barra do topo já tem voltar, título, versão
    e "Aa".
- **D-VIS-11** **Percentual lido** (RF-NAV-03/04): no topo da aba Bíblia ("Você leu 23% da
  Bíblia", com barras de AT e NT); percentual por livro na lista; capítulos lidos preenchidos
  na grade; o mesmo número na aba Você, junto do histórico.

## 5. Tokens

Ponto de partida, a ajustar no iPhone. Fora do leitor, a interface usa as cores do sistema
(`PlatformColor`); estes tokens são o leitor e a cor de destaque.

| Token | Claro | Escuro |
|---|---|---|
| `paper` (fundo do leitor) | `#fbf7ef` | `#1c150e` |
| `ink` (texto bíblico) | `#2c2218` | `#e6dac6` |
| `verseNumber` | `#a3927d` | `#a3927d` |
| `accent` (botões, links, aba ativa) | `#52442f` | `#d9cbb5` |

Destaques (fundo / texto / número):

| Cor | Claro | Escuro |
|---|---|---|
| Amarelo | `#f1e6a0` / `#3a2f17` / `#9a883e` | `#4d4320` / `#f3e9b8` / `#b8a660` |
| Verde | `#bcd0b3` / `#2f3a26` / `#5e7350` | `#33402c` / `#dbe6d4` / `#8fa682` |
| Rosa | `#e6b3a6` / `#4a2820` / `#8a5a4d` | `#4f2e26` / `#f0d3ca` / `#b88576` |
| Azul | `#b3c4d6` / `#1f2c38` / `#4f6478` | `#2a3746` / `#d3deea` / `#8199b2` |
| Areia (só de outros) | `#ece0cf` / `#4a3f2c` / `#a3927d` | `#3a3023` / `#e6dac6` / `#a3927d` |

Tipografia e espaço:

- Interface: fonte do sistema (SF), tamanhos do Dynamic Type.
- Texto bíblico: Spectral 20 (14–32), entrelinha 1,55; número 13 semibold.
- Margem lateral 16 pt; 6 pt entre versículos; destaque com 10 pt de respiro e cantos de 8 pt.

## 6. Como validar

Sem protótipo separado: as decisões já são concretas, e o leitor é implementado direto no app,
com Lucas ajustando no iPhone (margens, cores do escuro, tamanhos). Mudanças voltam para este
documento.

# Requisitos — BiblEagles Mobile (iOS e Android)

**Status:** Requisitos da v1 fechados (2026-10-09)
**Base:** `PRD.md` (v1.2, 2026-06-15) + funcionalidades adicionadas ao PWA depois disso

> Este documento descreve **o que** o app faz, independente de tecnologia.
> A arquitetura (**como** construir) vem depois, num documento separado.

---

## 1. Visão e escopo

BiblEagles Mobile é o app nativo de leitura bíblica em grupo, para iPhone e depois Android.
Ele evolui o PWA atual: em vez de servir uma única família, serve **vários grupos**
(famílias, igrejas, amigos), cada um com seus planos de leitura, comentários e destaques.

### Decisões

| Tema | Decisão |
|---|---|
| Dados existentes | Preservados (contas, comentários, destaques, progresso). Migrar de banco e reformatar é aceitável |
| Público | Vários grupos independentes, não só uma família |
| Grupos | Qualquer usuário pode criar. Planos de leitura pertencem a um grupo |
| Tipo de grupo | **Aberto** (entra direto) ou **fechado** (entrada precisa de aprovação) |
| Offline | Ler a Bíblia e comentar sem internet; sincroniza ao reconectar |
| Home | Mostra a atividade dos outros membros, com interação |
| PWA atual | É **desligado** depois do lançamento, com um período de transição em que os dois funcionam até todos migrarem |

---

## 2. Papéis

| Papel | Escopo | Pode |
|---|---|---|
| Usuário | App | Criar conta, criar grupos, entrar em grupos, ler, comentar, destacar |
| Dono | Grupo | Quem criou o grupo. Tudo que o admin pode, mais rebaixar admins e transferir o grupo |
| Admin | Grupo | Criar e gerenciar planos, aprovar entradas (grupo fechado), promover membros a admin |
| Membro | Grupo | Ler, comentar e destacar dentro do grupo |

- Os papéis valem **por grupo**: a mesma pessoa pode ser admin num grupo e membro em outro.
- Um grupo pode ter **vários admins**. Dono e admins podem promover membros a admin.
- **Só o dono** rebaixa admins.
- O dono pode **transferir** o grupo para outro membro. Para sair do grupo, o dono
  precisa transferir antes (o grupo nunca fica sem dono).

---

## 3. Requisitos funcionais

### 3.1 Grupos

- **RF-GRP-01** Qualquer usuário pode criar um grupo.
- **RF-GRP-02** Um grupo é **aberto** ou **fechado**.
- **RF-GRP-03** Grupo fechado: a entrada só vale depois de aprovada.
- **RF-GRP-04** Os planos de leitura de grupo pertencem a um grupo.
- **RF-PLN-01** O usuário pode criar **planos pessoais**, fora de qualquer grupo, só para ele.
- **RF-GRP-05** Existe uma busca pública de grupos.
- **RF-GRP-06** Grupo aberto aparece na busca; o usuário entra direto.
- **RF-GRP-07** Grupo fechado também aparece na busca, com o botão "pedir para entrar".
  O pedido fica pendente até um admin aprovar ou recusar.
- **RF-GRP-08** Qualquer grupo pode ser acessado por convite (link ou código).
- **RF-GRP-09** Em grupo fechado, entrar por convite também passa por aprovação de um admin.
- **RF-GRP-10** Exceção: ao gerar um **link** de convite, o admin pode marcar que quem entrar
  por ele é aprovado automaticamente.
- **RF-GRP-11** Todo grupo aparece na busca. Grupos escondidos ficam fora desta versão.

- **RF-GRP-12** Ao sair de um grupo, o app pergunta se o usuário quer **manter** ou **apagar**
  seus comentários, curtidas e destaques naquele grupo, e pede confirmação da escolha.
  - **Apagar** remove só a visibilidade naquele grupo. Itens que também estão em outros grupos
    continuam lá; itens que só existiam naquele grupo são apagados.
  - Comentário apagado que tem respostas de outros vira **"comentário removido"**,
    e as respostas continuam visíveis.
  - **Manter**: o conteúdo continua, e o autor aparece como **ex-membro**.
- **RF-GRP-13** O **dono** pode apagar o grupo, com confirmação. O grupo deixa de existir para
  todos os membros (some da lista e da busca). Se o dono é o único membro, sair do grupo também
  o apaga.

### 3.2 Comentários — visibilidade

- **RF-COM-01** Ao comentar, o usuário escolhe onde o comentário fica visível:
  um ou mais grupos dos quais participa, ou **privado** (só ele vê).
- **RF-COM-02** Padrão da seleção:
  - Lendo **por um plano**: só o grupo do plano vem selecionado.
  - Lendo **livremente** ou **por um plano pessoal**: vêm selecionados **todos** os grupos
    do usuário.
  - Em qualquer caso, desmarcar um grupo é fácil (um toque) antes de enviar.
- **RF-COM-03** O usuário pode mudar esse padrão (leitura livre e plano pessoal) nas configurações:
  **todos os grupos**, **só grupos fechados**, **grupos específicos** (escolhe quais),
  **privado** ou **lembrar a última escolha**.
- **RF-COM-04** Na hora de comentar, fica **bem explícito** onde o comentário vai ficar visível
  (grupos ou privado), antes do envio.
- **RF-COM-05** Cada comentário exibe onde ele está visível.
- **RF-COM-07** O autor pode mudar a visibilidade de um comentário depois de publicado.
- **RF-COM-06** Uma resposta tem **a mesma visibilidade** do comentário que ela responde.
  Ao escrever a resposta, fica explícito onde ela vai aparecer e que isso não pode ser mudado.
  Se o autor do comentário original mudar a visibilidade, as respostas acompanham.
- **RF-COM-08** Conteúdo de usuários bloqueados não aparece para quem bloqueou.
- **RF-COM-09** Sempre que um comentário com respostas é apagado (pelo autor, por um admin,
  ao sair do grupo ou ao excluir a conta), ele vira **"comentário removido"** e as respostas
  continuam visíveis. Sem respostas, ele é apagado de vez.

### 3.3 Comentários — filtro de exibição ("olho")

- **RF-COM-10** Lendo **por um plano**: por padrão, só aparecem os comentários do grupo do plano.
- **RF-COM-11** Um botão (ícone de olho) mostra também comentários de outros grupos do usuário.
  Eles aparecem **esmaecidos**, para indicar que são de outro contexto.
- **RF-COM-12** No olho, o usuário escolhe: todos os outros grupos, ou só alguns.
- **RF-COM-13** Lendo **livremente**: o usuário pode ver os comentários de todos os grupos, ou nenhum.
- **RF-COM-14** Ao entrar num grupo novo, ele já vem ativado no filtro do olho.

### 3.4 Destaques (cores) — visibilidade

- **RF-DST-01** Destaques seguem as mesmas regras de visibilidade dos comentários:
  grupos escolhidos ou privado, mesmo padrão de seleção, mesmo filtro do olho.
- **RF-DST-02** Destacar é um toque só: o destaque usa a seleção padrão, sem perguntar.
- **RF-DST-03** Depois de criado, o usuário pode tocar no destaque e mudar os grupos.

### 3.5 Home — atividade dos outros

- **RF-HOME-01** A home mostra a atividade de outros membros (comentários, destaques etc.).
- **RF-HOME-02** Tocar no item abre o versículo no leitor, e o item some da home.
- **RF-HOME-03** Botão "limpar notificações" remove todos os itens de uma vez.
- **RF-HOME-04** Em itens de comentário, dá para **curtir** e **responder** direto no card,
  sem abrir o leitor.
- **RF-HOME-05** Curtir ou responder pelo card também faz o item sumir da home.

### 3.6 Offline

- **RF-OFF-01** Ler a Bíblia sem internet.
- **RF-OFF-02** Todas as ações de leitura e interação funcionam sem internet: comentar, editar
  e apagar comentários, responder, curtir, destacar, marcar capítulo como lido.
- **RF-OFF-03** Ações feitas offline ficam guardadas no aparelho e são sincronizadas
  automaticamente quando a conexão volta.
- **RF-OFF-04** Ações que dependem de outras pessoas ou do servidor exigem internet:
  buscar grupos, entrar em grupo, aprovar pedidos.
- **RF-OFF-05** Offline, o usuário vê os comentários e destaques dos outros que foram baixados
  na última sincronização.
- **RF-OFF-06** Regras de conflito na sincronização:
  - **Apagar vence editar**: se o item foi apagado, a edição feita offline é descartada.
  - Entre duas edições do mesmo item, vale a **mais recente**.
  - Resposta a um comentário apagado não é publicada; o usuário recebe um aviso.

### 3.7 Versões da Bíblia

- **RF-VER-01** Versões disponíveis hoje: NVI (padrão PT), BLT, ONBV (PT); WEB (padrão EN), KJV (EN).
- **RF-VER-02** Cada idioma tem uma versão padrão. Sem preferência salva, o app usa a padrão
  do idioma do usuário.
- **RF-VER-03** Trocar a versão no leitor passa a ser a nova preferência do usuário.
- **RF-VER-04** Comentários e destaques pertencem à **referência** (livro, capítulo, versículo),
  não à versão: aparecem em qualquer versão que o usuário esteja lendo.
- **RF-VER-05** O texto bíblico fica armazenado no próprio app (não depende de API externa
  para ler), o que viabiliza a leitura offline.

> Pendentes do PWA: espanhol (RVR09, VBL), italiano (DB1885) e alemão (L1912, ELO) — download incompleto.

### 3.8 Navegação pela Bíblia

- **RF-NAV-01** Navegar por Testamento (Antigo / Novo) → Livro → Capítulo.
- **RF-NAV-02** Busca por referência (ex.: "João 3:16"), abrindo o leitor no versículo.
- **RF-NAV-07** Busca por palavra no texto bíblico (ex.: "pastor"), funcionando também offline.
- **RF-NAV-03** Mostra o percentual lido de cada Testamento e de cada livro.
- **RF-NAV-04** Na grade de capítulos, cada capítulo mostra se foi lido e quantos comentários
  e destaques tem.
- **RF-NAV-05** "Marcar tudo como lido" / "desmarcar tudo" num livro inteiro, com confirmação.
- **RF-NAV-06** O app lembra o último capítulo e versículo lidos e volta para lá ao abrir a Bíblia.

### 3.9 Leitor

**Texto e leitura**

- **RF-LEI-01** Exibe o capítulo versículo a versículo, com numeração.
- **RF-LEI-02** Capítulo anterior / próximo, inclusive cruzando o limite entre livros.
- **RF-LEI-03** Gesto de deslizar para o lado troca de capítulo (sem atrapalhar a rolagem
  nem a seleção de texto).
- **RF-LEI-04** Seletor de livro e capítulo dentro do leitor, sem sair da tela.
- **RF-LEI-05** Ajuste de tamanho da letra (14 a 32) e tipo de letra (Spectral, Lora,
  Space Grotesk, Arial). A preferência acompanha a **conta** (vale em todos os aparelhos).
- **RF-LEI-06** Trocar versão, tamanho ou tipo de letra mantém o usuário no mesmo versículo.
- **RF-LEI-07** Abrir o leitor a partir de um link com versículo (busca, home, destaques)
  rola até ele e abre o painel desse versículo.
- **RF-LEI-08** "Voltar" leva para a tela de onde o usuário veio (home, plano, grade de capítulos…).

**Marcar como lido**

- **RF-LEI-10** Botão para marcar / desmarcar o capítulo como lido.
- **RF-LEI-11** O progresso da **leitura pessoal da Bíblia** (quais capítulos o usuário já leu)
  é separado do progresso dos **planos**.
- **RF-LEI-12** Ao marcar como lido, o app pergunta onde marcar: a leitura pessoal e cada plano
  ativo do usuário (de grupo ou pessoal) que contenha esse capítulo. Todos vêm pré-selecionados;
  o usuário pode desmarcar qualquer um. Se a leitura pessoal for a única opção (nenhum plano
  contém o capítulo), marca direto, sem perguntar.
- **RF-LEI-13** O leitor mostra o contexto do plano: nome, número do dia e data.
- **RF-LEI-14** O usuário marca **capítulos**, não dias. Um dia de plano com vários capítulos
  só fica concluído quando todos os capítulos dele estiverem marcados.

**Interação por versículo**

- **RF-LEI-20** Tocar num versículo abre um painel com: destacar (4 cores), comentar,
  ver comentários e respostas, ver quem destacou e com qual cor.
- **RF-LEI-21** Cores: amarelo, verde, rosa, azul. Tocar na cor já escolhida remove o destaque.
- **RF-LEI-22** Versículo destacado pelo próprio usuário aparece na cor dele; destacado só por
  outros aparece num tom neutro.
- **RF-LEI-23** Cada versículo mostra os avatares de quem interagiu (destacou ou comentou),
  uma vez por pessoa, e a quantidade de comentários.
- **RF-LEI-24** Comentários: criar, editar (marca "editado"), apagar, responder (1 nível),
  curtir. Exibe autor, avatar e data relativa.

**Visão geral do capítulo**

- **RF-LEI-30** No topo, um resumo do capítulo: total de comentários e destaques, e quem participou.
- **RF-LEI-31** Tocar numa pessoa lista os comentários e destaques dela no capítulo,
  em ordem de versículo, e permite pular até cada um.
- **RF-LEI-32** O resumo do capítulo segue o mesmo filtro de visibilidade do olho (RF-COM-10 a 14).

**Moderação**

- **RF-LEI-40** O admin de um grupo pode remover comentários de outras pessoas **só daquele grupo**.
  Se o comentário também estiver visível em outros grupos, continua lá.

### 3.10 Planos de leitura

**Estrutura**

- **RF-PLN-10** Um plano tem nome, descrição opcional e uma lista de **dias**.
- **RF-PLN-11** Cada dia tem data, título e uma ou mais **passagens**
  (livro + capítulo inicial/final, versículos opcionais).
- **RF-PLN-12** Os dias são numerados pela ordem de data ("Dia 12 de 28").
- **RF-PLN-14** Plano de grupo sempre tem datas (todos leem o mesmo trecho no mesmo dia).
- **RF-PLN-15** Plano pessoal: ao criar, o usuário escolhe **com datas** (igual ao de grupo)
  ou **só sequência** (sem calendário e sem atraso; a home mostra o próximo dia a ler).
- **RF-PLN-13** "Hoje" é calculado no fuso horário do usuário.

**Criação e edição** (admin do grupo; no plano pessoal, o próprio usuário)

- **RF-PLN-20** Criação **automática**: livro + capítulo inicial e final + capítulos por dia
  + data de início → o app gera os dias.
- **RF-PLN-21** Criação **manual**: dia a dia (data + título + passagens), para séries temáticas.
- **RF-PLN-22** Os dias gerados automaticamente podem ser ajustados manualmente depois.
- **RF-PLN-23** Qualquer dia pode ser editado ou removido, inclusive dias passados.
- **RF-PLN-24** Editar um plano **não apaga** o progresso de leitura de quem já leu.
  *(hoje o PWA perde o progresso dos dias editados — corrigir no app)*

**Status**

- **RF-PLN-30** Status: **rascunho** (só admins veem), **ativo** ou **arquivado**.
- **RF-PLN-31** Todas as mudanças de status são manuais, nunca automáticas por data.
- **RF-PLN-32** Um plano arquivado pode ser reativado.
- **RF-PLN-33** Um plano pode ser excluído de vez, com confirmação.
- **RF-PLN-34** Vários planos podem estar ativos ao mesmo tempo.
- **RF-PLN-35** "Finalizado" é **por usuário**: o plano está finalizado para mim quando li todos
  os capítulos de todos os dias (inclusive dias futuros lidos adiantado).

**Progresso e atraso**

- **RF-PLN-40** Um membro está **atrasado** se algum dia anterior a hoje não foi lido.
  Não ter lido hoje ainda não conta como atraso. Ler adiantado não compensa um dia atrasado.
  Quem entra num plano já em andamento também fica atrasado pelos dias anteriores.
- **RF-PLN-41** Percentual de cada membro = dias lidos / total de dias do plano.

### 3.11 Home — leituras

- **RF-HOME-10** Lista de leituras pendentes: todos os dias vencidos (hoje e atrasados) ainda
  não lidos, de todos os planos ativos do usuário, do mais atrasado para o de hoje.
- **RF-HOME-11** Cada item mostra plano, dia ("Dia 5 de 28"), passagem e data, e abre o leitor.
- **RF-HOME-12** Se não há nada para ler, mostra a mensagem "A mensagem ainda está no forno…".
- **RF-HOME-13** Card por plano ativo, separado em **pendentes** e **finalizados** (por mim):
  dia atual, barra de progresso e, por membro, se leu hoje, se está atrasado e o percentual.

### 3.12 Estatísticas do plano

Tela de detalhes de um plano, visível para os membros do grupo:

- **RF-EST-01** Progresso: dia atual, total de dias, percentual, dias restantes.
- **RF-EST-02** Por membro: dias lidos, percentual, atrasado ou não, plano completo ou não.
- **RF-EST-03** Total de comentários e de destaques feitos nos capítulos do plano.
- **RF-EST-04** Membro mais ativo e versículo mais comentado do plano.
- **RF-EST-06** Comentários e destaques entram nas estatísticas só se estiverem visíveis
  no grupo do plano.
- **RF-EST-05** Lista de dias: data, passagem, quem já leu, se eu li, e botão para ler.

### 3.13 Histórico de leitura

- **RF-HIS-01** Lista de todos os capítulos que o usuário já leu, do mais recente para o mais antigo,
  pela data em que leu de fato.
- **RF-HIS-02** Se o mesmo capítulo foi lido mais de uma vez, conta a primeira leitura.

### 3.14 Notificações

**Tipos de notificação (como hoje no PWA)**

| Tipo | Quando | Quem recebe |
|---|---|---|
| Resposta | Alguém responde a um comentário meu | Autor do comentário |
| Conversa | Novo comentário num versículo onde eu já comentei | Quem já comentou no versículo |
| Comentário em capítulo lido | Novo comentário num capítulo que eu já li | Leitores do capítulo |
| Comentário em qualquer capítulo | Novo comentário em qualquer lugar | Quem escolheu "todos" |
| Curtida | Alguém curte um comentário meu | Autor do comentário |
| Leitura | Alguém marca um capítulo como lido **num plano** ("Kevin leu Atos 11") | Os outros membros do grupo do plano |
| Destaque | Alguém destaca um versículo *(novo — hoje não notifica)* | Membros dos grupos onde o destaque é visível |
| Aviso | Admin envia uma mensagem livre | Membros |
| Lembrete diário | No horário escolhido, se há leitura pendente | O próprio usuário |

- **RF-NOT-01** Uma notificação nunca é enviada para quem causou o evento.
- **RF-NOT-02** O mesmo evento não gera duas notificações para a mesma pessoa
  (ex.: resposta + conversa no mesmo versículo vira uma só).
- **RF-NOT-03** Anti-rajada: quem marca vários capítulos (ou destaca vários versículos) de uma vez
  gera **um** aviso por destinatário a cada 30 minutos, não um por item.
- **RF-NOT-06** A leitura pessoal (fora de plano) não gera aviso de leitura.
- **RF-NOT-04** Cada notificação aparece dentro do app e também como **push** no aparelho.
- **RF-NOT-05** Tocar numa notificação abre o versículo / capítulo relacionado.

**Configurações (por usuário)**

- **RF-NOT-10** Comentários novos: só em capítulos que li (padrão) ou em todos.
- **RF-NOT-11** Avisos de leitura: ligado (padrão) ou desligado.
- **RF-NOT-12** Respostas, conversas e curtidas são sempre sobre algo meu e sempre notificam.
- **RF-NOT-13** Push pode ser ligado / desligado por aparelho.
- **RF-NOT-14** Cada grupo tem seu próprio nível de notificação: **tudo**, **só o que é sobre mim**
  (respostas, curtidas, conversas) ou **nada**.
- **RF-NOT-15** O nível é perguntado ao usuário no momento em que ele entra no grupo,
  e pode ser mudado depois.

**Home como caixa de entrada**

- **RF-NOT-40** A home é a caixa de entrada das notificações **não vistas**, agrupadas por grupo.
  (Substitui a "atividade recente" e a tela de notificações separadas do PWA.)
- **RF-NOT-41** Uma tela de **histórico** guarda as notificações já vistas.
- **RF-NOT-42** Um item visível em mais de um grupo aparece na seção de **cada** grupo.
  Ao ser visto ou limpo em qualquer um deles, some de todos.

**Lembrete diário**

- **RF-NOT-20** O usuário liga o lembrete e escolhe o horário, no seu fuso.
- **RF-NOT-21** Só é enviado se houver leitura pendente (hoje ou atrasada); no máximo **um por dia**,
  juntando todos os planos.
- **RF-NOT-22** O texto lista o que ler: "Hoje: Atos 11 · Em atraso: Atos 7, Atos 9"
  (até 3 atrasos, depois vira contagem).

**Avisos do admin**

- **RF-NOT-30** O admin de um grupo escreve uma mensagem livre e envia para os membros daquele grupo.

### 3.15 Conta

- **RF-CON-01** Cadastro com nome, e-mail e senha.
- **RF-CON-02** Login com **e-mail e senha**, **Apple** ou **Google**; sessão persistente.
- **RF-CON-03** Recuperação de senha por e-mail.
- **RF-CON-04** Sair (logout).
- **RF-CON-06** O app exige login ao abrir: sem conta, nenhuma tela é acessível (nem a Bíblia).
- **RF-CON-05** **Excluir a conta** de dentro do app (exigência da Apple). O usuário escolhe:
  - **apagar tudo**; ou
  - **manter os comentários sem identificação** (autor aparece como "Usuário removido").
  - Nos dois casos, comentários apagados que têm respostas viram "comentário removido".

### 3.16 Perfil e preferências

- **RF-PER-01** Foto de perfil (enviar ou remover); sem foto, mostra a inicial com uma cor.
- **RF-PER-02** Editar nome.
- **RF-PER-03** Versão da Bíblia preferida e idioma.
- **RF-PER-04** Tamanho da letra da interface (pequeno, normal, grande).
- **RF-PER-05** Configurações de notificação (ver 3.14).
- **RF-PER-06** Calendário mensal mostrando os dias em que o usuário leu algo
  (pela data em que leu de fato, não a data prevista no plano).

### 3.17 Destaques e comentários por versículo

- **RF-DST-10** Tela que lista os versículos com destaques ou comentários, um item por versículo,
  com quem destacou (e a cor) e quem comentou, do mais recente para o mais antigo.
- **RF-DST-11** Filtro por livro.
- **RF-DST-12** Tocar abre o leitor no versículo.

- **RF-DST-13** Dentro da página de um grupo, a tela mostra **só** os destaques e comentários
  visíveis naquele grupo (sem o filtro do olho).

- **RF-DST-14** Existe também uma tela geral, **"Meus destaques"**, fora de grupo: tudo que o
  próprio usuário destacou e comentou, em todos os grupos e no privado. Filtros por grupo,
  cor e livro.

### 3.18 Gestão de membros (admin do grupo)

- **RF-MEM-01** Lista de membros do grupo, com papel.
- **RF-MEM-02** Promover / rebaixar admins (ver seção 2).
- **RF-MEM-03** O admin pode remover um membro do grupo e decide se o conteúdo dele **naquele grupo**
  fica (autor marcado como removido) ou é apagado. Conteúdo visível em outros grupos não é afetado.

### 3.19 Página do grupo

- **RF-GPG-01** Cada grupo tem uma página com nome, tipo (aberto/fechado), membros e planos.
- **RF-GPG-02** Feed com toda a atividade do grupo em ordem cronológica (comentários, destaques,
  curtidas, leituras), incluindo o que o usuário já viu na home.
  (Substitui a tela "Família" do PWA.)

### 3.20 Assinatura

- **RF-ASS-01** O uso do app exige **assinatura ativa**, com um **período de teste** grátis.
- **RF-ASS-02** Dois tipos de assinatura:
  - **Individual:** cobre só quem assinou.
  - **De grupo:** paga pelo dono do grupo, cobre todos os membros daquele grupo.
- **RF-ASS-03** Um usuário tem acesso se tiver assinatura individual **ou** for membro de algum
  grupo com assinatura de grupo ativa.
- **RF-ASS-04** Os usuários atuais do PWA (a família) são **isentos para sempre**.
- **RF-ASS-05** Compra pelas lojas (In-App Purchase da Apple / Google Play Billing).
- **RF-ASS-06** A verificação de acesso é feita **no servidor**, nunca só no app (RNF-SEG-01).
- **RF-ASS-07** Preço de referência: **€5/mês** individual *(a validar; considerar plano anual com desconto)*.
- **RF-ASS-08** A assinatura de grupo custa mais que a individual e tem **limite de membros**,
  em faixas (ex.: até 10, até 25, até 50). Para mais membros, o dono passa para uma faixa maior.
- **RF-ASS-09** Grupo no limite: novos membros não conseguem entrar até o dono mudar de faixa
  (o pedido fica pendente, com aviso ao dono).
- **RF-ASS-10** Assinatura vencida = **somente leitura**: o usuário lê a Bíblia e vê o conteúdo
  existente, mas não comenta, não destaca, não curte, não marca leitura e não entra em grupos.

---

## 4. Requisitos não funcionais



- **RNF-I18N-01** A interface sai, no mínimo, em **português e inglês**. O app é construído
  desde o início preparado para receber outros idiomas sem retrabalho.
- **RNF-I18N-02** Idioma detectado pelo aparelho, com opção de trocar no perfil.

### Escala

- **RNF-ESC-01** Fase 1: dezenas de usuários (família e amigos). Fase 2: centenas a poucos
  milhares (igrejas). Fase 3 (futuro): dezenas de milhares ou mais.
- **RNF-ESC-02** A infraestrutura começa pequena e cresce conforme o uso. Mas as decisões
  caras de mudar depois (modelo de dados com grupos e visibilidade, sincronização offline,
  autenticação) são tomadas já pensando na fase 3.

### Custo

- **RNF-CUS-01** Orçamento de operação: cerca de **€20/mês** na fase 1, além das contas
  de desenvolvedor das lojas (Apple ~US$99/ano; Google US$25 uma vez).
- **RNF-CUS-02** Preferir serviços com plano gratuito ou barato que permitam crescer sem
  trocar de fornecedor.

### Privacidade e região

- **RNF-PRI-01** Usuários no **Brasil** e na **Europa** (talvez EUA no futuro):
  o app atende **LGPD** e **GDPR**.
- **RNF-PRI-02** Política de privacidade e termos de uso publicados e acessíveis no app.
- **RNF-PRI-03** O usuário pode **exportar** seus dados e **excluir** a conta (ver RF-CON-05).
- **RNF-PRI-04** Dados hospedados preferencialmente na **União Europeia** (atende a GDPR
  diretamente e é aceito pela LGPD).

### Plataformas

- **RNF-PLA-01** iOS **16+** (iPhone). Android depois, com versão mínima a definir.

### Segurança

- **RNF-SEG-01** As regras de visibilidade (quem vê o quê, por grupo) são garantidas pelo
  **servidor/banco**, não só pelo app. Um app modificado não consegue ler dados de outro grupo.
- **RNF-SEG-02** Senhas nunca são armazenadas pelo app; autenticação por provedor dedicado.
- **RNF-SEG-03** Toda comunicação é criptografada (HTTPS/TLS).

### Desempenho

- **RNF-DES-01** Abrir um capítulo em menos de **1 segundo**, inclusive offline.
- **RNF-DES-02** O app abre (tela inicial utilizável) em menos de **2 segundos**.
- **RNF-DES-03** Um comentário feito online aparece para os outros membros em poucos segundos.

### Offline

- **RNF-OFF-01** O texto completo das versões disponíveis vem dentro do app.
- **RNF-OFF-02** Comentários e destaques dos grupos do usuário são baixados em segundo plano.

### Acessibilidade

- **RNF-ACE-01** Respeita o tamanho de letra do sistema (Dynamic Type).
- **RNF-ACE-02** Funciona com leitor de tela (VoiceOver / TalkBack).
- **RNF-ACE-03** Modo claro e escuro.

### Backup

- **RNF-BAC-01** Backup diário do banco, guardando pelo menos 7 dias.

### Moderação (exigência das lojas)

- **RNF-MOD-01** Denunciar comentário.
- **RNF-MOD-02** Bloquear usuário (ver RF-COM-08).
- **RNF-MOD-03** Admins do grupo removem conteúdo (ver RF-LEI-40).

### Migração do PWA

- **RNF-MIG-01** Todos os dados do PWA são migrados sem perda: contas, comentários, respostas,
  destaques, curtidas, progresso de leitura e planos.
- **RNF-MIG-02** A família atual vira o primeiro grupo, **fechado**; os admins atuais viram
  admins do grupo, e o criador vira dono.
- **RNF-MIG-03** Comentários e destaques existentes ficam visíveis nesse grupo.

### Experiência nativa

- **RNF-UX-01** O app deve parecer e se comportar como um app nativo do iPhone, não como um site:
  navegação com gesto de voltar, vibração sutil nas ações, ícones do sistema, animações fluidas,
  menus e painéis nativos.
- **RNF-UX-02** Segue as *Human Interface Guidelines* da Apple (tamanhos de toque, tipografia,
  modo escuro, Dynamic Type).

### Monitoramento

- **RNF-MON-01** Relatório automático de erros e travamentos no aparelho do usuário.
- **RNF-MON-02** Estatísticas de uso anônimas (ex.: quantas pessoas leem por dia).

Já identificados:

- Lojas: conteúdo gerado por usuários exige **denunciar conteúdo** e **bloquear usuários**;
  a Apple exige **excluir a conta** de dentro do app.
- **Direitos autorais (bloqueante):** todas as versões atuais são de domínio público / licença
  livre, **exceto a NVI**, que não tem licença para distribuição pública. O app nas lojas
  não pode incluir a NVI sem licença. Decidir antes do lançamento: obter licença, ou trocar
  a versão padrão em português por uma livre (ex.: BLT ou ONBV).

---

## 5. Fora do escopo da v1

Ficam para versões futuras (já decidido que entram depois):

- Plano automático atravessando vários livros (ex.: "Novo Testamento em 1 ano").
- Copiar planos de outros grupos ou de planos pessoais.
- Grupos escondidos da busca.
- **Amigos** (em avaliação): seguir/adicionar pessoas fora de grupos; permitiria avisar
  amigos também sobre a leitura pessoal.
- Interface em outros idiomas além de PT e EN (ES, DE, IT).
- App Android (vem logo depois do iOS).

Fora de questão por enquanto (herdado do PRD original):

- Chat em grupo.
- Áudio da Bíblia.
- Integração com redes sociais.
- Gamificação (sequências, conquistas).
- Respostas a respostas (threading com mais de 1 nível).

# PRD — BiblEagles (Aplicativo de Leitura Bíblica em Família)

**Versão:** 1.2  
**Data:** 2026-06-15  
**Status:** Rascunho

---

## 1. Visão Geral

BiblEagles é um aplicativo web progressivo (PWA) para leitura bíblica em família. O objetivo é criar um espaço compartilhado onde todos os membros da família leiam a mesma passagem no mesmo dia, possam comentar versículo por versículo, marcar versículos favoritos e acompanhar o progresso uns dos outros — tudo organizado em pacotes de leitura com estatísticas de engajamento.

---

## 2. Usuários

| Papel   | Descrição                                                                                   |
|---------|---------------------------------------------------------------------------------------------|
| Admin   | Cria e gerencia pacotes de leitura. Pode promover outros membros a admin dentro do app.     |
| Membro  | Lê, marca versículos, comenta, reage e acompanha o progresso dos demais.                   |

> O primeiro admin é definido manualmente via painel Supabase. A partir daí, admins existentes podem promover outros membros diretamente no app.

---

## 3. Funcionalidades

### 3.1 Autenticação
- Cadastro com nome, e-mail e senha
- Login com e-mail e senha
- Recuperação de senha por e-mail
- Sessão persistente (lembrar usuário)

---

### 3.2 Pacotes de Leitura (conceito central)

Um **pacote de leitura** é uma série organizada de passagens que a família lerá ao longo do tempo. Exemplos:
- "Mateus completo — 1 capítulo por dia" (28 dias)
- "Salmos de 1 a 50" (50 dias)
- "Série de Natal — passagens avulsas de Lucas e Isaías"

**Criação (somente admin):**
- Nome e descrição do pacote
- Data de início
- Tipo de geração do plano:
  - **Automático:** seleciona livro + intervalo (ex: Mateus 1–28, 1 capítulo/dia) → sistema gera os dias automaticamente
  - **Manual:** admin adiciona cada dia individualmente (data + passagem), para séries temáticas ou misturadas
- Múltiplas passagens por dia são suportadas
- Admin pode editar ou remover qualquer dia do pacote, inclusive dias já passados (retroativo)
- Pacote tem status: **rascunho**, **ativo** ou **arquivado**

**Ativação e múltiplos pacotes:**
- Um pacote só aparece na tela inicial quando o admin o ativa manualmente (não ativa automático por data)
- Podem existir **múltiplos pacotes ativos simultaneamente** (ex: Mateus em paralelo com uma série de Salmos)
- Quando um pacote termina, ele permanece ativo até o admin arquivá-lo manualmente
- Na tela inicial, todos os pacotes ativos são exibidos, cada um com sua barra de progresso do dia

**Visualização:**
- Cada pacote ativo aparece como um card na tela inicial
- Barra de progresso (ex: "Dia 12 de 28 — Mateus 12")
- Card com estatísticas do pacote (ver 3.8)

---

### 3.3 Tela Inicial — Leitura do Dia

- Exibe o pacote ativo e a passagem do dia atual
- Se não houver passagem configurada para o dia, exibe mensagem localizada (ver tabela abaixo)
- Indicador de quem na família já leu hoje (avatares/iniciais)
- Botão "Ler agora" que abre o leitor na passagem do dia
- Feed de atividade recente (comentários e destaques da família, em ordem cronológica)

**Mensagem quando não há leitura configurada:**

| Idioma    | Mensagem                                                             |
|-----------|----------------------------------------------------------------------|
| PT        | "A mensagem ainda está no forno... volte mais tarde!"               |
| EN        | "The message is still in the oven, come back later!"                |
| ES        | "¡El mensaje todavía está en el horno, vuelve más tarde!"           |
| DE        | "Die Nachricht ist noch im Ofen... komm später wieder!"             |

O idioma é detectado automaticamente pela configuração do dispositivo ou pela preferência salva no perfil do usuário.

---

### 3.4 Bíblia Completa (navegação livre)

Além da leitura do dia, o app oferece acesso completo à Bíblia:

- Navegação por Testamento → Livro → Capítulo
- Barra de busca por referência (ex: "João 3:16") ou palavra-chave
- Todas as funcionalidades de interação disponíveis (destaques, comentários, likes — ver 3.5 e 3.6)
- Versículos já marcados ou comentados pela família aparecem indicados visualmente
- Qualquer capítulo pode ser lido, independentemente do plano ativo

---

### 3.5 Leitor Bíblico

- Exibe o texto versículo a versículo com numeração
- Seleção de versão da Bíblia (ver seção 5) — a preferida do usuário é carregada por padrão
- Versículos com destaque da família ficam coloridos no texto
- Versículos com comentários exibem um badge com o número de comentários
- **Ao tocar/clicar em um versículo**, abre painel com:
  - **Destacar** — escolhe uma das 4 cores
  - **Comentar** — abre caixa de texto inline
  - **Ver comentários** — lista comentários com respostas (threading)
  - **Ver quem destacou** — avatares dos membros que marcaram aquele versículo e suas cores
- Botão "Marcar passagem como lida" no final (somente quando aberto pela leitura do dia)
- Modo de tipografia: tamanho de fonte ajustável, modo claro/escuro

---

### 3.6 Comentários

- Comentário associado a: usuário + livro + capítulo + versículo + versão da Bíblia
- **Threading:** comentários podem ter respostas diretas (1 nível de profundidade — resposta a comentário, não resposta a resposta)
- Todos os membros leem os comentários uns dos outros
- Autor pode editar e deletar o próprio comentário
- Exibe: avatar/inicial do autor, nome, data relativa (ex: "há 2h")
- **Likes em comentários:** qualquer membro pode curtir um comentário (coração simples, sem contagem por tipo)

---

### 3.7 Destaques de Versículos

- 4 cores disponíveis com significado sugerido (personalizável pelo usuário):
  - Amarelo — versículo importante
  - Verde — promessa
  - Rosa — favorito
  - Azul — reflexão
- No leitor, versículos destacados por qualquer membro da família ficam coloridos
- Ao tocar num versículo destacado: mostra quem marcou e com qual cor
- **Meus Destaques:** lista pessoal com todos os versículos marcados, filtrável por cor e livro
- **Destaques da Família:** feed de todos os destaques de todos os membros, em ordem cronológica

---

### 3.8 Estatísticas do Pacote

Visível para todos os membros, na tela do pacote ativo:

- Progresso geral: dias lidos / total de dias (ex: "12/28 dias")
- Por membro: quantos dias cada um leu (com avatar e nome)
- Total de comentários no pacote
- Total de destaques no pacote
- Versículo mais comentado do pacote
- Membro mais ativo (mais leituras registradas)

---

### 3.9 Notificações Push

- Usuário pode optar por receber notificação diária de leitura
- Admin define o horário padrão sugerido (ex: 7h00)
- Usuário pode personalizar o horário nas configurações do perfil
- Conteúdo da notificação: "Leitura de hoje: [título da passagem]"
- Funciona em: desktop (Chrome, Firefox, Edge), Android (Chrome), iOS 16.4+ (Safari)

---

### 3.10 Perfil

- Foto de perfil (upload de imagem ou inicial gerada com cor de fundo)
- Nome e e-mail (editáveis)
- Configuração de notificação (ativar/desativar, horário)
- Versão padrão da Bíblia
- Idioma preferido da interface (PT, EN, ES, DE)
- (Admin) Botão para promover outros usuários a admin

---

### 3.11 Gestão de Admins (dentro do app)

- Admin vê lista de todos os membros no painel de administração
- Pode promover qualquer membro a admin
- Pode rebaixar um admin a membro (exceto a si mesmo)

---

## 4. Funcionalidades Fora do Escopo (v1.0)

- Planos de leitura individuais (ritmo próprio)
- Sistema de convites por link
- Chat em grupo
- Áudio da Bíblia
- Integração com redes sociais
- Gamificação / streaks / conquistas
- Respostas a respostas (threading profundo — apenas 1 nível)
- Busca por palavra-chave dentro da Bíblia (apenas por referência na v1.0)

---

## 5. Versões da Bíblia

### Português (padrão do app)
| Sigla | Nome completo                      |
|-------|------------------------------------|
| NVI   | Nova Versão Internacional (padrão) |
| ARA   | Almeida Revista e Atualizada       |
| ACF   | Almeida Corrigida Fiel             |
| NVT   | Nova Versão Transformadora         |

### Inglês
| Sigla | Nome completo             |
|-------|---------------------------|
| NIV   | New International Version |
| KJV   | King James Version        |
| ESV   | English Standard Version  |

### Espanhol
| Sigla   | Nome completo               |
|---------|-----------------------------|
| RVR1960 | Reina-Valera 1960           |
| NVI-ES  | Nueva Versión Internacional |
| DHH     | Dios Habla Hoy              |

### Alemão
| Sigla   | Nome completo      |
|---------|--------------------|
| LUT     | Lutherbibel 2017   |
| SCH2000 | Schlachter 2000    |
| ELB     | Elberfelder Bibel  |

> Fonte: API.Bible (gratuito, 5.000 req/dia). Disponibilidade das versões confirmada no momento do desenvolvimento.

---

## 6. Arquitetura Técnica

| Camada         | Tecnologia              | Plano / Custo          |
|----------------|-------------------------|------------------------|
| Frontend       | Next.js 14 (App Router) | —                      |
| Estilo         | Tailwind CSS            | —                      |
| Linguagem      | TypeScript              | —                      |
| Banco de dados | Supabase (PostgreSQL)   | Gratuito (500 MB)      |
| Autenticação   | Supabase Auth           | Gratuito               |
| Texto bíblico  | API.Bible               | Gratuito (5k req/dia)  |
| Notificações   | OneSignal               | Gratuito               |
| Hospedagem     | Vercel                  | Gratuito               |
| PWA            | next-pwa                | —                      |

---

## 7. Modelo de Dados

```
users
  id, name, email, avatar_url, role (admin|member),
  preferred_version, preferred_language (pt|en|es|de),
  notification_enabled, notification_time, created_at

reading_packages
  id, title, description, start_date, status (draft|active|archived),
  created_by (user_id), created_at

reading_plan_days
  id, package_id, date, title,
  passages: [{ book, chapter_start, verse_start, chapter_end, verse_end }],
  created_at

reading_progress
  id, user_id, plan_day_id, completed_at

bookmarks
  id, user_id, book, chapter, verse, bible_version, color, created_at

comments
  id, user_id, book, chapter, verse, bible_version,
  content, parent_id (null = raiz, id = resposta), 
  updated_at, created_at

comment_likes
  id, user_id, comment_id, created_at
```

---

## 8. Estrutura de Telas

```
/                          → Home (leitura do dia + pacote ativo)
/read/[book]/[chapter]     → Leitor bíblico (navegação livre)
/bible                     → Navegador completo da Bíblia (Testamento → Livro → Capítulo)
/package/[id]              → Detalhes e estatísticas do pacote
/bookmarks                 → Meus destaques
/family                    → Destaques da família (feed)
/history                   → Histórico pessoal de leitura
/profile                   → Perfil e configurações
/admin                     → Painel admin (pacotes + promoção de membros)
/admin/package/new         → Criar novo pacote
/admin/package/[id]/edit   → Editar pacote existente
/login                     → Login
/register                  → Cadastro
```

---

## 9. Internacionalização (i18n)

O app suporta 4 idiomas de interface: PT, EN, ES, DE.

- Detectado automaticamente pelo locale do dispositivo
- Pode ser sobrescrito nas configurações do perfil
- Todas as telas, botões, mensagens de erro e notificações são traduzidos
- O texto bíblico segue a versão escolhida pelo usuário (independente do idioma da interface)

---

## 10. Design

### Princípios
- Interface limpa, com foco no texto bíblico
- Tipografia confortável para leitura longa (serifada no leitor, sans-serif na UI)
- Modo claro e escuro
- Mobile-first (a maioria lerá no celular)
- Paleta: tons de bege/creme no leitor; acentos em azul escuro ou verde oliva na UI

### Cores de Destaque
| Cor     | Significado sugerido  |
|---------|-----------------------|
| Amarelo | Versículo importante  |
| Verde   | Promessa              |
| Rosa    | Favorito              |
| Azul    | Reflexão              |

---

## 11. Critérios de Aceite (MVP)

- [ ] Usuário consegue se cadastrar e fazer login
- [ ] Admin cria pacote automático (livro inteiro, 1 capítulo/dia)
- [ ] Admin cria pacote manual (dias individuais com passagens avulsas)
- [ ] Tela inicial exibe passagem do dia correta
- [ ] Mensagem "no forno" aparece no idioma correto quando não há leitura
- [ ] Leitor exibe texto da versão selecionada
- [ ] Usuário pode trocar versão da Bíblia no leitor
- [ ] Usuário pode marcar leitura do dia como concluída
- [ ] Usuário pode destacar versículo com uma das 4 cores
- [ ] Usuário pode comentar em um versículo
- [ ] Usuário pode responder a um comentário (1 nível)
- [ ] Usuário pode curtir um comentário
- [ ] Outros membros veem destaques e comentários
- [ ] Estatísticas do pacote exibem progresso correto
- [ ] Bíblia completa navegável por Testamento → Livro → Capítulo
- [ ] Admin pode promover membro a admin dentro do app
- [ ] Notificação push funciona em Android e desktop
- [ ] App instalável como PWA no celular
- [ ] Interface disponível em PT, EN, ES e DE

---

## 12. Decisões de Design Confirmadas

| Questão                              | Decisão                                                          |
|--------------------------------------|------------------------------------------------------------------|
| Múltiplos pacotes ativos             | Sim — vários podem estar ativos ao mesmo tempo                  |
| Ativação de pacote                   | Manual pelo admin (nunca automática)                            |
| Edição retroativa de dias do pacote  | Permitida — admin pode editar qualquer dia, passado ou futuro   |
| Threading de comentários             | 1 nível de profundidade (resposta a comentário, não a resposta) |
| Promoção de admins                   | Admin pode promover e rebaixar outros membros dentro do app     |
| Mensagem sem leitura configurada     | Texto localizado "no forno" nos 4 idiomas (PT/EN/ES/DE)         |

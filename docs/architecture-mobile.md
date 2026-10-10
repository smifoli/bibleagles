# Arquitetura — BiblEagles Mobile

**Status:** Arquitetura da v1 fechada (2026-10-10)
**Base:** `docs/requirements-mobile.md` (os códigos RF-*/RNF-* citados aqui vêm de lá)

> Este documento descreve **como** o app é construído. Cada decisão aponta para o requisito
> que a motivou.

---

## 1. Visão geral

```
┌─────────────────── iPhone ───────────────────┐
│   [1] Telas (interface)                      │
│          │  lê e escreve SÓ aqui             │
│   [2] Banco local ◄──── [3] Bíblia (texto)   │
│          │                                   │
│   [4] Sincronizador  (fila de pendências)    │
└──────────┼───────────────────────────────────┘
           │ internet (quando tem)
┌──────────▼────────── Servidor ───────────────┐
│   [5] Autenticação   (quem é você)           │
│   [6] Regras         (o que você pode ver)   │
│   [7] Banco central  (a "verdade" oficial)   │
│   [8] Arquivos       (fotos de perfil)       │
│   [9] Tarefas        (lembrete diário, push) │
└──────────┼───────────────────────────────────┘
           ▼
   [10] Apple / Google push ──► notificação no celular
   [11] Monitoramento ◄── relatório de erros do app
```

| Peça | Responsabilidade | Requisitos |
|---|---|---|
| 1. Telas | Interface | — |
| 2. Banco local | Cópia dos dados relevantes ao usuário, no aparelho | RF-OFF, RNF-DES-01 |
| 3. Bíblia | Texto bíblico embutido no app | RNF-OFF-01 |
| 4. Sincronizador | Envia pendências locais, baixa novidades, aplica regras de conflito | RF-OFF-03, RF-OFF-06 |
| 5. Autenticação | Login e-mail / Apple / Google | RF-CON |
| 6. Regras | Quem vê e quem pode fazer o quê — nunca confia no app | RNF-SEG-01 |
| 7. Banco central | Fonte da verdade | — |
| 8. Arquivos | Fotos de perfil | RF-PER-01 |
| 9. Tarefas | Lembrete diário, disparo de push | RF-NOT |
| 10. Push | APNs (Apple) e FCM (Google) | RF-NOT-04 |
| 11. Monitoramento | Erros e travamentos | RNF-MON |

### Princípios

- **Offline-first:** as telas leem e escrevem só no banco local. O sincronizador conversa com
  o servidor em segundo plano.
- **Fonte da verdade:** o banco central. O banco local é uma cópia que pode estar atrasada.
- **Ordem de chegada:** conflitos são resolvidos pela ordem em que as ações chegam ao servidor,
  não pela ordem em que foram feitas.
- **Soft delete (tombstone):** itens sincronizados não são apagados de verdade na hora; são
  marcados como apagados, para que os outros aparelhos fiquem sabendo.

---

## 2. Modelo de dados

### Entidades e relacionamentos

```
PESSOAS                      GRUPOS
Usuário ──1:N── Aparelho     Grupo ──1:N── Convite
   │                           │
   └──N:N (Membro do grupo)────┘   papel, nível de notificação
   └──N:N (Pedido de entrada)──┘   pendente / aprovado / recusado
Usuário ──N:N (Bloqueio)── Usuário

PLANOS                       LEITURA
Grupo ──1:N── Plano          Usuário ──1:N── Leitura pessoal (livro, cap.)
Usuário ──1:N── Plano (pessoal)
Plano ──1:N── Dia do plano   Usuário ──N:N (Progresso no plano)── Dia do plano
Dia ──1:N── Passagem                       + capítulo, quando leu

INTERAÇÃO
Usuário ──1:N── Comentário ──1:N── Comentário (resposta)
Comentário ──N:N (Visibilidade)── Grupo
Usuário ──1:N── Destaque ──N:N (Visibilidade)── Grupo
Usuário ──N:N (Curtida)── Comentário
Usuário ──N:N (Denúncia)── Comentário

AVISOS
Usuário ──1:N── Notificação
```

- O texto bíblico **não** fica no banco central; o banco guarda só referências (livro, capítulo, versículo).
- Comentário/destaque **privado** = sem nenhuma linha de Visibilidade.
- Foto de perfil é **atributo** do usuário (endereço do arquivo), não entidade.

### Identificadores (IDs)

- **D-DAD-01** Todo registro tem um **UUID** como ID.
- **D-DAD-02** O ID é gerado **no aparelho**, no momento da criação, e já é o definitivo.
  O servidor aceita o ID enviado (validando o formato e que ele ainda não existe).
  - **Por quê:** offline, os registros se referenciam antes de chegar ao servidor
    (editar, responder, curtir, definir visibilidade). Um ID provisório exigiria trocar
    todas as referências depois da sincronização — frágil.
- **D-DAD-03** Os UUIDs existentes no PWA são mantidos na migração (RNF-MIG-01).

### Dono do plano

- **D-DAD-04** O plano tem duas colunas, `grupo_id` e `usuario_id`, cada uma com sua chave
  estrangeira. O banco garante que **exatamente uma** está preenchida.
  - **Por quê não um "grupo pessoal" oculto:** o caso especial iria para os grupos (busca,
    convites, visibilidade…). Esquecer um deles vazaria dados privados. Esquecer um caso no
    plano só gera um erro visual. Princípio: **falhar de forma segura** — errar escondendo,
    nunca mostrando.
  - **Por quê não uma coluna só (`dono_id` + `dono_tipo`):** chave estrangeira aponta para uma
    tabela só; com uma coluna, o banco não garante que o dono existe nem apaga em cascata.
- **D-DAD-05** Comentário/destaque **privado** = nenhuma linha de Visibilidade (falha de forma segura).

### Colunas de sincronização

Toda tabela sincronizada tem:

| Coluna | Definida por | Uso |
|---|---|---|
| `criado_em` | Aparelho | Exibir quando o usuário fez (ex.: comentário escrito offline às 10h mostra 10h) |
| `atualizado_em` | **Servidor** | Sincronização: "o que mudou desde X" |
| `apagado_em` | **Servidor** | Tombstone (soft delete) |

- **D-DAD-06** O marcador de sincronização (`atualizado_em`, ou um contador de versão) é sempre
  definido pelo **servidor**, quando a mudança chega.
  - **Por quê:** relógios de aparelho podem estar errados; um horário atrasado faria a mudança
    nunca ser baixada pelos outros, sem erro visível.
- **D-DAD-07** O horário do aparelho só é usado para exibição (`criado_em`), onde um erro é inofensivo.
- **D-DAD-08** "Vale a edição mais recente" (RF-OFF-06) = vale a que **chegou por último** ao servidor.

---

## 3. Sincronização

### O que cada aparelho baixa

- **D-SYN-01** Comentários e destaques: os **visíveis em algum grupo do usuário**, mais **todos
  os que ele mesmo criou** (inclusive privados e em grupos que deixou).
- **D-SYN-02** O filtro é aplicado **no servidor**. O aparelho nunca recebe dados que o usuário
  não pode ver.
  - **Por quê:** filtrar no aparelho exporia os dados a apps modificados ou a quem inspecionar
    o tráfego (RNF-SEG-01). Menos dados trafegados é consequência, não o motivo.

### Mudanças de acesso

Mudar o que alguém pode ver também é uma mudança, mesmo que os dados não tenham mudado.

- **D-SYN-03** Sair de um grupo (ou ser removido) chega ao aparelho como mudança da linha de
  Membro do grupo (`apagado_em`). O aparelho então remove os itens que **perderam o motivo**
  de estar lá — mantém os visíveis em outro grupo do usuário e os criados por ele.
- **D-SYN-04** Entrar num grupo faz o aparelho baixar **todo o conteúdo** daquele grupo,
  não só o que mudou desde a última sincronização.
- **D-SYN-05** Tirar um grupo da visibilidade de um comentário/destaque marca a linha de
  Visibilidade com `apagado_em` (tombstone). Os membros daquele grupo recebem esse tombstone
  e aplicam a regra do D-SYN-03.
  - O tombstone leva **só o ID**, nunca o conteúdo. Daí em diante, o servidor não envia mais
    nada daquele item para quem perdeu acesso.
- **D-SYN-06** Quando um usuário **ganha** acesso a um item (grupo devolvido à visibilidade,
  entrada em grupo), o servidor envia o **item completo** (conteúdo, respostas, curtidas),
  não só a linha de ligação — o aparelho pode ter apagado o item antes.
  - Regra simétrica: **perdeu acesso → só o ID; ganhou acesso → conteúdo completo.**
- **Princípio:** todas as mudanças de acesso (sair, ser removido, tirar visibilidade) usam o
  mesmo mecanismo — tombstone nas tabelas de ligação.

### Envio de pendências (upload)

- **D-SYN-07** O servidor valida cada pendência e pode **aceitar parcialmente** (ex.: comentário
  aceito na Família, recusado na Igreja porque o autor foi removido). Ele devolve a **versão
  final**, e o aparelho substitui a cópia local por ela.
- **D-SYN-08** Toda recusa, total ou parcial, gera um **aviso claro** ao usuário.
  Nenhuma falha é silenciosa.
- **D-SYN-09** O texto escrito pelo usuário **nunca se perde**: se a visibilidade falhar em todos
  os grupos, o comentário vira **privado** em vez de ser descartado.

### Quando sincronizar

| Situação | Gatilho |
|---|---|
| App aberto | Canal em tempo real avisa "tem novidade" |
| App fechado | Push notification; sincroniza ao abrir |
| Internet volta | Sincroniza na hora (esvazia a fila de pendências) |
| Garantia extra | Ao abrir o app e periodicamente, caso algum aviso se perca |

- **D-SYN-10** Com o app aberto, um **canal em tempo real** com o servidor avisa quando há
  novidades (RNF-DES-03). Sem *polling* em intervalo curto (gasta bateria e dados).
- **D-SYN-11** O canal em tempo real envia só um **sinal** ("tem novidade"), nunca os dados.
  O aparelho então busca pelo caminho normal de sincronização.
  - **Por quê:** um único caminho de dados = regras de acesso (D-SYN-02, tombstones)
    implementadas num lugar só.

---

## 4. Tecnologias

| Peça | Tecnologia |
|---|---|
| [1] Telas | **React Native + Expo** (TypeScript) |
| [2]+[4] Banco local + sincronizador | **PowerSync** (SQLite no aparelho) |
| [5]–[9] Servidor | **Supabase** (Postgres, Auth, Storage, Edge Functions) |
| [10] Push | **Expo Push** (repassa para APNs/FCM) |
| [11] Monitoramento | **Sentry** (erros) + **PostHog UE** (uso) |

### App

- **D-TEC-01** O app é feito em **React Native + Expo**, em TypeScript.
  - **Por quê:** um código só para iOS e Android (RNF-PLA-01); reaproveita o conhecimento de
    React/TypeScript e partes do PWA (texto bíblico, lógica de planos e datas).
  - **Descartados:** Swift (Android seria outro app do zero, em Kotlin); Flutter (linguagem nova,
    nada reaproveitado); Ionic/Capacitor (site dentro de uma moldura — não atende RNF-UX-01).
- **D-TEC-02** Para a sensação nativa (RNF-UX-01): navegação nativa (Expo Router, native stack),
  `expo-haptics`, SF Symbols (`expo-symbols`), Reanimated + Gesture Handler, menus e *sheets* nativos.

### Servidor e sincronização

- **D-TEC-03** Servidor: **Supabase** (Postgres, autenticação com e-mail/Apple/Google, arquivos,
  funções), em região da **União Europeia** (RNF-PRI-04).
- **D-TEC-04** Banco local e sincronização: **PowerSync** — SQLite no aparelho, regras de
  sincronização no servidor (D-SYN-02), envios passando pelo nosso backend para validação (D-SYN-07).
  - **Por quê:** implementa quase toda a seção 3 por configuração; é o mais maduro para React Native.
  - **Descartados:** WatermelonDB (sincronização inteira à mão — alto risco de perder ou vazar dados);
    ElectricSQL (escrita offline por nossa conta, só "último vence"); Zero (sem React Native).
  - **Sem prisão:** os dados ficam no nosso Postgres; dá para trocar o motor sem migrar dados.

### Custo por fase (RNF-CUS)

- **D-TEC-05** Começar com o **menor custo possível**:

| Fase | Supabase | PowerSync | Total |
|---|---|---|---|
| Desenvolvimento + família | Grátis | Grátis (até 50 clientes simultâneos) | **€0** |
| Antes de abrir para outras pessoas | Pro (~US$25) | Grátis enquanto couber | ~€23 |
| Fase 2 (igrejas) | Pro | Pro (US$49) **ou** auto-hospedado (~€5–10) | ~€30–70 |

- **D-TEC-06** Na fase grátis, o backup diário (RNF-BAC-01) é feito por nós: um job agendado
  (ex.: GitHub Actions) exporta o banco todo dia. Os planos grátis desativam projetos após
  1 semana sem uso — aceitável enquanto a família usa diariamente.

### Assinatura

- **D-ASS-01** O acesso de escrita é verificado no **servidor**, na validação de cada envio
  (D-SYN-07). Assinatura vencida → envio recusado com aviso claro (D-SYN-08).
- **D-ASS-02** A leitura continua sendo sincronizada para quem tem assinatura vencida (RF-ASS-10).
- **D-ASS-03** O app conhece a data de validade da assinatura e já bloqueia as ações de escrita
  na tela quando vencida — evita que o usuário escreva offline algo que será recusado.
  O servidor continua sendo a verificação final.
- **D-ASS-04** Faixas de grupo = produtos de assinatura separados nas lojas (Apple e Google não
  cobram "por pessoa" nativamente; mudar de faixa = upgrade/downgrade).
- **D-ASS-05** Unificação das compras iOS/Android e aviso ao servidor (renovou, cancelou, venceu):
  **RevenueCat** *(a confirmar; verificar preço atual)*.

### Push e monitoramento

- **D-TEC-07** Push via **Expo Push**: o app registra o token na tabela Aparelho; a Edge Function
  envia ao Expo, que repassa à Apple/Google. A lógica de quem recebe o quê (triggers atuais do
  PWA) é reaproveitada; só muda o transporte (Web Push → Expo Push).
- **D-TEC-08** Erros e travamentos: **Sentry** (RNF-MON-01).
- **D-TEC-09** Estatísticas de uso: **PostHog**, hospedado na UE (RNF-MON-02, RNF-PRI-04).
  Só eventos e erros — **nunca** o conteúdo de comentários.

---

## 5. Migração do PWA

### Mapeamento

| Hoje (PWA) | No modelo novo |
|---|---|
| `users` | Usuário (mesmo ID, mesma senha) |
| — | Grupo **"Família"**, fechado, criado na migração |
| `users.role` | Membro do grupo Família com o papel; Lucas como **dono** |
| `users.is_deleted` | Usuário mantido; membro com `apagado_em` (ex-membro) |
| `reading_packages` + `reading_plan_days` | Plano (`grupo_id` = Família) + Dia + Passagem |
| `comments` + `comment_likes` | Comentário + Curtida + Visibilidade (Família) |
| `bookmarks` | Destaque + Visibilidade (Família) |
| `reading_progress` (dia de plano) | Progresso **por capítulo** (cada capítulo do dia, mesma data) |
| `reading_progress` (capítulo avulso) | Leitura pessoal |
| `notifications` | **Não migra** — caixa de entrada começa vazia |
| `push_subscriptions` | **Não migra** — o app registra tokens novos |

### Decisões

- **D-MIG-01** Destaques do mesmo usuário no mesmo versículo em versões diferentes viram
  **um só**: fica o mais recente (RF-VER-04).
- **D-MIG-02** Capítulos lidos por plano também são copiados para a **leitura pessoal**,
  para o percentual da Bíblia e o histórico não "zerarem".
- **D-MIG-03** Os usuários atuais ficam marcados como **isentos de assinatura** (RF-ASS-04).
- **D-MIG-04** O app usa um **projeto Supabase novo** (UE), com o schema novo. O projeto do PWA
  continua no ar até o dia da migração, quando os dados são copiados (inclusive as senhas).
- **D-MIG-05** **Dia da migração** pode ser depois de o app estar na App Store:
  1. App publicado, já usado por novos usuários.
  2. Família continua no PWA até o dia combinado (e não cria conta no app antes).
  3. No dia: PWA em modo somente leitura → script de migração → família entra no app com o
     mesmo e-mail e senha → PWA passa a mostrar só "baixe o app".
- **D-MIG-06** O script de migração é testado antes numa cópia dos dados, e conferido por
  contagem (ex.: número de comentários antes = depois).
- **D-MIG-08** Toda a família usa iPhone: a migração não depende do app Android.

### Região

- **D-MIG-07** Servidor numa **única região, na UE**, atendendo Brasil, Europa e EUA.
  - **Por quê funciona:** com offline-first, as telas leem do aparelho; a distância até o
    servidor só afeta a sincronização em segundo plano (~100–200 ms a mais), imperceptível.
  - Verificar antes do lançamento: política de privacidade informando que os dados ficam na UE
    (transferência internacional — LGPD).

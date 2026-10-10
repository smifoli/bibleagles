# Arquitetura — BiblEagles Mobile

**Status:** Em desenho
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

*(em andamento)*

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

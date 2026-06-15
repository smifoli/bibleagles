#!/usr/bin/env bash
# work-on-issue.sh — Executa todas as issues abertas do BiblEagles, uma por vez,
# em ordem crescente. Verifica checklist antes e depois de cada sessão.
# Só fecha a issue quando todos os itens estiverem satisfeitos.
set -euo pipefail

# ── Pré-requisitos ───────────────────────────────────────────────────────────
for cmd in git gh jq claude; do
  if ! command -v "$cmd" > /dev/null 2>&1; then
    echo "Erro: '$cmd' não encontrado." >&2
    exit 1
  fi
done

if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Erro: execute este script dentro do repositório git." >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
if [ -z "$REPO" ]; then
  echo "Erro: não foi possível identificar o repositório GitHub." >&2
  exit 1
fi

# ── Contexto fixo do projeto ─────────────────────────────────────────────────
project_context() {
  cat <<CONTEXT
Estou desenvolvendo o **BiblEagles** — um PWA de leitura bíblica em família.

## Projeto
- **Repositório:** https://github.com/$REPO
- **PRD:** PRD.md (na raiz do repositório)
- **Design:** design/index.html (protótipo visual de todas as telas — leia antes de começar)

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- API.Bible (texto bíblico, 5k req/dia gratuito)
- OneSignal (notificações push)
- Vercel (hospedagem)

## Design system — Direção Papel
| Token            | Valor                                                        |
|------------------|--------------------------------------------------------------|
| background       | #f5efe4 (paper/creme)                                        |
| canvas           | #e8e0d4                                                      |
| surface          | #fbf7ef                                                      |
| border           | #e6dac6                                                      |
| card ativo       | #2a2017 (espresso — destaque por contraste, sem borda lateral)|
| texto primário   | #1c150e                                                      |
| texto secundário | #52442f                                                      |
| texto muted      | #93826d                                                      |
| amarelo          | #f1e6a0 (SOMENTE marcador de versículo no Leitor)            |
| UI font          | Space Grotesk (400/500/600/700)                              |
| verse font       | Spectral serif (16px, line-height 1.8)                       |
| flat             | sem sombra, sem emoji na UI                                  |

## Versões da Bíblia
- PT: NVI (padrão), ARA, ACF, NVT
- EN: NIV, KJV, ESV
- ES: RVR1960, NVI-ES, DHH
- DE: LUT, SCH2000, ELB

## Idiomas da interface
PT, EN, ES, DE — detectado pelo dispositivo, sobrescrito no perfil do usuário.
CONTEXT
}

# ── Helpers de checklist ─────────────────────────────────────────────────────

# Conta itens não-marcados (- [ ]) no corpo da issue
unchecked_count() {
  local body="$1"
  echo "$body" | grep -c '^\- \[ \]' || echo "0"
}

# Conta se há qualquer item de checklist (marcado ou não)
has_checklist() {
  local body="$1"
  local total
  total=$(echo "$body" | grep -cE '^\- \[(x| )\]' || echo "0")
  [ "$total" -gt 0 ]
}

# Lista os itens pendentes formatados
pending_items() {
  local body="$1"
  echo "$body" | grep '^\- \[ \]' | sed 's/^/    /'
}

# ── Processa uma issue com loop de verificação ────────────────────────────────
process_issue() {
  local NUMBER="$1"
  local TITLE="$2"
  local LABELS="$3"
  local URL="$4"
  local ATTEMPT=0

  while true; do
    ATTEMPT=$((ATTEMPT + 1))

    # Re-busca o corpo atualizado da issue a cada iteração
    local BODY
    BODY=$(gh issue view "$NUMBER" --json body -q '.body // ""')

    # ── Verifica checklist antes de iniciar ──────────────────────────────────
    if has_checklist "$BODY"; then
      local PENDING
      PENDING=$(unchecked_count "$BODY")

      if [ "$PENDING" -eq 0 ]; then
        echo "  Todos os itens do checklist já satisfeitos."
        break
      fi

      echo "  $PENDING item(s) pendente(s):"
      pending_items "$BODY"
      echo ""
    else
      # Sem checklist: uma sessão é suficiente, não volta ao loop
      if [ "$ATTEMPT" -gt 1 ]; then
        echo "  Sem checklist — issue concluída na sessão anterior."
        break
      fi
    fi

    # ── Monta prompt (destaca itens pendentes na 2ª+ tentativa) ─────────────
    local FOCUS=""
    if [ "$ATTEMPT" -gt 1 ] && has_checklist "$BODY"; then
      FOCUS="

## Itens ainda pendentes nesta issue (foque neles):
$(pending_items "$BODY" | sed 's/^    //')"
    fi

    local PROMPT
    PROMPT="$(project_context)

---

## Issue #${NUMBER} — ${TITLE}
**Labels:** ${LABELS}
**URL:** ${URL}
**Tentativa:** ${ATTEMPT}

${BODY}
${FOCUS}

---

Leia o PRD.md e o design/index.html antes de implementar.
À medida que concluir cada item do checklist, marque-o na issue com:
  gh issue edit ${NUMBER} --body \"\$(gh issue view ${NUMBER} --json body -q '.body' | sed 's/- \[ \] ITEM/- [x] ITEM/')\"
Quando terminar esta sessão, encerre-a — o script verificará o checklist e fechará a issue se tudo estiver completo."

    echo ""
    echo "  ── Sessão ${ATTEMPT} iniciando para issue #${NUMBER} ──────────────────"
    claude "$PROMPT"
    echo "  ── Sessão ${ATTEMPT} encerrada ────────────────────────────────────────"
    echo ""

    # ── Verifica checklist depois da sessão ──────────────────────────────────
    BODY=$(gh issue view "$NUMBER" --json body -q '.body // ""')

    if has_checklist "$BODY"; then
      local REMAINING
      REMAINING=$(unchecked_count "$BODY")

      if [ "$REMAINING" -eq 0 ]; then
        echo "  Todos os itens satisfeitos após sessão ${ATTEMPT}."
        break
      else
        echo "  Ainda há $REMAINING item(s) pendente(s) após sessão ${ATTEMPT}. Reiniciando..."
        sleep 1
      fi
    else
      # Sem checklist: encerra após a primeira sessão
      break
    fi
  done

  # ── Fecha a issue ─────────────────────────────────────────────────────────
  echo "  Fechando issue #${NUMBER}..."
  gh issue close "$NUMBER" --comment "Implementado em ${ATTEMPT} sessão(ões) via work-on-issue.sh"
  echo "  Issue #${NUMBER} fechada."
}

# ── Busca issues abertas ordenadas por número ─────────────────────────────────
echo ""
echo "  BiblEagles · $REPO"
echo "  Buscando issues abertas..."

ISSUES_JSON=$(gh issue list \
  --limit 100 \
  --state open \
  --json number,title,labels \
  --jq 'sort_by(.number)')

TOTAL=$(echo "$ISSUES_JSON" | jq 'length')

if [ "$TOTAL" -eq 0 ]; then
  echo ""
  echo "  Nenhuma issue aberta. Tudo pronto!"
  exit 0
fi

echo ""
echo "  $TOTAL issues abertas encontradas:"
echo "  ──────────────────────────────────────────────────────────"
echo "$ISSUES_JSON" | jq -r '.[] | "  #\(.number)  \(.title)"'
echo "  ──────────────────────────────────────────────────────────"
echo ""

# ── Itera por cada issue ──────────────────────────────────────────────────────
CURRENT=0
echo "$ISSUES_JSON" | jq -c '.[]' | while IFS= read -r issue; do
  CURRENT=$((CURRENT + 1))
  NUMBER=$(echo "$issue" | jq -r '.number')
  TITLE=$(echo "$issue"  | jq -r '.title')

  echo ""
  echo "  ══════════════════════════════════════════════════════════"
  printf "  Issue %d/%d · #%s\n" "$CURRENT" "$TOTAL" "$NUMBER"
  echo "  $TITLE"
  echo "  ══════════════════════════════════════════════════════════"

  # Busca detalhes completos
  ISSUE_JSON=$(gh issue view "$NUMBER" --json number,title,body,labels,url)
  LABELS=$(echo "$ISSUE_JSON" | jq -r '[.labels[].name] | join(", ")')
  URL=$(echo "$ISSUE_JSON"    | jq -r '.url')

  process_issue "$NUMBER" "$TITLE" "$LABELS" "$URL"

  if [ "$CURRENT" -lt "$TOTAL" ]; then
    echo "  Iniciando próxima issue em 2s..."
    sleep 2
  fi
done

echo ""
echo "  ══════════════════════════════════════════════════════════"
echo "  Todas as issues foram processadas e fechadas."
echo "  ══════════════════════════════════════════════════════════"

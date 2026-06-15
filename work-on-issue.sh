#!/usr/bin/env bash
# work-on-issue.sh — Executa todas as issues abertas do BiblEagles, uma por vez,
# em ordem crescente. Quando uma sessão Claude termina, a próxima começa.
# Issues fechadas são ignoradas automaticamente.
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

# ── Contexto fixo do projeto (injetado em cada sessão) ───────────────────────
project_context() {
  cat <<CONTEXT
Estou desenvolvendo o **BiblEagles** — um PWA de leitura bíblica em família.

## Projeto
- **Repositório:** https://github.com/$REPO
- **PRD:** PRD.md (na raiz do repositório)
- **Design:** design/index.html (protótipo visual de todas as telas — abra e leia antes de começar)

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- API.Bible (texto bíblico, 5k req/dia gratuito)
- OneSignal (notificações push)
- Vercel (hospedagem)

## Design system — Direção Papel
| Token          | Valor                                              |
|----------------|----------------------------------------------------|
| background     | #f5efe4 (paper/creme)                              |
| canvas         | #e8e0d4                                            |
| surface        | #fbf7ef                                            |
| border         | #e6dac6                                            |
| card ativo     | #2a2017 (espresso — destaque por contraste, sem borda lateral) |
| texto primário | #1c150e                                            |
| texto secundário | #52442f                                          |
| texto muted    | #93826d                                            |
| amarelo        | #f1e6a0 (SOMENTE marcador de versículo no Leitor)  |
| UI font        | Space Grotesk (400/500/600/700)                    |
| verse font     | Spectral serif (16px, line-height 1.8)             |
| flat           | sem sombra, sem emoji na UI                        |

## Versões da Bíblia
- PT: NVI (padrão), ARA, ACF, NVT
- EN: NIV, KJV, ESV
- ES: RVR1960, NVI-ES, DHH
- DE: LUT, SCH2000, ELB

## Idiomas da interface
PT, EN, ES, DE — detectado pelo dispositivo, sobrescrito no perfil do usuário.
CONTEXT
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
  echo ""

  # Busca detalhes completos da issue
  ISSUE_JSON=$(gh issue view "$NUMBER" --json number,title,body,labels,url)
  ISSUE_BODY=$(echo "$ISSUE_JSON"   | jq -r '.body // ""')
  ISSUE_LABELS=$(echo "$ISSUE_JSON" | jq -r '[.labels[].name] | join(", ")')
  ISSUE_URL=$(echo "$ISSUE_JSON"    | jq -r '.url')

  PROMPT="$(project_context)

---

## Issue #${NUMBER} — ${TITLE}
**Labels:** ${ISSUE_LABELS}
**URL:** ${ISSUE_URL}

${ISSUE_BODY}

---

Leia o PRD.md e o design/index.html antes de implementar. Quando terminar, encerre a sessão — o script fechará a issue automaticamente."

  # Inicia sessão Claude Code para esta issue
  claude "$PROMPT"

  echo ""
  echo "  Sessão encerrada para issue #$NUMBER. Fechando issue..."
  gh issue close "$NUMBER" --comment "Implementado via work-on-issue.sh"
  echo "  Issue #$NUMBER fechada."

  # Verifica se ainda há próxima
  if [ "$CURRENT" -lt "$TOTAL" ]; then
    echo "  Iniciando próxima issue..."
    sleep 1
  fi
done

echo ""
echo "  Todas as issues foram processadas."

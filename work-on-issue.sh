#!/usr/bin/env bash
# work-on-issue.sh — Abre uma sessão Claude Code focada em uma issue do BiblEagles
set -euo pipefail

# ── Verifica pré-requisitos ──────────────────────────────────────────────────
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "Erro: execute este script dentro do repositório git." >&2
  exit 1
fi

if ! command -v gh > /dev/null 2>&1; then
  echo "Erro: gh CLI não encontrado. Instale em https://cli.github.com" >&2
  exit 1
fi

if ! command -v claude > /dev/null 2>&1; then
  echo "Erro: claude CLI não encontrado." >&2
  exit 1
fi

# ── Info do repositório ──────────────────────────────────────────────────────
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
if [ -z "$REPO" ]; then
  echo "Erro: não foi possível identificar o repositório GitHub." >&2
  exit 1
fi

# ── Lista issues abertas ─────────────────────────────────────────────────────
echo ""
echo "  BiblEagles · $REPO"
echo "  ──────────────────────────────────────────────────────────"

gh issue list \
  --limit 50 \
  --state open \
  --json number,title,labels \
  --template '{{range .}}  #{{.number}}  {{.title}}  [{{range .labels}}{{.name}} {{end}}]{{"\n"}}{{end}}'

echo "  ──────────────────────────────────────────────────────────"
echo ""

# ── Seleção da issue ─────────────────────────────────────────────────────────
if [ -n "${1:-}" ]; then
  ISSUE_NUMBER="$1"
  echo "  Issue selecionada via argumento: #$ISSUE_NUMBER"
else
  printf "  Qual issue deseja trabalhar? (número): "
  read -r ISSUE_NUMBER
fi

if [ -z "$ISSUE_NUMBER" ]; then
  echo "Nenhum número informado. Saindo." >&2
  exit 1
fi

# ── Busca detalhes da issue ──────────────────────────────────────────────────
echo ""
echo "  Buscando issue #$ISSUE_NUMBER..."

ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" --json number,title,body,labels,url)
ISSUE_TITLE=$(echo "$ISSUE_JSON" | jq -r '.title')
ISSUE_BODY=$(echo "$ISSUE_JSON"  | jq -r '.body')
ISSUE_LABELS=$(echo "$ISSUE_JSON" | jq -r '[.labels[].name] | join(", ")')
ISSUE_URL=$(echo "$ISSUE_JSON"   | jq -r '.url')

# ── Monta o prompt de contexto ───────────────────────────────────────────────
PROMPT="Estou desenvolvendo o **BiblEagles** — um PWA de leitura bíblica em família.

## Projeto
- **Repositório:** https://github.com/$REPO
- **PRD:** PRD.md (na raiz do repositório)
- **Design:** design/index.html (protótipo visual de todas as telas)

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- API.Bible (texto bíblico, 5k req/dia gratuito)
- OneSignal (notificações push)
- Vercel (hospedagem)

## Design system — Direção Papel
| Token | Valor |
|-------|-------|
| background | #f5efe4 (paper/creme) |
| canvas | #e8e0d4 |
| surface | #fbf7ef |
| border | #e6dac6 |
| card ativo | #2a2017 (espresso, destaque por contraste — sem borda lateral) |
| texto primário | #1c150e |
| texto secundário | #52442f |
| texto muted | #93826d |
| amarelo | #f1e6a0 (SOMENTE marcador de versículo no leitor) |
| UI font | Space Grotesk |
| verse font | Spectral (serif, 16px, line-height 1.8) |
| flat | sem sombra, sem emoji na UI |

## Versões da Bíblia suportadas
- PT: NVI (padrão), ARA, ACF, NVT
- EN: NIV, KJV, ESV
- ES: RVR1960, NVI-ES, DHH
- DE: LUT, SCH2000, ELB

## Idiomas da interface
PT, EN, ES, DE (detectado pelo dispositivo, sobrescrito no perfil)

---

## Issue #$ISSUE_NUMBER — $ISSUE_TITLE
**Labels:** $ISSUE_LABELS
**URL:** $ISSUE_URL

$ISSUE_BODY

---

Leia o PRD.md e o design/index.html antes de começar para ter o contexto completo. Depois implemente a issue acima."

# ── Inicia sessão Claude Code ─────────────────────────────────────────────────
echo ""
echo "  ══════════════════════════════════════════════════════════"
echo "  Issue #$ISSUE_NUMBER: $ISSUE_TITLE"
echo "  Iniciando sessão Claude Code..."
echo "  ══════════════════════════════════════════════════════════"
echo ""

claude "$PROMPT"

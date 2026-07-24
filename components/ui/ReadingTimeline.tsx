import { Avatar, AVATAR_PALETTE } from "@/components/ui/Avatar";

export interface ReadingTimelineMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** % de dias do plano inteiro que essa pessoa já leu — sua posição na linha. */
  percent: number;
  /** Atrasada em relação ao ritmo do plano até hoje — colore o anel do avatar (ou do grupo, se vários caírem juntos). */
  late: boolean;
}

interface ReadingTimelineProps {
  /** % de hoje na linha do tempo do plano (dia atual / total de dias) — preenche a linha até aqui. */
  percent: number;
  members: ReadingTimelineMember[];
  variant?: "dark" | "light";
}

const VARIANT_STYLES = {
  dark: { track: "bg-[#43382a]", fill: "bg-[#ece0c8]" },
  light: { track: "bg-[#e8dcc6]", fill: "bg-[#b3a48c]" },
} as const;

const STATUS_RING = { onTrack: "#8fa876", late: "#a45a29" } as const;
// Tom um pouco mais claro que o anel — mesma ideia de "verde/laranja", só ajustado pra
// legibilidade como texto em vez de contorno fino.
const STATUS_TEXT = { onTrack: "#a3b98a", late: "#dc9552" } as const;
// Cor neutra pro marcador "+N" (grupo), não é a cor de ninguém em particular — reaproveita
// a primeira cor da paleta de avatar em vez de introduzir mais uma cor no design system.
const CLUSTER_STYLE = AVATAR_PALETTE[0];

// "Ana e Kaio" / "Ana, Kaio e Pedro" — junção ao estilo PT em vez de vírgulas soltas.
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

// Clamp em px (via CSS clamp()), não só %, pra um avatar em 0% ou 100% não ficar com
// metade cortada fora do card — o miolo continua seguindo a % normalmente.
function clampedLeft(percent: number): string {
  const safe = Math.min(100, Math.max(0, percent));
  return `clamp(11px, ${safe}%, calc(100% - 11px))`;
}

const LINE_BOTTOM_PX = 15;
const LINE_HEIGHT_PX = 6;
const AVATAR_SIZE_PX = 22;
// Centraliza o avatar da base bem em cima da linha (linha passa atrás, pelo meio dele).
const BASE_AVATAR_BOTTOM_PX = LINE_BOTTOM_PX + LINE_HEIGHT_PX / 2 - AVATAR_SIZE_PX / 2;
const CONTAINER_HEIGHT_PX = BASE_AVATAR_BOTTOM_PX + AVATAR_SIZE_PX + 2;

// Onde cada pessoa da família está no plano inteiro (não só "leu hoje ou não") — a
// linha preenchida mostra o calendário até hoje, e cada avatar flutua centralizado bem
// em cima dela, na posição correspondente ao quanto essa pessoa já leu. Um anel colorido
// (verde = em dia, laranja = atrasada) marca o status de cada um.
export function ReadingTimeline({ percent, members, variant = "dark" }: ReadingTimelineProps) {
  const colors = VARIANT_STYLES[variant];
  const safePercent = Math.min(100, Math.max(0, percent));

  // Duas ou mais pessoas no mesmo % (ex.: mesmo tanto de dias lidos) cairiam exatamente
  // na mesma posição — em vez de empilhar avatares individuais, agrupa num marcador
  // "+N" só, cujo anel reflete o pior status do grupo (um atrasado já marca o grupo).
  const groups = new Map<number, ReadingTimelineMember[]>();
  for (const member of members) {
    const group = groups.get(member.percent);
    if (group) group.push(member);
    else groups.set(member.percent, [member]);
  }
  // Só os grupos de fato agrupados (2+) ganham legenda — quem tem posição própria já
  // se identifica pela própria bolinha, não precisa ser nomeado por escrito.
  const clusters = Array.from(groups.values()).filter((group) => group.length > 1);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" style={{ height: CONTAINER_HEIGHT_PX }}>
        <div
          className={`absolute left-0 right-0 rounded-full ${colors.track}`}
          style={{ bottom: LINE_BOTTOM_PX, height: LINE_HEIGHT_PX }}
        >
          <div className={`h-full rounded-full ${colors.fill}`} style={{ width: `${safePercent}%` }} />
        </div>

        {Array.from(groups.entries()).map(([groupPercent, group], index) => {
          const ringColor = group.some((member) => member.late) ? STATUS_RING.late : STATUS_RING.onTrack;

          return (
            <div
              key={group[0].id}
              className="absolute -translate-x-1/2"
              style={{ left: clampedLeft(groupPercent), bottom: BASE_AVATAR_BOTTOM_PX, zIndex: index + 1 }}
            >
              {group.length === 1 ? (
                <Avatar name={group[0].name} avatarUrl={group[0].avatarUrl} size="sm" borderColor={ringColor} />
              ) : (
                <div
                  title={group.map((member) => member.name).join(", ")}
                  className="flex shrink-0 items-center justify-center rounded-full font-sans text-[10px] font-semibold"
                  style={{
                    width: AVATAR_SIZE_PX,
                    height: AVATAR_SIZE_PX,
                    backgroundColor: CLUSTER_STYLE.bg,
                    color: CLUSTER_STYLE.text,
                    border: `2px solid ${ringColor}`,
                  }}
                >
                  +{group.length}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {clusters.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {clusters.map((group) => {
            const isLate = group.some((member) => member.late);
            return (
              <p
                key={group.map((member) => member.id).join("-")}
                className="text-[calc(11px*var(--font-scale))] font-semibold"
                style={{ color: isLate ? STATUS_TEXT.late : STATUS_TEXT.onTrack }}
              >
                {joinNames(group.map((member) => member.name))} · {isLate ? "atrasados" : "em dia"}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

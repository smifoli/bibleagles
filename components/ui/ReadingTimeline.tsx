import { Avatar } from "@/components/ui/Avatar";

export interface ReadingTimelineMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** % de dias do plano inteiro que essa pessoa já leu — sua posição na linha. */
  percent: number;
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

// Clamp em px (via CSS clamp()), não só %, pra um avatar em 0% ou 100% não ficar com
// metade cortada fora do card — o miolo continua seguindo a % normalmente.
function clampedLeft(percent: number): string {
  const safe = Math.min(100, Math.max(0, percent));
  return `clamp(11px, ${safe}%, calc(100% - 11px))`;
}

const AVATAR_ROW_HEIGHT_PX = 22;
const BASE_HEIGHT_PX = 42;

// Onde cada pessoa da família está no plano inteiro (não só "leu hoje ou não") — a
// linha preenchida mostra o calendário até hoje (como era antes), e cada avatar flutua
// centralizado bem em cima dela, na posição correspondente ao quanto essa pessoa já leu.
export function ReadingTimeline({ percent, members, variant = "dark" }: ReadingTimelineProps) {
  const colors = VARIANT_STYLES[variant];
  const safePercent = Math.min(100, Math.max(0, percent));

  // Duas pessoas com o mesmo % (ex.: mesmo tanto de dias lidos) cairiam exatamente na
  // mesma posição — sem isso, a segunda fica escondida atrás da primeira. Empilha
  // verticalmente quem colide, em vez de sobrepor.
  const countByPercent = new Map<number, number>();
  const stackIndexByMemberId = new Map<string, number>();
  for (const member of members) {
    const stackIndex = countByPercent.get(member.percent) ?? 0;
    stackIndexByMemberId.set(member.id, stackIndex);
    countByPercent.set(member.percent, stackIndex + 1);
  }
  const maxStack = Math.max(1, ...Array.from(countByPercent.values()));
  const containerHeight = BASE_HEIGHT_PX + (maxStack - 1) * AVATAR_ROW_HEIGHT_PX;

  return (
    // Tudo ancorado por `bottom` (não `top`): quando o container cresce pra caber gente
    // empilhada, a linha continua fixa perto da base em vez de se afastar da primeira
    // fileira de avatares conforme a altura aumenta.
    <div className="relative" style={{ height: containerHeight }}>
      <div className={`absolute bottom-[14px] left-0 right-0 h-[3px] rounded-full ${colors.track}`}>
        <div className={`h-full rounded-full ${colors.fill}`} style={{ width: `${safePercent}%` }} />
      </div>

      {members.map((member, index) => (
        <div
          key={member.id}
          className="absolute -translate-x-1/2"
          style={{
            left: clampedLeft(member.percent),
            bottom: 18 + (stackIndexByMemberId.get(member.id) ?? 0) * AVATAR_ROW_HEIGHT_PX,
            zIndex: index + 1,
          }}
        >
          <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
        </div>
      ))}
    </div>
  );
}

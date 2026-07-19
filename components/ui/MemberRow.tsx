import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";

export type MemberRowBadgeTone = "admin" | "member";

// design/index.html .role-admin / .role-member.
const BADGE_TONE_CLASSES: Record<MemberRowBadgeTone, string> = {
  admin: "bg-ink/10 text-ink",
  member: "bg-[#ece3d6] text-text-muted",
};

export interface MemberRowProps {
  name: string;
  /** Ex.: e-mail do membro, ou um resumo de progresso. */
  subtitle?: string;
  colorIndex?: number;
  badgeLabel?: string;
  badgeTone?: MemberRowBadgeTone;
  /** Conteúdo customizado à direita (ex.: progresso), substitui o badge quando fornecido. */
  trailing?: ReactNode;
}

// Componente genérico/apresentacional — dados vêm inteiramente via props, sem acoplamento a
// nenhum módulo de fetch específico. Baseado em design/index.html .member-row.
export function MemberRow({ name, subtitle, colorIndex, badgeLabel, badgeTone = "member", trailing }: MemberRowProps) {
  return (
    <div className="flex items-center gap-[11px] py-2.5">
      <Avatar name={name} colorIndex={colorIndex} size="md" />
      <div className="flex-1">
        <div className="text-[calc(14px*var(--font-scale))] font-semibold text-ink">{name}</div>
        {subtitle && <div className="text-[calc(11px*var(--font-scale))] text-text-muted">{subtitle}</div>}
      </div>
      {trailing ??
        (badgeLabel ? (
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[calc(10px*var(--font-scale))] font-semibold tracking-[0.5px] ${BADGE_TONE_CLASSES[badgeTone]}`}
          >
            {badgeLabel}
          </span>
        ) : null)}
    </div>
  );
}

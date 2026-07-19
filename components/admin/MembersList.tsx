import { MemberRow } from "@/components/admin/MemberRow";
import type { AdminMember } from "@/lib/admin-data";

// Mesmas cores de avatar usadas em components/package/PackageStatsView.tsx e
// no design/index.html (av-l / av-a / av-p), cicladas por índice.
const AVATAR_COLORS: { bg: string; text: string }[] = [
  { bg: "#b5723e", text: "#ffffff" },
  { bg: "#c98a52", text: "#ffffff" },
  { bg: "#3d3225", text: "#a08e78" },
];

export function MembersList({ members, currentUserId }: { members: AdminMember[]; currentUserId: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">Membros</div>
      <div className="flex flex-col rounded-[18px] border border-border bg-surface p-4">
        {members.length === 0 ? (
          <p className="text-[calc(14px*var(--font-scale))] text-text-muted">Nenhum membro encontrado.</p>
        ) : (
          members.map((member, index) => (
            <MemberRow
              key={member.id}
              member={member}
              avatarColor={AVATAR_COLORS[index % AVATAR_COLORS.length]}
              isFirst={index === 0}
              isSelf={member.id === currentUserId}
            />
          ))
        )}
      </div>
    </div>
  );
}

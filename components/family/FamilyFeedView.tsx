import Link from "next/link";
import { ActivityDeleteButton } from "@/components/activity/ActivityDeleteButton";
import { formatRelativeTime } from "@/lib/format";
import type { FamilyActivityItem } from "@/lib/family-data";
import { HIGHLIGHT_COLORS } from "@/lib/highlight-colors";

function describeActivity(item: FamilyActivityItem) {
  const reference = `${item.bookName} ${item.chapter}:${item.verse}`;
  const verb = item.kind === "highlight" ? "destacou" : "comentou em";
  return (
    <>
      <span className="font-medium text-text-primary">{item.userName}</span> {verb}{" "}
      <span className="text-link">{reference}</span>
    </>
  );
}

export function FamilyFeedView({
  items,
  currentUserId,
  isAdmin,
}: {
  items: FamilyActivityItem[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col gap-[17px]">
      <header>
        <div className="text-[calc(20px*var(--font-scale))] font-semibold text-text-primary">Família</div>
        <p className="mt-0.5 text-[calc(12px*var(--font-scale))] text-text-muted">Atividade de todos os membros, em ordem cronológica</p>
      </header>

      {items.length === 0 ? (
        <p className="text-[calc(14px*var(--font-scale))] text-text-muted">Nenhuma atividade da família ainda.</p>
      ) : (
        <div className="flex flex-col gap-[15px]">
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <Link
                href={`/read/${item.book}/${item.chapter}?version=${item.version}&verse=${item.verse}&from=${encodeURIComponent("/family")}`}
                className="flex flex-1 items-start gap-3"
              >
                <span
                  className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ backgroundColor: item.kind === "highlight" ? HIGHLIGHT_COLORS[item.color!].bg : "#c0ad94" }}
                />
                <div className="text-[calc(13px*var(--font-scale))] leading-[1.5] text-text-secondary">
                  {describeActivity(item)}
                  {item.kind === "comment" && (
                    <div className="mt-0.5 font-serif text-[calc(13px*var(--font-scale))] italic text-text-muted">&quot;{item.quote}&quot;</div>
                  )}
                  <div className="mt-px text-[calc(11px*var(--font-scale))] text-[#a3927d]">{formatRelativeTime(new Date(item.createdAt))}</div>
                </div>
              </Link>
              {(item.userId === currentUserId || isAdmin) && <ActivityDeleteButton kind={item.kind} id={item.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

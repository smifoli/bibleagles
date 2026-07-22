import Link from "next/link";
import { ActivityDeleteButton } from "@/components/activity/ActivityDeleteButton";
import type { ActivityItem } from "@/lib/home-data";
import { formatRelativeTime } from "@/lib/format";

function describeActivity(item: ActivityItem) {
  const reference = `${item.book} ${item.chapter}:${item.verse}`;
  const verb = item.kind === "highlight" ? "destacou" : "comentou em";
  return (
    <>
      <span className="font-medium text-text-primary">{item.userName}</span> {verb}{" "}
      <span className="text-link">{reference}</span>
    </>
  );
}

export function ActivityFeed({
  items,
  currentUserId,
  isAdmin,
}: {
  items: ActivityItem[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
          Atividade recente
        </span>
        <Link href="/family" className="text-[calc(12px*var(--font-scale))] text-link">
          Ver tudo
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-[calc(14px*var(--font-scale))] text-text-muted">Nenhuma atividade da família ainda.</p>
      ) : (
        <div className="flex flex-col gap-[15px]">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-start gap-3">
              <Link
                href={`/read/${item.book}/${item.chapter}?version=${item.version}&verse=${item.verse}&from=${encodeURIComponent("/")}`}
                className="flex flex-1 items-start gap-3"
              >
                <span
                  className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${
                    index === 0 ? "bg-ink" : "bg-[#c0ad94]"
                  }`}
                />
                <div className="text-[calc(13px*var(--font-scale))] leading-[1.5] text-text-secondary">
                  {describeActivity(item)}
                  {item.kind === "comment" && (
                    <div className="mt-0.5 font-serif text-[calc(13px*var(--font-scale))] italic text-text-muted">"{item.quote}"</div>
                  )}
                  <div className="mt-px text-[calc(11px*var(--font-scale))] text-[#a3927d]">
                    {formatRelativeTime(new Date(item.createdAt))}
                  </div>
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

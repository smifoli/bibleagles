import Link from "next/link";
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

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">
          Atividade recente
        </span>
        <Link href="/family" className="text-xs text-link">
          Ver tudo
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Nenhuma atividade da família ainda.</p>
      ) : (
        <div className="flex flex-col gap-[15px]">
          {items.map((item, index) => (
            <div key={item.id} className="flex items-start gap-3">
              <span
                className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${
                  index === 0 ? "bg-ink" : "bg-[#c0ad94]"
                }`}
              />
              <div className="text-[13px] leading-[1.5] text-text-secondary">
                {describeActivity(item)}
                {item.kind === "comment" ? (
                  <div className="mt-0.5 font-serif text-[13px] italic text-text-muted">"{item.quote}"</div>
                ) : (
                  <div className="mt-px text-[11px] text-[#a3927d]">
                    {formatRelativeTime(new Date(item.createdAt))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

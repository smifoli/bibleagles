import Link from "next/link";
import type { PackageCardData } from "@/lib/home-data";

export function SecondaryPackageCard({ card }: { card: PackageCardData }) {
  return (
    <Link
      href={`/package/${card.packageId}`}
      className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-[18px] transition-transform active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 text-[calc(9px*var(--font-scale))] font-semibold uppercase tracking-[1.5px] text-text-muted">
            {card.eyebrow}
          </div>
          <div className="text-[calc(18px*var(--font-scale))] font-semibold text-ink">{card.title}</div>
        </div>
        <span className="whitespace-nowrap rounded-full border border-[#e0d3bf] px-2.5 py-1 text-[calc(10px*var(--font-scale))] tracking-wide text-text-muted">
          Dia {card.dayNumber} / {card.totalDays}
        </span>
      </div>

      <div>
        <div className="mb-[9px] flex items-baseline justify-between">
          <span className="text-[calc(13px*var(--font-scale))] text-link">{card.chapterTitle}</span>
          <span className="text-[calc(13px*var(--font-scale))] font-semibold text-text-secondary">{card.percent}%</span>
        </div>
        <div className="h-[5px] rounded-full bg-[#e8dcc6]">
          <div className="h-full rounded-full bg-[#b3a48c]" style={{ width: `${card.percent}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[calc(11px*var(--font-scale))]">
          <span className="text-text-muted">{card.dateLabel}</span>
          {card.pendingCount === 0 ? (
            <span className="font-semibold text-[#5e7350]">Você está em dia</span>
          ) : (
            <span className="font-semibold text-error">
              {card.pendingCount} {card.pendingCount === 1 ? "capítulo pendente" : "capítulos pendentes"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

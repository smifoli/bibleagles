import type { PackageCardData } from "@/lib/home-data";

export function SecondaryPackageCard({ card }: { card: PackageCardData }) {
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-[18px]">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-[1.5px] text-text-muted">
            {card.eyebrow}
          </div>
          <div className="text-lg font-semibold text-ink">{card.title}</div>
        </div>
        <span className="whitespace-nowrap rounded-full border border-[#e0d3bf] px-2.5 py-1 text-[10px] tracking-wide text-text-muted">
          Dia {card.dayNumber} / {card.totalDays}
        </span>
      </div>

      <div>
        <div className="mb-[9px] flex items-baseline justify-between">
          <span className="text-[13px] text-link">{card.chapterTitle}</span>
          <span className="text-[13px] font-semibold text-text-secondary">{card.percent}%</span>
        </div>
        <div className="h-[5px] rounded-full bg-[#e8dcc6]">
          <div className="h-full rounded-full bg-[#b3a48c]" style={{ width: `${card.percent}%` }} />
        </div>
      </div>
    </div>
  );
}

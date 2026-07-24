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
          <div className="flex items-center gap-1.5">
            <span className="text-[calc(18px*var(--font-scale))] font-semibold text-ink">{card.title}</span>
            <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-ink">
              <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full border border-[#e0d3bf] px-2.5 py-1 text-[calc(10px*var(--font-scale))] tracking-wide text-text-muted">
          Dia {card.dayNumber} / {card.totalDays}
        </span>
      </div>

      <div>
        <div className="mb-[9px] flex items-start justify-between">
          <span className="text-[calc(13px*var(--font-scale))] text-link">
            {card.chapterTitle} · {card.dateLabel}
          </span>
          <div className="flex flex-col items-end">
            <span className="text-[calc(13px*var(--font-scale))] font-semibold text-text-secondary">{card.percent}%</span>
            <span className="text-[calc(8px*var(--font-scale))] font-semibold uppercase tracking-[0.5px] text-text-muted">
              linha do tempo
            </span>
          </div>
        </div>
        <div className="h-[5px] rounded-full bg-[#e8dcc6]">
          <div className="h-full rounded-full bg-[#b3a48c]" style={{ width: `${card.percent}%` }} />
        </div>
        <div className="mt-2 text-[calc(11px*var(--font-scale))]">
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

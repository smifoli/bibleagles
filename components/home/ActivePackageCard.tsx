import Link from "next/link";
import { ReadingTimeline } from "@/components/ui/ReadingTimeline";
import type { FeaturedPackageCardData } from "@/lib/home-data";

export function ActivePackageCard({ card }: { card: FeaturedPackageCardData }) {
  const readHref = card.firstPassage
    ? `/read/${card.firstPassage.book}/${card.firstPassage.chapter_start}?planDay=${card.planDayId}&from=${encodeURIComponent("/")}`
    : "/bible";

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-card-dark p-[18px]">
      <Link href={`/package/${card.packageId}`} className="flex flex-col gap-4 transition-transform active:scale-[0.98]">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 text-[calc(9px*var(--font-scale))] font-semibold uppercase tracking-[1.5px] text-[#a08e78]">
              {card.eyebrow}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[calc(18px*var(--font-scale))] font-semibold text-[#f7f1e6]">{card.title}</span>
              <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-[#f7f1e6]">
                <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-full border border-[#4a3d2c] px-2.5 py-1 text-[calc(10px*var(--font-scale))] tracking-wide text-[#cdbb9e]">
            Dia {card.dayNumber} / {card.totalDays}
          </span>
        </div>

        <div>
          <div className="mb-1 text-[calc(13px*var(--font-scale))] text-[#d8c9b3]">
            {card.chapterTitle} · {card.dateLabel}
          </div>
          <ReadingTimeline percent={card.percent} members={card.members} variant="dark" />
          <div className="text-[calc(11px*var(--font-scale))]">
            {card.pendingCount === 0 ? (
              <span className="font-semibold text-[#9fb389]">Você está em dia</span>
            ) : (
              <span className="font-semibold text-[#e2a08c]">
                {card.pendingCount} {card.pendingCount === 1 ? "capítulo pendente" : "capítulos pendentes"}
              </span>
            )}
          </div>
        </div>
      </Link>

      <Link
        href={readHref}
        className="self-end rounded-full bg-[#f3ebdc] px-[18px] py-2.5 text-[calc(12px*var(--font-scale))] font-semibold text-card-dark transition-transform active:scale-[0.96]"
      >
        Ler agora
      </Link>
    </div>
  );
}

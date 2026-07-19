import Link from "next/link";
import type { FeaturedPackageCardData } from "@/lib/home-data";

export function ActivePackageCard({ card }: { card: FeaturedPackageCardData }) {
  const readHref = card.firstPassage
    ? `/read/${card.firstPassage.book}/${card.firstPassage.chapter_start}?planDay=${card.planDayId}&from=${encodeURIComponent("/")}`
    : "/bible";

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-card-dark p-[18px]">
      <Link href={`/package/${card.packageId}`} className="flex items-start justify-between">
        <div>
          <div className="mb-1 text-[calc(9px*var(--font-scale))] font-semibold uppercase tracking-[1.5px] text-[#a08e78]">
            {card.eyebrow}
          </div>
          <div className="text-[calc(18px*var(--font-scale))] font-semibold text-[#f7f1e6]">{card.title}</div>
        </div>
        <span className="whitespace-nowrap rounded-full border border-[#4a3d2c] px-2.5 py-1 text-[calc(10px*var(--font-scale))] tracking-wide text-[#cdbb9e]">
          Dia {card.dayNumber} / {card.totalDays}
        </span>
      </Link>

      <Link href={`/package/${card.packageId}`}>
        <div className="mb-[9px] flex items-baseline justify-between">
          <span className="text-[calc(13px*var(--font-scale))] text-[#d8c9b3]">{card.chapterTitle}</span>
          <span className="text-[calc(13px*var(--font-scale))] font-semibold text-[#f7f1e6]">{card.percent}%</span>
        </div>
        <div className="h-[5px] rounded-full bg-[#43382a]">
          <div className="h-full rounded-full bg-[#ece0c8]" style={{ width: `${card.percent}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[calc(11px*var(--font-scale))]">
          <span className="text-[#a08e78]">{card.dateLabel}</span>
          {card.pendingCount === 0 ? (
            <span className="font-semibold text-[#9fb389]">Você está em dia</span>
          ) : (
            <span className="font-semibold text-[#e2a08c]">
              {card.pendingCount} {card.pendingCount === 1 ? "capítulo pendente" : "capítulos pendentes"}
            </span>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-between">
        <div className="flex">
          {card.members.map((member) => (
            <div
              key={member.id}
              title={member.name}
              className={`-ml-[7px] flex h-[27px] w-[27px] items-center justify-center rounded-full text-[calc(11px*var(--font-scale))] font-semibold first:ml-0 ${
                member.completed ? "bg-ink text-background" : "bg-[#e2d8c6] text-[#a08e78]"
              }`}
            >
              {member.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <Link
          href={readHref}
          className="rounded-full bg-[#f3ebdc] px-[18px] py-2.5 text-[calc(12px*var(--font-scale))] font-semibold text-card-dark"
        >
          Ler agora
        </Link>
      </div>
    </div>
  );
}

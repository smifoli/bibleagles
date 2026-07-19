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
          <div className="mb-1 text-[9px] font-semibold uppercase tracking-[1.5px] text-[#a08e78]">
            {card.eyebrow}
          </div>
          <div className="text-lg font-semibold text-[#f7f1e6]">{card.title}</div>
        </div>
        <span className="whitespace-nowrap rounded-full border border-[#4a3d2c] px-2.5 py-1 text-[10px] tracking-wide text-[#cdbb9e]">
          Dia {card.dayNumber} / {card.totalDays}
        </span>
      </Link>

      <Link href={`/package/${card.packageId}`}>
        <div className="mb-[9px] flex items-baseline justify-between">
          <span className="text-[13px] text-[#d8c9b3]">{card.chapterTitle}</span>
          <span className="text-[13px] font-semibold text-[#f7f1e6]">{card.percent}%</span>
        </div>
        <div className="h-[5px] rounded-full bg-[#43382a]">
          <div className="h-full rounded-full bg-[#ece0c8]" style={{ width: `${card.percent}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
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
              className={`-ml-[7px] flex h-[27px] w-[27px] items-center justify-center rounded-full text-[11px] font-semibold first:ml-0 ${
                member.completed ? "bg-ink text-background" : "bg-[#e2d8c6] text-[#a08e78]"
              }`}
            >
              {member.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
        <Link
          href={readHref}
          className="rounded-full bg-[#f3ebdc] px-[18px] py-2.5 text-xs font-semibold text-card-dark"
        >
          Ler agora
        </Link>
      </div>
    </div>
  );
}

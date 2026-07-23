"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { markPlanDayRead, unmarkPlanDayRead } from "@/lib/reader-actions";
import type { PackageDayItem, PackageMemberStat } from "@/lib/package-stats-data";

interface PackageDayListProps {
  days: PackageDayItem[];
  members: PackageMemberStat[];
  currentUserId: string;
  today: string;
  /** Destaca dias atrasados (data < hoje) em vermelho — só faz sentido na lista de pendentes. */
  highlightOverdue?: boolean;
}

export function PackageDayList({ days, members, currentUserId, today, highlightOverdue = false }: PackageDayListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle(day: PackageDayItem, isRead: boolean) {
    if (!day.firstPassageBook || day.firstPassageChapterStart === null) return;
    const book = day.firstPassageBook;
    const chapter = day.firstPassageChapterStart;
    startTransition(async () => {
      if (isRead) await unmarkPlanDayRead(book, chapter, day.id);
      else await markPlanDayRead(book, chapter, day.id);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {days.map((day) => {
        const isOverdue = highlightOverdue && day.date < today;

        return (
          <div
            key={day.id}
            className={`rounded-[14px] border p-3.5 ${isOverdue ? "border-[#e6c4be] bg-[rgba(160,58,42,0.05)]" : "border-border bg-surface"}`}
          >
            {day.readHref ? (
              // Sem prefetch: pacotes podem ter dezenas/centenas de dias — prefetch=true
              // default dispararia um RSC fetch dinâmico por link visível de uma vez (mesmo
              // problema encontrado na grade de capítulos, ver ChapterGridView.tsx).
              <Link href={day.readHref} prefetch={false} className="flex items-center justify-between gap-3">
                <DayInfo day={day} isOverdue={isOverdue} />
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[calc(11px*var(--font-scale))] font-semibold ${
                    isOverdue ? "bg-error text-background" : "bg-ink text-background"
                  }`}
                >
                  Ler →
                </span>
              </Link>
            ) : (
              <DayInfo day={day} isOverdue={isOverdue} />
            )}

            {members.length > 0 && (
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                {members.map((member, index) => {
                  const isRead = day.readByMemberIds.includes(member.id);
                  const isMe = member.id === currentUserId;

                  return (
                    <button
                      key={member.id}
                      type="button"
                      disabled={!isMe || pending || !day.firstPassageBook}
                      onClick={isMe ? () => handleToggle(day, isRead) : undefined}
                      aria-label={`${member.name}${isRead ? " leu" : " não leu"}${isMe ? " · toque pra alternar" : ""}`}
                      className={`relative ${isMe ? "" : "cursor-default"}`}
                    >
                      <Avatar name={member.name} avatarUrl={member.avatarUrl} colorIndex={index} size="sm" />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[8px] font-bold leading-none ${
                          isRead ? "border-[#5c8a52] bg-[#5c8a52] text-white" : "border-[#c0ad94] bg-surface text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DayInfo({ day, isOverdue }: { day: PackageDayItem; isOverdue: boolean }) {
  return (
    <div className="min-w-0">
      <div className={`truncate text-[calc(13px*var(--font-scale))] font-semibold ${isOverdue ? "text-error" : "text-ink"}`}>{day.title}</div>
      <div className={`mt-0.5 text-[calc(11px*var(--font-scale))] ${isOverdue ? "text-error/80" : "text-text-muted"}`}>
        {day.dateLabel}
        {day.passageLabel ? ` · ${day.passageLabel}` : ""}
        {isOverdue ? " · atrasado" : ""}
      </div>
    </div>
  );
}

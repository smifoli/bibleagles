import Link from "next/link";
import type { BibleVersion } from "@/lib/bible-versions";
import type { ChapterActivity } from "@/lib/bible-nav-data";
import { VersionSelect } from "@/components/bible-nav/VersionSelect";

interface ChapterGridViewProps {
  bookId: string;
  bookName: string;
  chapterCount: number;
  version: string;
  versions: BibleVersion[];
  chapterActivity: [number, ChapterActivity][];
}

export function ChapterGridView({ bookId, bookName, chapterCount, version, versions, chapterActivity }: ChapterGridViewProps) {
  const activity = new Map(chapterActivity);
  const chapters = Array.from({ length: chapterCount }, (_, index) => index + 1);

  return (
    <div className="flex min-h-dvh flex-col gap-[17px]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/bible" aria-label="Voltar" className="text-[calc(18px*var(--font-scale))] text-text-muted">
            ←
          </Link>
          <div className="text-[calc(17px*var(--font-scale))] font-semibold text-text-primary">{bookName}</div>
        </div>
        <VersionSelect version={version} versions={versions} />
      </header>

      <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">Capítulos</div>

      <div className="grid grid-cols-5 gap-2">
        {chapters.map((chapter) => {
          const { commentCount = 0, highlightCount = 0, isRead = false } = activity.get(chapter) ?? {};
          const hasActivity = commentCount > 0 || highlightCount > 0;

          return (
            <Link
              key={chapter}
              href={`/read/${bookId}/${chapter}?version=${version}&from=${encodeURIComponent(`/bible/${bookId}`)}`}
              className={
                hasActivity
                  ? "relative flex flex-col items-center justify-center gap-0.5 rounded-[14px] border border-[#b3a48c] bg-background py-3 text-[calc(14px*var(--font-scale))] font-semibold text-text-primary"
                  : "relative flex flex-col items-center justify-center gap-0.5 rounded-[14px] border border-border bg-surface py-3 text-[calc(14px*var(--font-scale))] font-semibold text-text-primary"
              }
            >
              {isRead && (
                <span
                  aria-label="Lido"
                  className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#5c8a52] text-[8px] font-bold leading-none text-white"
                >
                  ✓
                </span>
              )}
              {chapter}
              {hasActivity && (
                <span className="text-[calc(9px*var(--font-scale))] font-semibold text-[#7d6c58]">
                  {[commentCount > 0 ? `${commentCount}c` : null, highlightCount > 0 ? `${highlightCount}d` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import Link from "next/link";
import type { BibleVersion } from "@/lib/bible-versions";
import { VersionSelect } from "@/components/bible-nav/VersionSelect";

interface ChapterGridViewProps {
  bookId: string;
  bookName: string;
  chapterCount: number;
  version: string;
  versions: BibleVersion[];
  activeChapters: number[];
}

export function ChapterGridView({ bookId, bookName, chapterCount, version, versions, activeChapters }: ChapterGridViewProps) {
  const active = new Set(activeChapters);
  const chapters = Array.from({ length: chapterCount }, (_, index) => index + 1);

  return (
    <div className="flex min-h-full flex-col gap-[17px]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/bible" aria-label="Voltar" className="text-lg text-text-muted">
            ←
          </Link>
          <div className="text-[17px] font-semibold text-text-primary">{bookName}</div>
        </div>
        <VersionSelect version={version} versions={versions} />
      </header>

      <div className="text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">Capítulos</div>

      <div className="grid grid-cols-5 gap-2">
        {chapters.map((chapter) => (
          <Link
            key={chapter}
            href={`/read/${bookId}/${chapter}?version=${version}`}
            className={
              active.has(chapter)
                ? "flex items-center justify-center rounded-[14px] border border-[#b3a48c] bg-background py-3 text-sm font-semibold text-text-primary"
                : "flex items-center justify-center rounded-[14px] border border-border bg-surface py-3 text-sm font-semibold text-text-primary"
            }
          >
            {chapter}
          </Link>
        ))}
      </div>
    </div>
  );
}

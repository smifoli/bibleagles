"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { BibleVersion } from "@/lib/bible-versions";
import { markAllChaptersRead, unmarkAllChaptersRead } from "@/lib/chapter-grid-actions";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string>();
  const activity = new Map(chapterActivity);
  const chapters = Array.from({ length: chapterCount }, (_, index) => index + 1);

  const readCount = chapters.filter((chapter) => activity.get(chapter)?.isRead).length;
  const allRead = readCount === chapterCount;
  const someRead = readCount > 0;

  function handleMarkAllRead() {
    if (!window.confirm(`Marcar todos os ${chapterCount} capítulos de ${bookName} como lidos?`)) return;
    setActionError(undefined);
    startTransition(async () => {
      const result = await markAllChaptersRead(bookId, chapterCount);
      if (result.error) setActionError(result.error);
      else router.refresh();
    });
  }

  function handleUnmarkAllRead() {
    if (!window.confirm(`Remover a marcação de lido de todos os capítulos de ${bookName}?`)) return;
    setActionError(undefined);
    startTransition(async () => {
      const result = await unmarkAllChaptersRead(bookId);
      if (result.error) setActionError(result.error);
      else router.refresh();
    });
  }

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

      {(!allRead || someRead) && (
        <div className="flex items-center gap-2.5">
          {!allRead && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={pending}
              className="flex-1 rounded-[13px] border border-input-border py-2.5 text-center text-[calc(12px*var(--font-scale))] font-semibold text-text-secondary transition-transform active:scale-95 disabled:opacity-50"
            >
              Marcar tudo como lido
            </button>
          )}
          {someRead && (
            <button
              type="button"
              onClick={handleUnmarkAllRead}
              disabled={pending}
              className="flex-1 rounded-[13px] border border-input-border py-2.5 text-center text-[calc(12px*var(--font-scale))] font-semibold text-error transition-transform active:scale-95 disabled:opacity-50"
            >
              Remover leituras
            </button>
          )}
        </div>
      )}

      {actionError && <p className="text-[calc(12px*var(--font-scale))] text-error">{actionError}</p>}

      <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">Capítulos</div>

      <div className="grid grid-cols-5 gap-2">
        {chapters.map((chapter) => {
          const { commentCount = 0, highlightCount = 0, isRead = false } = activity.get(chapter) ?? {};
          const hasActivity = commentCount > 0 || highlightCount > 0;

          return (
            <Link
              key={chapter}
              href={`/read/${bookId}/${chapter}?version=${version}&from=${encodeURIComponent(`/bible/${bookId}`)}`}
              // Sem prefetch: livros têm até 21+ links nessa grade (Salmos, 150) — o Next
              // prefetch=true default dispararia um RSC fetch dinâmico (Supabase) por link
              // visível de uma vez, sobrecarregando o servidor a ponto de derrubar essas
              // requisições com 503 — e como o clique real reusa a promise do prefetch já
              // falho, a navegação trava (medido: 7s+ sem navegar) em vez de só ficar lenta.
              prefetch={false}
              className={`transition-transform active:scale-[0.94] ${
                hasActivity
                  ? "relative flex flex-col items-center justify-center gap-0.5 rounded-[14px] border border-[#b3a48c] bg-background py-3 text-[calc(14px*var(--font-scale))] font-semibold text-text-primary"
                  : "relative flex flex-col items-center justify-center gap-0.5 rounded-[14px] border border-border bg-surface py-3 text-[calc(14px*var(--font-scale))] font-semibold text-text-primary"
              }`}
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

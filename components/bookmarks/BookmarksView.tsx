"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelativeTime } from "@/lib/format";
import { HIGHLIGHT_COLOR_ORDER, HIGHLIGHT_COLORS } from "@/lib/highlight-colors";
import type { BookmarksData, HighlightComment, HighlightGroupEntry, HighlightMark } from "@/lib/bookmarks-data";
import type { HighlightColor } from "@/types/database";

type ColorFilter = HighlightColor | "all";

interface BookmarksViewProps extends BookmarksData {
  currentUserId: string;
}

export function BookmarksView({ groups, books, people, currentUserId }: BookmarksViewProps) {
  const [personFilter, setPersonFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<ColorFilter>("all");
  const [bookFilter, setBookFilter] = useState<string>("all");

  const otherPeople = useMemo(() => people.filter((person) => person.id !== currentUserId), [people, currentUserId]);

  const visible = useMemo(() => {
    return groups
      .map((group) => {
        const highlights: HighlightMark[] =
          personFilter === "all" ? group.highlights : group.highlights.filter((mark) => mark.userId === personFilter);
        const comments: HighlightComment[] =
          personFilter === "all" ? group.comments : group.comments.filter((comment) => comment.userId === personFilter);
        return { group, highlights, comments };
      })
      .filter(({ group, highlights, comments }) => {
        if (highlights.length === 0 && comments.length === 0) return false;
        if (colorFilter !== "all" && !highlights.some((mark) => mark.color === colorFilter)) return false;
        if (bookFilter !== "all" && group.book !== bookFilter) return false;
        return true;
      });
  }, [groups, personFilter, colorFilter, bookFilter]);

  return (
    <div className="flex min-h-full flex-col gap-[17px]">
      <header>
        <div className="text-[20px] font-semibold text-text-primary">Destaques</div>
        <p className="mt-0.5 text-xs text-text-muted">
          {groups.length} {groups.length === 1 ? "versículo com atividade" : "versículos com atividade"}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => setPersonFilter("all")}
          className={
            personFilter === "all"
              ? "rounded-full bg-ink px-4 py-2 text-xs font-semibold text-background"
              : "rounded-full border border-[#e0d3bf] px-4 py-2 text-xs font-semibold text-text-muted"
          }
        >
          Todos
        </button>
        <button
          onClick={() => setPersonFilter(personFilter === currentUserId ? "all" : currentUserId)}
          className={
            personFilter === currentUserId
              ? "rounded-full bg-ink px-4 py-2 text-xs font-semibold text-background"
              : "rounded-full border border-[#e0d3bf] px-4 py-2 text-xs font-semibold text-text-muted"
          }
        >
          Meus
        </button>
        {otherPeople.map((person) => (
          <button
            key={person.id}
            onClick={() => setPersonFilter(personFilter === person.id ? "all" : person.id)}
            className={
              personFilter === person.id
                ? "rounded-full bg-ink px-4 py-2 text-xs font-semibold text-background"
                : "rounded-full border border-[#e0d3bf] px-4 py-2 text-xs font-semibold text-text-muted"
            }
          >
            {person.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setColorFilter("all")}
          className={
            colorFilter === "all"
              ? "rounded-full bg-ink px-4 py-2 text-xs font-semibold text-background"
              : "rounded-full border border-[#e0d3bf] px-4 py-2 text-xs font-semibold text-text-muted"
          }
        >
          Todas as cores
        </button>
        {HIGHLIGHT_COLOR_ORDER.map((color) => (
          <button
            key={color}
            onClick={() => setColorFilter(colorFilter === color ? "all" : color)}
            aria-label={color}
            aria-pressed={colorFilter === color}
            className="h-7 w-7 shrink-0 rounded-full"
            style={{
              backgroundColor: HIGHLIGHT_COLORS[color].bg,
              outline: colorFilter === color ? "1.5px solid #2c2218" : "1.5px solid transparent",
              outlineOffset: "2px",
            }}
          />
        ))}
      </div>

      {books.length > 0 && (
        <select
          value={bookFilter}
          onChange={(event) => setBookFilter(event.target.value)}
          className="rounded-[10px] border border-border bg-surface px-[13px] py-2.5 text-[13px] text-ink"
        >
          <option value="all">Todos os livros</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.name}
            </option>
          ))}
        </select>
      )}

      {visible.length === 0 ? (
        <p className="text-sm text-text-muted">
          {groups.length === 0 ? "Nenhum destaque ainda." : "Nenhum destaque com esse filtro."}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map(({ group, highlights, comments }) => {
            const latestComment = comments[0];
            const extraComments = comments.length - 1;
            const participants = new Map<string, HighlightMark | HighlightComment>([
              ...highlights.map((mark) => [mark.userId, mark] as const),
              ...comments.map((comment) => [comment.userId, comment] as const),
            ]);

            return (
              <Link
                key={`${group.book}-${group.chapter}-${group.verse}`}
                href={`/read/${group.book}/${group.chapter}?version=${group.version}&verse=${group.verse}&from=${encodeURIComponent("/bookmarks")}`}
                className="flex items-start gap-3 rounded-[14px] border border-border bg-surface p-[13px]"
              >
                <div className="mt-0.5 flex -space-x-1.5">
                  {Array.from(participants.values())
                    .slice(0, 4)
                    .map((participant) => (
                      <Avatar
                        key={participant.userId}
                        name={participant.userName}
                        colorIndex={participant.colorIndex}
                        size="sm"
                        className="border border-surface"
                      />
                    ))}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[13px] font-semibold text-text-primary">
                      {group.bookName} {group.chapter}:{group.verse}
                    </span>
                    <span className="shrink-0 text-[10px] text-text-muted">
                      {formatRelativeTime(new Date(group.mostRecentAt))}
                    </span>
                  </div>

                  {group.verseText && (
                    <div className="mt-0.5 truncate font-serif text-[13px] italic text-text-secondary">
                      {group.verseText}
                    </div>
                  )}

                  {highlights.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {highlights.map((mark) => (
                        <span
                          key={mark.userId}
                          className="h-[9px] w-[9px] shrink-0 rounded-full"
                          style={{ backgroundColor: HIGHLIGHT_COLORS[mark.color].bg }}
                          title={mark.userName}
                        />
                      ))}
                    </div>
                  )}

                  {latestComment && (
                    <div className="mt-1.5 text-[12px] text-text-secondary">
                      <span className="font-semibold text-text-primary">{latestComment.userName}: </span>
                      <span className="italic">{latestComment.content}</span>
                      {extraComments > 0 && (
                        <span className="text-text-muted"> · +{extraComments} {extraComments === 1 ? "comentário" : "comentários"}</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatRelativeTime } from "@/lib/format";
import { HIGHLIGHT_COLOR_ORDER, HIGHLIGHT_COLORS } from "@/lib/highlight-colors";
import type { BookmarksData } from "@/lib/bookmarks-data";
import type { HighlightColor } from "@/types/database";

type ColorFilter = HighlightColor | "all";

export function BookmarksView({ bookmarks, books }: BookmarksData) {
  const [colorFilter, setColorFilter] = useState<ColorFilter>("all");
  const [bookFilter, setBookFilter] = useState<string>("all");

  const filtered = useMemo(
    () =>
      bookmarks.filter(
        (bookmark) =>
          (colorFilter === "all" || bookmark.color === colorFilter) &&
          (bookFilter === "all" || bookmark.book === bookFilter)
      ),
    [bookmarks, colorFilter, bookFilter]
  );

  return (
    <div className="flex min-h-full flex-col gap-[17px]">
      <header>
        <div className="text-[20px] font-semibold text-text-primary">Meus destaques</div>
        <p className="mt-0.5 text-xs text-text-muted">
          {bookmarks.length} {bookmarks.length === 1 ? "versículo destacado" : "versículos destacados"}
        </p>
      </header>

      <div className="flex items-center gap-2.5">
        <button
          onClick={() => setColorFilter("all")}
          className={
            colorFilter === "all"
              ? "rounded-full bg-ink px-4 py-2 text-xs font-semibold text-background"
              : "rounded-full border border-[#e0d3bf] px-4 py-2 text-xs font-semibold text-text-muted"
          }
        >
          Todas
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

      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted">
          {bookmarks.length === 0 ? "Nenhum destaque ainda." : "Nenhum destaque com esse filtro."}
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((bookmark) => (
            <Link
              key={bookmark.id}
              href={`/read/${bookmark.book}/${bookmark.chapter}?version=${bookmark.version}&verse=${bookmark.verse}`}
              className="flex items-start gap-3 rounded-[14px] border border-border bg-surface p-[13px]"
            >
              <span
                className="mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full"
                style={{ backgroundColor: HIGHLIGHT_COLORS[bookmark.color].bg }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-text-primary">
                    {bookmark.bookName} {bookmark.chapter}:{bookmark.verse}
                  </span>
                  <span className="shrink-0 text-[10px] text-text-muted">
                    {formatRelativeTime(new Date(bookmark.createdAt))}
                  </span>
                </div>
                {bookmark.verseText && (
                  <div className="mt-0.5 truncate font-serif text-[13px] italic text-text-secondary">
                    {bookmark.verseText}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

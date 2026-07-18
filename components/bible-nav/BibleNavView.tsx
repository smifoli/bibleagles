"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { parseReference, resolveBook, suggestBooks } from "@/lib/bible-books";
import type { BibleNavData } from "@/lib/bible-nav-data";
import type { BibleVersion } from "@/lib/bible-versions";
import { VersionSelect } from "@/components/bible-nav/VersionSelect";

interface BibleNavViewProps {
  version: string;
  versions: BibleVersion[];
  nav: BibleNavData;
}

type Testament = "AT" | "NT";

export function BibleNavView({ version, versions, nav }: BibleNavViewProps) {
  const router = useRouter();
  const [testament, setTestament] = useState<Testament>("NT");
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => suggestBooks(query), [query]);
  const sections = testament === "AT" ? nav.oldTestament : nav.newTestament;

  function goToBook(bookId: string) {
    router.push(`/bible/${bookId}?version=${version}`);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;

    const parsed = parseReference(query);
    if (parsed) {
      const params = new URLSearchParams({ version });
      if (parsed.verseStart) params.set("verse", String(parsed.verseStart));
      router.push(`/read/${parsed.book}/${parsed.chapter}?${params.toString()}`);
      return;
    }

    const bookId = resolveBook(query);
    if (bookId) goToBook(bookId);
  }

  return (
    <div className="flex min-h-full flex-col gap-[17px]">
      <header className="flex items-center justify-between">
        <div className="text-[20px] font-semibold text-text-primary">Bíblia</div>
        <VersionSelect version={version} versions={versions} />
      </header>

      <div className="relative">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Buscar referência — João 3:16"
          className="w-full rounded-[10px] border border-border bg-surface px-[13px] py-2.5 text-[13px] text-ink placeholder:text-text-muted"
        />
        {suggestions.length > 0 && query && (
          <div className="absolute inset-x-0 top-full z-10 mt-1.5 flex flex-col overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => goToBook(suggestion.id)}
                className="px-[13px] py-2.5 text-left text-[13px] text-ink hover:bg-background"
              >
                {suggestion.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTestament("AT")}
          className={
            testament === "AT"
              ? "rounded-full bg-ink px-5 py-2 text-xs font-semibold text-background"
              : "rounded-full border border-[#e0d3bf] px-5 py-2 text-xs font-semibold text-text-muted"
          }
        >
          Antigo
        </button>
        <button
          onClick={() => setTestament("NT")}
          className={
            testament === "NT"
              ? "rounded-full bg-ink px-5 py-2 text-xs font-semibold text-background"
              : "rounded-full border border-[#e0d3bf] px-5 py-2 text-xs font-semibold text-text-muted"
          }
        >
          Novo Testamento
        </button>
      </div>

      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">{section.label}</div>
          <div className="grid grid-cols-2 gap-2">
            {section.books.map((book) => {
              const hasActivity = book.commentCount > 0 || book.highlightCount > 0;
              return (
                <button
                  key={book.id}
                  onClick={() => goToBook(book.id)}
                  className={
                    hasActivity
                      ? "rounded-[14px] border border-[#b3a48c] bg-background p-[13px] text-left"
                      : "rounded-[14px] border border-border bg-surface p-[13px] text-left"
                  }
                >
                  <div className="text-sm font-semibold text-text-primary">{book.name}</div>
                  <div className="mt-0.5 text-[11px] text-text-muted">{book.chapterCount} capítulos</div>
                  {hasActivity && (
                    <div className="mt-[7px] text-[11px] text-[#7d6c58]">
                      {[
                        book.commentCount > 0 ? `${book.commentCount} ${book.commentCount === 1 ? "comentário" : "comentários"}` : null,
                        book.highlightCount > 0 ? `${book.highlightCount} ${book.highlightCount === 1 ? "destaque" : "destaques"}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

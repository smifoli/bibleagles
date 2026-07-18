"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { BibleVersion } from "@/lib/bible-versions";
import { formatRelativeTime } from "@/lib/format";
import { HIGHLIGHT_COLOR_ORDER, HIGHLIGHT_COLORS } from "@/lib/highlight-colors";
import { addComment, markPlanDayRead, toggleHighlight } from "@/lib/reader-actions";
import type { ReaderData } from "@/lib/reader-data";
import type { HighlightColor } from "@/types/database";

const FONT_SIZES = { sm: "14px", md: "16px", lg: "19px" } as const;
type FontSize = keyof typeof FONT_SIZES;

interface ReaderViewProps {
  book: string;
  chapter: number;
  version: string;
  versions: BibleVersion[];
  data: ReaderData;
  initialVerse?: number;
}

export function ReaderView({ book, chapter, version, versions, data, initialVerse }: ReaderViewProps) {
  const router = useRouter();
  const [fontSize, setFontSize] = useState<FontSize>("md");
  const [openVerse, setOpenVerse] = useState<number | null>(initialVerse ?? null);
  const [commentDraft, setCommentDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string>();

  // Veio de uma busca por referência (/bible) com verso específico — rola até ele.
  useEffect(() => {
    if (!initialVerse) return;
    document.getElementById(`verse-${initialVerse}`)?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openVerseData = data.verses.find((verse) => verse.number === openVerse) ?? null;
  const bookName = data.reference.split(" ").slice(0, -1).join(" ") || data.reference;
  // O "voltar" aponta pro lugar que faz sentido na hierarquia (pai lógico), não pro
  // histórico do navegador — trocar versão/fonte empilha entradas no histórico, então
  // router.back() levaria pro estado anterior desta mesma tela, não pra tela anterior.
  const parentHref = data.planContext ? "/" : `/bible/${book}?version=${version}`;

  function handleVersionChange(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("version", next);
    router.push(`${url.pathname}${url.search}`);
  }

  function handleSelectColor(color: HighlightColor) {
    if (openVerse === null) return;
    setActionError(undefined);
    startTransition(async () => {
      const result = await toggleHighlight(book, chapter, openVerse, version, color);
      if (result.error) setActionError(result.error);
      else router.refresh();
    });
  }

  function handleSubmitComment() {
    if (openVerse === null) return;
    setActionError(undefined);
    startTransition(async () => {
      const result = await addComment(book, chapter, openVerse, version, commentDraft);
      if (result.error) setActionError(result.error);
      else {
        setCommentDraft("");
        router.refresh();
      }
    });
  }

  function handleMarkAsRead() {
    if (!data.planContext) return;
    setActionError(undefined);
    startTransition(async () => {
      const result = await markPlanDayRead(book, chapter, data.planContext!.planDayId);
      if (result.error) setActionError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex min-h-full flex-col gap-[17px]">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={parentHref} aria-label="Voltar" className="text-lg text-text-muted">
            ←
          </Link>
          <div>
            <div className="text-[17px] font-semibold text-text-primary">{data.reference}</div>
            {data.planContext && (
              <div className="text-[11px] text-text-muted">
                Lendo {data.planContext.packageTitle} · Dia {data.planContext.dayNumber}
              </div>
            )}
          </div>
        </div>
        <select
          value={version}
          onChange={(event) => handleVersionChange(event.target.value)}
          className="rounded-full border border-[#d4c5ac] bg-transparent px-3 py-1.5 text-[11px] font-semibold text-ink"
        >
          {versions.map((item) => (
            <option key={item.abbreviation} value={item.abbreviation}>
              {item.abbreviation}
            </option>
          ))}
        </select>
      </header>

      <div className="flex items-center gap-2">
        {(["sm", "md", "lg"] as const).map((size) => (
          <button
            key={size}
            onClick={() => setFontSize(size)}
            className={
              fontSize === size
                ? "rounded-lg bg-ink px-[9px] py-1 text-[13px] font-semibold text-background"
                : `rounded-lg border border-input-border px-[9px] py-1 font-semibold text-text-muted ${size === "lg" ? "text-[15px]" : "text-[11px]"}`
            }
          >
            {size === "sm" ? "A−" : size === "md" ? "A" : "A+"}
          </button>
        ))}
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-1">
        {data.verses.map((verse) => {
          const style = verse.highlight?.style;
          return (
            <div
              key={verse.number}
              id={`verse-${verse.number}`}
              onClick={() => setOpenVerse(verse.number === openVerse ? null : verse.number)}
              role="button"
              tabIndex={0}
              style={{
                fontSize: FONT_SIZES[fontSize],
                backgroundColor: style?.bg,
                color: style?.text ?? "#52442f",
                borderRadius: style ? "10px" : undefined,
                padding: style ? "11px 14px" : "7px 2px",
              }}
              className="cursor-pointer font-serif leading-[1.8]"
            >
              <sup className="mr-[5px] font-sans text-[10px] font-semibold" style={{ color: style?.verseNum ?? "#a3927d" }}>
                {verse.number}
              </sup>
              {verse.text}
              {verse.commentCount > 0 && (
                <span className="ml-1.5 font-sans text-[10px] font-semibold" style={{ color: style ? style.verseNum : "#a3927d" }}>
                  · {verse.commentCount} {verse.commentCount === 1 ? "comentário" : "comentários"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {openVerseData && (
        <div className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">
              {bookName} {chapter}:{openVerseData.number}
            </span>
            {openVerseData.highlight && openVerseData.highlight.markedByNames.length > 0 && (
              <span className="text-[11px] text-text-muted">marcado por {openVerseData.highlight.markedByNames.join(", ")}</span>
            )}
          </div>

          <div>
            <div className="mb-[9px] text-[9px] font-semibold uppercase tracking-[1.5px] text-text-muted">Cor do destaque</div>
            <div className="flex gap-2.5">
              {HIGHLIGHT_COLOR_ORDER.map((color) => (
                <button
                  key={color}
                  onClick={() => handleSelectColor(color)}
                  disabled={pending}
                  aria-label={color}
                  className="h-6 w-6 rounded-full"
                  style={{
                    backgroundColor: HIGHLIGHT_COLORS[color].bg,
                    outline: openVerseData.highlight?.ownColor === color ? "1.5px solid #2c2218" : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {(data.commentsByVerse[openVerseData.number] ?? []).length > 0 && <div className="h-px bg-border" />}

          {(data.commentsByVerse[openVerseData.number] ?? []).map((comment) => (
            <div key={comment.id} className="flex items-start gap-[11px]">
              <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#c98a52] text-[10px] font-semibold text-white">
                {comment.userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-[7px]">
                  <span className="text-xs font-semibold text-ink">{comment.userName}</span>
                  <span className="text-[10px] text-text-muted">{formatRelativeTime(new Date(comment.createdAt))}</span>
                </div>
                <div className="mt-0.5 font-serif text-sm text-text-secondary">{comment.content}</div>
              </div>
            </div>
          ))}

          <textarea
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            placeholder="Escreva um comentário..."
            rows={2}
            className="rounded-[10px] border border-input-border bg-background p-2.5 text-sm text-ink"
          />
          {actionError && <p className="text-xs text-error">{actionError}</p>}
          <button
            onClick={handleSubmitComment}
            disabled={pending}
            className="w-full rounded-full bg-[#efe7d8] py-2.5 text-xs font-semibold text-ink"
          >
            Comentar
          </button>
        </div>
      )}

      {data.planContext && (
        <button
          onClick={handleMarkAsRead}
          disabled={pending || data.planContext.alreadyCompleted}
          className="mt-auto w-full rounded-[13px] bg-ink py-[15px] text-[13px] font-semibold text-background disabled:opacity-60"
        >
          {data.planContext.alreadyCompleted ? "Lido hoje" : "Marcar como lido"}
        </button>
      )}
    </div>
  );
}

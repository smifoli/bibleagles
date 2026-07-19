"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { BibleVersion } from "@/lib/bible-versions";
import { formatRelativeTime } from "@/lib/format";
import { HIGHLIGHT_COLOR_ORDER, HIGHLIGHT_COLORS } from "@/lib/highlight-colors";
import { clampVerseFontSize, VERSE_FONT_MAX, VERSE_FONT_MIN, VERSE_FONT_SIZE_COOKIE, VERSE_FONT_STEP } from "@/lib/font-size";
import { LAST_READ_COOKIE } from "@/lib/last-read";
import { updatePreferences } from "@/lib/profile-actions";
import { addComment, deleteComment, editComment, markPlanDayRead, toggleCommentLike, toggleHighlight } from "@/lib/reader-actions";
import type { ReaderComment, ReaderData } from "@/lib/reader-data";
import type { HighlightColor } from "@/types/database";

interface ReaderViewProps {
  book: string;
  chapter: number;
  version: string;
  versions: BibleVersion[];
  data: ReaderData;
  initialVerse?: number;
  initialVerseFontSize: number;
  backPath?: string;
  prevHref: string | null;
  nextHref: string | null;
}

export function ReaderView({
  book,
  chapter,
  version,
  versions,
  data,
  initialVerse,
  initialVerseFontSize,
  backPath,
  prevHref,
  nextHref,
}: ReaderViewProps) {
  const router = useRouter();
  const [verseFontSize, setVerseFontSize] = useState(initialVerseFontSize);
  const [openVerse, setOpenVerse] = useState<number | null>(initialVerse ?? null);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string>();

  // Veio de uma busca por referência (/bible) com verso específico — rola até ele.
  useEffect(() => {
    if (!initialVerse) return;
    document.getElementById(`verse-${initialVerse}`)?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lembra o último capítulo aberto — o BottomNav usa isso pra "Bíblia" voltar
  // pra cá em vez de reiniciar na lista de livros, se o usuário navegar pra
  // outra aba e voltar.
  useEffect(() => {
    document.cookie = `${LAST_READ_COOKIE}=${encodeURIComponent(`/read/${book}/${chapter}?version=${version}`)}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }, [book, chapter, version]);

  const bookName = data.reference.split(" ").slice(0, -1).join(" ") || data.reference;
  // O "voltar" aponta pro lugar que faz sentido na hierarquia (pai lógico), não pro
  // histórico do navegador — trocar versão/fonte empilha entradas no histórico, então
  // router.back() levaria pro estado anterior desta mesma tela, não pra tela anterior.
  // `backPath` (query "from") vem de onde o usuário realmente entrou no leitor — home,
  // grade de capítulos, pacote, marcas, família — e usa sempre a versão ATUAL (não a de
  // quando entrou), pra trocar de versão no leitor não "voltar" pra uma versão antiga.
  const parentHref = backPath
    ? backPath.startsWith("/bible")
      ? `${backPath}?version=${version}`
      : backPath
    : data.planContext
      ? "/"
      : `/bible/${book}?version=${version}`;

  function handleVersionChange(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("version", next);

    // Trocar a versão no leitor vira o novo padrão do usuário até ele trocar de
    // novo (mesma ação que o seletor de versão em /profile já persiste). A
    // server action precisa terminar (e seu refresh automático da rota atual
    // resolver) ANTES do router.push — se disparados juntos, o refresh da
    // action pode vencer a corrida e sobrescrever a navegação com a versão
    // antiga (URL muda mas conteúdo/seletor ficam presos na versão anterior).
    const nextVersion = versions.find((item) => item.abbreviation === next);
    startTransition(async () => {
      if (nextVersion) {
        await updatePreferences(next, nextVersion.language);
      }
      router.push(`${url.pathname}${url.search}`);
    });
  }

  // Preferência de dispositivo — grava direto num cookie (sem ida ao
  // servidor) pra não pesar cada clique, e persiste entre capítulos/sessões.
  function applyVerseFontSize(next: number) {
    const clamped = clampVerseFontSize(next);
    setVerseFontSize(clamped);
    document.cookie = `${VERSE_FONT_SIZE_COOKIE}=${clamped}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }

  function handleDecreaseFont() {
    applyVerseFontSize(verseFontSize - VERSE_FONT_STEP);
  }

  function handleIncreaseFont() {
    applyVerseFontSize(verseFontSize + VERSE_FONT_STEP);
  }

  function handleSelectColor(verseNumber: number, color: HighlightColor, currentColor: HighlightColor | null) {
    setActionError(undefined);
    startTransition(async () => {
      const result = await toggleHighlight(book, chapter, verseNumber, version, color, currentColor);
      if (result.error) setActionError(result.error);
      else router.refresh();
    });
  }

  function handleSubmitComment(verseNumber: number) {
    setActionError(undefined);
    startTransition(async () => {
      const result = await addComment(book, chapter, verseNumber, version, commentDraft);
      if (result.error) setActionError(result.error);
      else {
        setCommentDraft("");
        router.refresh();
      }
    });
  }

  function handleToggleReply(commentId: string) {
    setActionError(undefined);
    setReplyDraft("");
    setReplyingTo((current) => (current === commentId ? null : commentId));
  }

  function handleSubmitReply(verseNumber: number, parentId: string) {
    setActionError(undefined);
    startTransition(async () => {
      const result = await addComment(book, chapter, verseNumber, version, replyDraft, parentId);
      if (result.error) setActionError(result.error);
      else {
        setReplyDraft("");
        setReplyingTo(null);
        router.refresh();
      }
    });
  }

  function handleStartEdit(comment: ReaderComment) {
    setActionError(undefined);
    setEditDraft(comment.content);
    setEditingId(comment.id);
  }

  function handleSaveEdit(commentId: string) {
    setActionError(undefined);
    startTransition(async () => {
      const result = await editComment(book, chapter, commentId, editDraft);
      if (result.error) setActionError(result.error);
      else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function handleDeleteComment(commentId: string) {
    setActionError(undefined);
    startTransition(async () => {
      const result = await deleteComment(book, chapter, commentId);
      if (result.error) setActionError(result.error);
      else router.refresh();
    });
  }

  function handleToggleLike(commentId: string, likedByMe: boolean) {
    setActionError(undefined);
    startTransition(async () => {
      const result = await toggleCommentLike(book, chapter, commentId, likedByMe);
      if (result.error) setActionError(result.error);
      else router.refresh();
    });
  }

  function renderComment(comment: ReaderComment, verseNumber: number, isReply: boolean) {
    const isEditing = editingId === comment.id;

    return (
      <div key={comment.id} className={`flex items-start gap-[11px] ${isReply ? "mt-3 pl-[15px]" : ""}`}>
        <div
          className={`flex shrink-0 items-center justify-center rounded-full bg-[#c98a52] text-[calc(10px*var(--font-scale))] font-semibold text-white ${
            isReply ? "h-[22px] w-[22px]" : "h-[26px] w-[26px]"
          }`}
        >
          {comment.userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline gap-[7px]">
            <span className="text-[calc(12px*var(--font-scale))] font-semibold text-ink">{comment.userName}</span>
            <span className="text-[calc(10px*var(--font-scale))] text-text-muted">{formatRelativeTime(new Date(comment.createdAt))}</span>
            {comment.isEdited && <span className="text-[calc(10px*var(--font-scale))] text-text-muted">· editado</span>}
          </div>

          {isEditing ? (
            <div className="mt-1 flex flex-col gap-1.5">
              <textarea
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value)}
                rows={2}
                className="rounded-[10px] border border-input-border bg-background p-2.5 text-[calc(14px*var(--font-scale))] text-ink"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSaveEdit(comment.id)}
                  disabled={pending}
                  className="text-[calc(11px*var(--font-scale))] font-semibold text-ink"
                >
                  Salvar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  disabled={pending}
                  className="text-[calc(11px*var(--font-scale))] font-semibold text-text-muted"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-0.5 font-serif text-[calc(14px*var(--font-scale))] text-text-secondary">{comment.content}</div>
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  onClick={() => handleToggleLike(comment.id, comment.likedByMe)}
                  disabled={pending}
                  className="flex items-center gap-1"
                >
                  <span className={`text-[calc(14px*var(--font-scale))] ${comment.likedByMe ? "text-error" : "text-text-muted"}`}>
                    {comment.likedByMe ? "♥" : "♡"}
                  </span>
                  {comment.likeCount > 0 && (
                    <span className={`text-[calc(11px*var(--font-scale))] font-semibold ${comment.likedByMe ? "text-error" : "text-text-muted"}`}>
                      {comment.likeCount}
                    </span>
                  )}
                </button>
                {!isReply && (
                  <button
                    onClick={() => handleToggleReply(comment.id)}
                    disabled={pending}
                    className="text-[calc(11px*var(--font-scale))] font-semibold text-text-muted"
                  >
                    Responder
                  </button>
                )}
                {comment.isOwn && (
                  <button
                    onClick={() => handleStartEdit(comment)}
                    disabled={pending}
                    className="text-[calc(11px*var(--font-scale))] font-semibold text-text-muted"
                  >
                    Editar
                  </button>
                )}
                {(comment.isOwn || data.isAdmin) && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    disabled={pending}
                    className="text-[calc(11px*var(--font-scale))] font-semibold text-text-muted"
                  >
                    Apagar
                  </button>
                )}
              </div>
            </>
          )}

          {comment.replies.map((reply) => renderComment(reply, verseNumber, true))}

          {!isReply && replyingTo === comment.id && (
            <div className="mt-2.5 flex flex-col gap-1.5 pl-[15px]">
              <textarea
                value={replyDraft}
                onChange={(event) => setReplyDraft(event.target.value)}
                placeholder={`Responder a ${comment.userName}...`}
                rows={2}
                autoFocus
                className="rounded-[10px] border border-input-border bg-background p-2.5 text-[calc(14px*var(--font-scale))] text-ink"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSubmitReply(verseNumber, comment.id)}
                  disabled={pending}
                  className="text-[calc(11px*var(--font-scale))] font-semibold text-ink"
                >
                  Responder
                </button>
                <button
                  onClick={() => handleToggleReply(comment.id)}
                  disabled={pending}
                  className="text-[calc(11px*var(--font-scale))] font-semibold text-text-muted"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
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
          <Link href={parentHref} aria-label="Voltar" className="text-[calc(18px*var(--font-scale))] text-text-muted">
            ←
          </Link>
          <div>
            <div className="text-[calc(17px*var(--font-scale))] font-semibold text-text-primary">{data.reference}</div>
            {data.planContext && (
              <div className="text-[calc(11px*var(--font-scale))] text-text-muted">
                Lendo {data.planContext.packageTitle} · Dia {data.planContext.dayNumber}
              </div>
            )}
          </div>
        </div>
        <select
          value={version}
          onChange={(event) => handleVersionChange(event.target.value)}
          className="rounded-full border border-[#d4c5ac] bg-transparent px-3 py-1.5 text-[calc(11px*var(--font-scale))] font-semibold text-ink"
        >
          {versions.map((item) => (
            <option key={item.abbreviation} value={item.abbreviation}>
              {item.abbreviation}
            </option>
          ))}
        </select>
      </header>

      <div className="flex items-center gap-2.5">
        <button
          onClick={handleDecreaseFont}
          disabled={verseFontSize <= VERSE_FONT_MIN}
          aria-label="Diminuir letra"
          className="rounded-lg border border-input-border px-[9px] py-1 text-[calc(11px*var(--font-scale))] font-semibold text-text-muted disabled:opacity-40"
        >
          A−
        </button>
        <span className="text-[calc(11px*var(--font-scale))] text-text-muted">{verseFontSize}px</span>
        <button
          onClick={handleIncreaseFont}
          disabled={verseFontSize >= VERSE_FONT_MAX}
          aria-label="Aumentar letra"
          className="rounded-lg border border-input-border px-[9px] py-1 text-[calc(15px*var(--font-scale))] font-semibold text-text-muted disabled:opacity-40"
        >
          A+
        </button>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-1">
        {data.verses.map((verse) => {
          const style = verse.highlight?.style;
          const isOpen = verse.number === openVerse;
          const comments = data.commentsByVerse[verse.number] ?? [];

          return (
            <div key={verse.number}>
              <div
                id={`verse-${verse.number}`}
                onClick={() => {
                  setOpenVerse(isOpen ? null : verse.number);
                  setReplyingTo(null);
                  setEditingId(null);
                }}
                role="button"
                tabIndex={0}
                style={{
                  fontSize: `${verseFontSize}px`,
                  backgroundColor: style?.bg,
                  color: style?.text ?? "#52442f",
                  borderRadius: style ? "10px" : undefined,
                  padding: style ? "11px 14px" : "7px 2px",
                }}
                className="cursor-pointer font-serif leading-[1.8]"
              >
                <sup className="mr-[5px] font-sans text-[calc(10px*var(--font-scale))] font-semibold" style={{ color: style?.verseNum ?? "#a3927d" }}>
                  {verse.number}
                </sup>
                {verse.text}
                {verse.commentCount > 0 && (
                  <span className="ml-1.5 font-sans text-[calc(14px*var(--font-scale))] font-semibold" style={{ color: style ? style.verseNum : "#a3927d" }}>
                    · {verse.commentCount} {verse.commentCount === 1 ? "comentário" : "comentários"}
                  </span>
                )}
              </div>

              {isOpen && (
                <div className="mt-1 flex flex-col gap-3.5 rounded-[18px] border border-border bg-surface p-4">
                  <span className="text-[calc(12px*var(--font-scale))] font-semibold text-ink">
                    {bookName} {chapter}:{verse.number}
                  </span>

                  {comments.length > 0 && <div className="h-px bg-border" />}

                  {comments.map((comment) => renderComment(comment, verse.number, false))}

                  <textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Escreva um comentário..."
                    rows={2}
                    className="rounded-[10px] border border-input-border bg-background p-2.5 text-[calc(14px*var(--font-scale))] text-ink"
                  />
                  {actionError && <p className="text-[calc(12px*var(--font-scale))] text-error">{actionError}</p>}
                  <button
                    onClick={() => handleSubmitComment(verse.number)}
                    disabled={pending}
                    className="w-full rounded-full bg-[#efe7d8] py-2.5 text-[calc(12px*var(--font-scale))] font-semibold text-ink"
                  >
                    Comentar
                  </button>

                  <div className="h-px bg-border" />

                  <div>
                    <div className="mb-[9px] flex items-baseline justify-between">
                      <span className="text-[calc(9px*var(--font-scale))] font-semibold uppercase tracking-[1.5px] text-text-muted">Cor do destaque</span>
                      {verse.highlight?.ownColor && <span className="text-[calc(12px*var(--font-scale))] text-text-muted">toque de novo pra remover</span>}
                    </div>
                    <div className="flex gap-2.5">
                      {HIGHLIGHT_COLOR_ORDER.map((color) => (
                        <button
                          key={color}
                          onClick={() => handleSelectColor(verse.number, color, verse.highlight?.ownColor ?? null)}
                          disabled={pending}
                          aria-label={color}
                          className="h-6 w-6 rounded-full"
                          style={{
                            backgroundColor: HIGHLIGHT_COLORS[color].bg,
                            outline: verse.highlight?.ownColor === color ? "1.5px solid #2c2218" : undefined,
                          }}
                        />
                      ))}
                    </div>
                    {verse.highlight && verse.highlight.markedBy.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
                        {verse.highlight.markedBy.map((mark, index) => (
                          <span key={`${mark.name}-${index}`} className="flex items-center gap-1 text-[calc(14px*var(--font-scale))] text-text-muted">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: HIGHLIGHT_COLORS[mark.color].bg }}
                            />
                            {mark.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href={prevHref ?? "#"}
          aria-disabled={!prevHref}
          className={`flex-1 rounded-[13px] border border-input-border py-3 text-center text-[calc(12px*var(--font-scale))] font-semibold ${
            prevHref ? "text-text-secondary" : "pointer-events-none text-text-muted opacity-40"
          }`}
        >
          ← Anterior
        </Link>
        <Link
          href={nextHref ?? "#"}
          aria-disabled={!nextHref}
          className={`flex-1 rounded-[13px] border border-input-border py-3 text-center text-[calc(12px*var(--font-scale))] font-semibold ${
            nextHref ? "text-text-secondary" : "pointer-events-none text-text-muted opacity-40"
          }`}
        >
          Próximo →
        </Link>
      </div>

      {data.planContext && (
        <button
          onClick={handleMarkAsRead}
          disabled={pending || data.planContext.alreadyCompleted}
          className="mt-auto w-full rounded-[13px] bg-ink py-[15px] text-[calc(13px*var(--font-scale))] font-semibold text-background disabled:opacity-60"
        >
          {data.planContext.alreadyCompleted ? "Já lido" : "Marcar como lido"}
        </button>
      )}
    </div>
  );
}

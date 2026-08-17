"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { getBookMeta, NEW_TESTAMENT_SECTIONS, OLD_TESTAMENT_SECTIONS } from "@/lib/bible-books";
import { LANGUAGE_LABELS, type BibleVersion } from "@/lib/bible-versions";
import { formatRelativeTime } from "@/lib/format";
import { HIGHLIGHT_COLOR_ORDER, HIGHLIGHT_COLORS } from "@/lib/highlight-colors";
import {
  clampVerseFontSize,
  VERSE_FONT_FAMILY_COOKIE,
  VERSE_FONT_FAMILY_OPTIONS,
  VERSE_FONT_MAX,
  VERSE_FONT_MIN,
  VERSE_FONT_SIZE_COOKIE,
  VERSE_FONT_STEP,
  type VerseFontFamily,
} from "@/lib/font-size";
import { LAST_READ_COOKIE } from "@/lib/last-read";
import { updatePreferences } from "@/lib/profile-actions";
import {
  addComment,
  deleteComment,
  editComment,
  markChapterRead,
  markPlanDayRead,
  toggleCommentLike,
  toggleHighlight,
  unmarkChapterRead,
  unmarkPlanDayRead,
} from "@/lib/reader-actions";
import type { ReaderComment, ReaderData } from "@/lib/reader-data";
import type { HighlightColor } from "@/types/database";

// Seta do seletor livro/capítulo (ver BookChapterBar) — aponta pra baixo fechado,
// vira de cabeça pra baixo aberto. Mesmo idioma visual do "+" que gira 45° no
// overview de engajamento (chapterOverviewOpen), só que com um chevron de verdade.
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      style={{ width: "calc(13px * var(--font-scale))", height: "calc(13px * var(--font-scale))" }}
      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// "N comentários" e "N destaques" ficam cada um numa unidade que não quebra
// linha no meio (whitespace-nowrap) — se precisar quebrar por falta de espaço,
// quebra entre as duas partes, nunca entre o número e a palavra.
function EngagementBreakdown({ commentCount, highlightCount }: { commentCount: number; highlightCount: number }) {
  return (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-x-1 text-right text-[calc(11px*var(--font-scale))] text-text-muted">
      {commentCount > 0 && (
        <span className="whitespace-nowrap">
          {commentCount} {commentCount === 1 ? "comentário" : "comentários"}
          {highlightCount > 0 && ","}
        </span>
      )}
      {highlightCount > 0 && (
        <span className="whitespace-nowrap">
          {highlightCount} {highlightCount === 1 ? "destaque" : "destaques"}
        </span>
      )}
    </span>
  );
}

interface ReaderViewProps {
  book: string;
  chapter: number;
  version: string;
  versions: BibleVersion[];
  data: ReaderData;
  initialVerse?: number;
  initialScrollVerse?: number;
  initialVerseFontSize: number;
  initialVerseFontFamily: VerseFontFamily;
  backPath?: string;
  prevHref: string | null;
  nextHref: string | null;
  /** Total de capítulos do livro atual (nesta versão) — alcance do grid do seletor de capítulo. */
  bookChapterCount: number;
}

export function ReaderView({
  book,
  chapter,
  version,
  versions,
  data,
  initialVerse,
  initialScrollVerse,
  initialVerseFontSize,
  initialVerseFontFamily,
  backPath,
  prevHref,
  nextHref,
  bookChapterCount,
}: ReaderViewProps) {
  const router = useRouter();
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  // Verso que estava no topo da tela no instante em que "Versão" ou "Aa" foi
  // aberto — capturado uma única vez, na abertura (nunca de novo enquanto o
  // painel segue aberto, nem ao trocar de fato a versão/fonte). Fica fixo ali
  // até o painel fechar (clique fora ou no próprio botão de novo), quando os
  // efeitos abaixo consomem o valor pra devolver a rolagem pra esse verso.
  const pinnedVerseRef = useRef<number | null>(null);
  // Altura real da barra fixa (livro/capítulo/versão/Aa) — cresce quando um
  // seletor está aberto (ex.: painel "Aa" com A−/A+ e tipos de letra). Sem
  // descontar essa altura, topVisibleVerse() pegaria um verso escondido atrás
  // do painel aberto como se fosse o topo visível — daí o "voltar" a cada toque.
  const stickyBarRef = useRef<HTMLDivElement | null>(null);
  const [verseFontSize, setVerseFontSize] = useState(initialVerseFontSize);
  const [verseFontFamily, setVerseFontFamily] = useState(initialVerseFontFamily);
  const [openVerse, setOpenVerse] = useState<number | null>(initialVerse ?? null);
  const [chapterOverviewOpen, setChapterOverviewOpen] = useState(false);
  const [picker, setPicker] = useState<"book" | "chapter" | "version" | "settings" | null>(null);
  const pickerPanelRef = useRef<HTMLDivElement | null>(null);
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string>();
  // Espelha data.isChapterRead localmente pra virar o check/botão no instante do toque, sem
  // esperar a viagem de rede da server action + o router.refresh() que sincroniza `data`
  // depois — reconciliada pelo efeito abaixo sempre que `data` for de fato atualizado.
  const [isReadOptimistic, setIsReadOptimistic] = useState(data.isChapterRead);
  useEffect(() => {
    setIsReadOptimistic(data.isChapterRead);
  }, [data.isChapterRead]);

  // Veio de uma busca por referência (/bible), destaques, ou atividade da família
  // com verso específico — rola até ele e abre o painel. Sem isso, mas com um
  // verso salvo de uma visita anterior a este capítulo (initialScrollVerse), só
  // rola até lá, sem abrir o painel — é retomar a leitura, não focar num verso.
  useEffect(() => {
    const target = initialVerse ?? initialScrollVerse;
    if (!target) return;
    document.getElementById(`verse-${target}`)?.scrollIntoView({ block: initialVerse ? "center" : "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reaproveitado tanto pelo cookie de "último lido" (efeito logo abaixo) quanto
  // pra fixar a posição de leitura ao abrir "Versão"/"Aa" (ver pinnedVerseRef
  // mais abaixo) — o verso cuja parte de baixo ainda não passou do topo da tela
  // é o que a pessoa está "olhando agora".
  function topVisibleVerse(): number {
    // A barra fixa pode estar mais alta que 0 (seletor aberto) — um verso com
    // bottom>0 mas ainda escondido atrás dela não conta como "visível".
    const topBoundary = stickyBarRef.current?.getBoundingClientRect().bottom ?? 0;
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[id^="verse-"]'));
    const visible = elements.find((element) => element.getBoundingClientRect().bottom > topBoundary);
    return visible ? Number(visible.id.slice("verse-".length)) : 1;
  }

  // Rola até o verso ficar logo abaixo da barra fixa — não em y=0, que pode estar
  // debaixo dela (compacta ou com um seletor aberto, tanto faz). Usado tanto pra
  // "voltar pro mesmo verso" depois de trocar versão quanto durante os ajustes de
  // tamanho/tipo de letra no painel "Aa" (ver useLayoutEffect abaixo).
  function scrollVerseJustBelowBar(verseNumber: number) {
    const verseEl = document.getElementById(`verse-${verseNumber}`);
    if (!verseEl) return;
    const barHeight = stickyBarRef.current?.getBoundingClientRect().height ?? 0;
    const targetY = window.scrollY + verseEl.getBoundingClientRect().top - barHeight;
    window.scrollTo({ top: Math.max(0, targetY) });
  }

  // Lembra o último capítulo E verso — o BottomNav usa isso pra "Bíblia" voltar
  // pra cá (em vez de reiniciar na lista de livros) e retomar de onde parou, se
  // o usuário navegar pra outra aba e voltar. Atualiza a cada scroll (rAF-throttled)
  // pra sempre refletir o verso mais recente visível no topo, não só o de quando
  // o capítulo foi aberto.
  useEffect(() => {
    let rafId: number | null = null;

    function writeCookie() {
      const path = `/read/${book}/${chapter}?version=${version}&v=${topVisibleVerse()}`;
      document.cookie = `${LAST_READ_COOKIE}=${encodeURIComponent(path)}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }

    function onScroll() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        writeCookie();
      });
    }

    writeCookie();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [book, chapter, version]);

  const bookName = data.reference.split(" ").slice(0, -1).join(" ") || data.reference;
  // O "voltar" aponta pro lugar que faz sentido na hierarquia (pai lógico), não pro
  // histórico do navegador — trocar versão/fonte empilha entradas no histórico, então
  // router.back() levaria pro estado anterior desta mesma tela, não pra tela anterior.
  // `backPath` (query "from") vem de onde o usuário realmente entrou no leitor — home,
  // grade de capítulos, pacote, marcas, família — e usa sempre a versão ATUAL (não a de
  // quando entrou), pra trocar de versão no leitor não "voltar" pra uma versão antiga.
  // Sem backPath (ex.: aba "Bíblia" pulando pro último capítulo lido via cookie), o
  // fallback é sempre a grade de capítulos — NÃO dá pra usar data.planContext aqui pra
  // decidir "veio da home": esse contexto é detectado de forma orgânica (ver
  // getActivePlanContextForChapter em lib/reader-data.ts) e vale pra qualquer capítulo
  // que bata com um plano ativo, mesmo fora do fluxo "Leitura de hoje".
  const parentHref = backPath
    ? backPath.startsWith("/bible")
      ? `${backPath}?version=${version}`
      : backPath
    : `/bible/${book}?version=${version}`;

  // Seletor livro/capítulo da barra fixa (ver BookChapterBar mais abaixo): pula
  // direto pro capítulo escolhido sem sair da tela de leitura. Preserva `from`
  // igual buildChapterHref (page.tsx) faz pro anterior/próximo, pra "voltar"
  // continuar apontando pro mesmo lugar depois do salto.
  function navigateToChapter(targetBook: string, targetChapter: number) {
    const params = new URLSearchParams({ version });
    if (backPath) params.set("from", backPath);
    setPicker(null);
    router.push(`/read/${targetBook}/${targetChapter}?${params.toString()}`);
  }

  // Ao abrir o seletor, rola até o livro/capítulo/versão atual dentro do painel —
  // evita que a pessoa precise caçar manualmente entre 66 livros ou dezenas de
  // capítulos. Calcula o scrollTop na mão em vez de current.scrollIntoView():
  // scrollIntoView cascateia pros ancestrais scrolláveis, e a janela é um deles
  // — arrastava a página inteira (e os versos por baixo) toda vez que abria.
  // useLayoutEffect pra já nascer na posição certa, sem flash da rolagem padrão.
  useLayoutEffect(() => {
    if (!picker) return;
    const panel = pickerPanelRef.current;
    const current = panel?.querySelector<HTMLElement>('[data-current="true"]');
    if (!panel || !current) return;
    const target = current.offsetTop - panel.clientHeight / 2 + current.clientHeight / 2;
    panel.scrollTo({ top: Math.max(0, target) });
  }, [picker]);

  // Clicar fora da barra/painel fecha o seletor aberto — mesmo gatilho de "fechar"
  // que tocar de novo no botão, então o efeito abaixo (que devolve a rolagem pro
  // verso fixado) dispara igual nos dois casos.
  useEffect(() => {
    if (!picker) return;
    function handlePointerDown(event: PointerEvent) {
      if (!stickyBarRef.current?.contains(event.target as Node)) setPicker(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [picker]);

  // "Versão"/"Aa" fechando (clique fora ou no próprio botão) encolhe a barra de
  // volta ao tamanho compacto — o que por si só já desloca os versos, então
  // corrige rolando de volta pro verso fixado na abertura (pinnedVerseRef).
  // `pending`: se fechou porque uma versão foi escolhida, uma navegação está em
  // andamento — quem cuida da rolagem final é o efeito de `data` mais abaixo
  // (só ele sabe quando o capítulo novo realmente chegou); agir aqui também
  // consumiria pinnedVerseRef cedo demais, antes desse efeito ter a chance.
  // useLayoutEffect (não useEffect) pra corrigir antes do navegador pintar o
  // frame de painel fechado — senão dava pra ver o verso subir e descer num piscar.
  useLayoutEffect(() => {
    if (picker !== null || pending || pinnedVerseRef.current === null) return;
    scrollVerseJustBelowBar(pinnedVerseRef.current);
    pinnedVerseRef.current = null;
  }, [picker, pending]);

  function handleVersionChange(next: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("version", next);

    // Não captura pinnedVerseRef aqui — já foi capturada uma vez, ao abrir o
    // botão "Versão" (ver botão mais abaixo). O efeito de `data` logo adiante
    // usa esse mesmo valor assim que o capítulo na nova versão chegar, em vez
    // de deixar a navegação (que troca só o texto, não o capítulo) jogar a
    // tela pro topo.

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
      // scroll: false — o efeito de `data` abaixo é quem decide pra onde rolar
      // (o verso guardado em pinnedVerseRef), não o comportamento padrão do
      // router de subir a página pro topo a cada navegação.
      router.push(`${url.pathname}${url.search}`, { scroll: false });
    });
  }

  // Assim que o capítulo na nova versão chega (data muda de fato — não dispara
  // à toa em re-renders normais, já que `data` só muda com uma navegação real),
  // rola de volta pro verso fixado ao abrir "Versão". Ignora o primeiro render
  // (pinnedVerseRef começa null) e qualquer outra causa de re-render que não
  // tenha passado por lá.
  useEffect(() => {
    if (pinnedVerseRef.current === null) return;
    scrollVerseJustBelowBar(pinnedVerseRef.current);
    pinnedVerseRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Preferência de dispositivo — grava direto num cookie (sem ida ao
  // servidor) pra não pesar cada clique, e persiste entre capítulos/sessões.
  // Não mexe em pinnedVerseRef: a âncora é capturada uma única vez, ao abrir o
  // painel "Aa" (ver botão mais abaixo) — recapturar a cada A−/A+ seria pegar
  // uma posição que já tinha acabado de ser corrigida pelo ajuste anterior, e
  // qualquer imprecisão nessa correção ia se acumulando a cada toque.
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

  function applyVerseFontFamily(next: VerseFontFamily) {
    setVerseFontFamily(next);
    document.cookie = `${VERSE_FONT_FAMILY_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }

  // Tamanho/tipo de letra reflow o texto todo na hora (mesma página, sem navegação)
  // — sem isso, a posição em pixels ficaria igual mas o verso ali embaixo teria
  // mudado (texto anterior cresceu/encolheu). useLayoutEffect pra corrigir antes
  // do navegador pintar o frame, sem o pulo visual de um scroll depois do fato.
  // Não zera pinnedVerseRef aqui — o painel "Aa" pode ficar aberto pra vários
  // ajustes seguidos, todos voltando pro mesmo verso fixado na abertura; só zera
  // quando o painel fecha (ver efeito de [picker, pending] mais acima).
  useLayoutEffect(() => {
    if (pinnedVerseRef.current === null) return;
    scrollVerseJustBelowBar(pinnedVerseRef.current);
  }, [verseFontSize, verseFontFamily]);

  const verseFontStack = VERSE_FONT_FAMILY_OPTIONS.find((option) => option.key === verseFontFamily)?.stack;

  const versionsByLanguage = new Map<BibleVersion["language"], BibleVersion[]>();
  for (const item of versions) {
    const list = versionsByLanguage.get(item.language) ?? [];
    list.push(item);
    versionsByLanguage.set(item.language, list);
  }

  // Navegação por gesto: arrasta pra direita volta um capítulo, pra
  // esquerda avança — só dispara se o gesto for majoritariamente horizontal,
  // rápido (um "flick") e não pra não brigar com o scroll vertical da
  // página nem com a seleção de texto (que é um arrasto lento e demorado).
  const SWIPE_THRESHOLD_PX = 60;
  const SWIPE_MAX_DURATION_MS = 400;

  function handleTouchStart(event: React.TouchEvent) {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    // Se o usuário está selecionando texto, o toque terminou em seleção —
    // não interpreta como swipe de navegação.
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    const elapsed = Date.now() - start.time;
    if (elapsed > SWIPE_MAX_DURATION_MS) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;

    if (deltaX > 0 && prevHref) router.push(prevHref);
    else if (deltaX < 0 && nextHref) router.push(nextHref);
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
        <Avatar name={comment.userName} avatarUrl={comment.avatarUrl} colorIndex={1} size={isReply ? "sm" : "md"} />
        <div className="flex-1">
          <div className="flex items-baseline gap-[7px]">
            <span className="text-[calc(12px*var(--font-scale))] font-semibold text-ink">{comment.userName}</span>
            <span className="text-[calc(10px*var(--font-scale))] text-text-muted">{formatRelativeTime(new Date(comment.createdAt))}</span>
            {comment.isEdited && <span className="text-[calc(10px*var(--font-scale))] text-text-muted">· editado</span>}
          </div>

          {isEditing ? (
            <div className="mt-1 flex flex-col gap-1.5">
              <AutoResizeTextarea
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value)}
                rows={2}
                autoFocus
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
              <AutoResizeTextarea
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

  // Pular do detalhe do overview do capítulo direto pro verso — abre o painel dele
  // (mesmo comportamento de chegar aqui via link com initialVerse) e rola até lá.
  function handleJumpToVerse(verseNumber: number) {
    setOpenVerse(verseNumber);
    setReplyingTo(null);
    setEditingId(null);
    document.getElementById(`verse-${verseNumber}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  // Com planContext, marcar/desmarcar afeta o dia do plano inteiro (todas as
  // passagens dele, não só esse capítulo). Sem plano cobrindo esse capítulo,
  // vira uma leitura livre — só esse (book, chapter), ver markChapterRead.
  function handleMarkAsRead() {
    setActionError(undefined);
    setIsReadOptimistic(true);
    startTransition(async () => {
      const result = data.planContext ? await markPlanDayRead(book, chapter, data.planContext.planDayId) : await markChapterRead(book, chapter);
      if (result.error) {
        setIsReadOptimistic(false);
        setActionError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleUnmarkAsRead() {
    setActionError(undefined);
    setIsReadOptimistic(false);
    startTransition(async () => {
      const result = data.planContext
        ? await unmarkPlanDayRead(book, chapter, data.planContext.planDayId)
        : await unmarkChapterRead(book, chapter);
      if (result.error) {
        setIsReadOptimistic(true);
        setActionError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div
      className="flex min-h-dvh flex-col gap-[17px]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={parentHref} aria-label="Voltar" className="text-[calc(18px*var(--font-scale))] text-text-muted">
            ←
          </Link>
          <div>
            {/* Livro/capítulo/versão/fonte viraram um seletor único, consolidado na barra
                logo abaixo (mesma que fica fixa ao rolar) — aqui em cima fica só o texto,
                sem duplicar a mesma navegação em dois lugares com comportamentos diferentes. */}
            <div className="flex items-center gap-1.5">
              <span className="text-[calc(17px*var(--font-scale))] font-semibold text-text-primary">{data.reference}</span>
              <button
                type="button"
                onClick={isReadOptimistic ? handleUnmarkAsRead : handleMarkAsRead}
                aria-label={isReadOptimistic ? "Lido · toque pra desmarcar" : "Não lido · toque pra marcar como lido"}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold leading-none transition-transform active:scale-90 ${
                  isReadOptimistic ? "border-[#5c8a52] bg-[#5c8a52] text-white" : "border-[#c0ad94] bg-transparent text-transparent"
                }`}
              >
                ✓
              </button>
            </div>
            {data.planContext && (
              <div className="text-[calc(11px*var(--font-scale))] text-text-muted">
                Dia {data.planContext.dayNumber} de {data.planContext.packageTitle} ·{" "}
                {data.verses.length} {data.verses.length === 1 ? "versículo" : "versículos"}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex items-center gap-2.5">
        <Link
          href={prevHref ?? "#"}
          aria-disabled={!prevHref}
          className={`flex-1 rounded-[13px] border border-input-border py-3 text-center text-[calc(12px*var(--font-scale))] font-semibold transition-transform active:scale-95 ${
            prevHref ? "text-text-secondary" : "pointer-events-none text-text-muted opacity-40"
          }`}
        >
          ← Anterior
        </Link>
        <Link
          href={nextHref ?? "#"}
          aria-disabled={!nextHref}
          className={`flex-1 rounded-[13px] border border-input-border py-3 text-center text-[calc(12px*var(--font-scale))] font-semibold transition-transform active:scale-95 ${
            nextHref ? "text-text-secondary" : "pointer-events-none text-text-muted opacity-40"
          }`}
        >
          Próximo →
        </Link>
      </div>

      <div className="h-px bg-border" />

      {data.chapterEngagement.participants.length > 0 && (
        <div className="rounded-[13px] border border-border bg-surface px-3.5 py-2.5">
          <button
            type="button"
            onClick={() => setChapterOverviewOpen((open) => !open)}
            aria-expanded={chapterOverviewOpen}
            className="flex w-full items-center justify-between"
          >
            <span className="inline-flex items-center">
              {data.chapterEngagement.participants.map((participant, index) => (
                <span
                  key={`${participant.name}-${index}`}
                  className={index > 0 ? "-ml-2" : ""}
                  style={{
                    position: "relative",
                    zIndex: data.chapterEngagement.participants.length - index,
                    borderRadius: "9999px",
                    boxShadow: "0 0 0 2px #fbf7ef",
                  }}
                >
                  <Avatar name={participant.name} avatarUrl={participant.avatarUrl} colorIndex={participant.colorIndex} size="sm" />
                </span>
              ))}
            </span>
            <span className="flex items-center gap-2">
              <span className="flex flex-col items-end text-right text-[calc(11px*var(--font-scale))] text-text-muted sm:flex-row sm:items-center sm:gap-1">
                {data.chapterEngagement.commentCount > 0 && (
                  <span className="whitespace-nowrap">
                    {data.chapterEngagement.commentCount} {data.chapterEngagement.commentCount === 1 ? "comentário" : "comentários"}
                    {data.chapterEngagement.highlightCount > 0 && <span className="hidden sm:inline">,</span>}
                  </span>
                )}
                {data.chapterEngagement.highlightCount > 0 && (
                  <span className="whitespace-nowrap">
                    {data.chapterEngagement.highlightCount} {data.chapterEngagement.highlightCount === 1 ? "destaque" : "destaques"}
                  </span>
                )}
              </span>
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                style={{ width: "calc(20px * var(--font-scale))", height: "calc(20px * var(--font-scale))" }}
                className={`shrink-0 text-text-muted transition-transform duration-200 ${chapterOverviewOpen ? "rotate-45" : ""}`}
              >
                <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          </button>

          {chapterOverviewOpen && (
            <div className="mt-2.5 flex flex-col gap-1 border-t border-border pt-2.5">
              {data.chapterEngagement.participants.map((participant) => {
                const isExpanded = expandedParticipantId === participant.id;
                // Comentários e destaques dessa pessoa juntos, ordenados por verso —
                // pra listar em ordem de leitura em vez de "todos comentários, depois destaques".
                const activity = [
                  ...participant.comments.map((comment) => ({ verse: comment.verse, kind: "comment" as const, comment })),
                  ...participant.highlights.map((highlight) => ({ verse: highlight.verse, kind: "highlight" as const, highlight })),
                ].sort((a, b) => a.verse - b.verse);

                return (
                  <div key={participant.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedParticipantId((current) => (current === participant.id ? null : participant.id))}
                      aria-expanded={isExpanded}
                      className="flex w-full items-center gap-2.5 py-1"
                    >
                      <Avatar name={participant.name} avatarUrl={participant.avatarUrl} colorIndex={participant.colorIndex} size="sm" />
                      <span className="flex-1 text-left text-[calc(12px*var(--font-scale))] font-semibold text-ink">{participant.name}</span>
                      <EngagementBreakdown commentCount={participant.commentCount} highlightCount={participant.highlightCount} />
                      <svg
                        aria-hidden
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ width: "calc(14px * var(--font-scale))", height: "calc(14px * var(--font-scale))" }}
                        className={`shrink-0 text-text-muted transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                      >
                        <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="ml-[35px] flex flex-col gap-1 pb-1.5">
                        {activity.map((item, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleJumpToVerse(item.verse)}
                            className="flex items-center gap-2 py-0.5 text-left"
                          >
                            <span className="flex w-4 shrink-0 items-center justify-center">
                              {item.kind === "highlight" ? (
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: HIGHLIGHT_COLORS[item.highlight.color].bg }}
                                />
                              ) : (
                                <svg
                                  aria-hidden
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  style={{ width: "calc(11px * var(--font-scale))", height: "calc(11px * var(--font-scale))" }}
                                  className="text-text-muted"
                                >
                                  <path
                                    d="M4 5.5h16v10H9l-4 3.5v-3.5H4v-10Z"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </span>
                            <span className="shrink-0 text-[calc(11px*var(--font-scale))] font-semibold text-ink">v.{item.verse}</span>
                            <span className="truncate text-[calc(11px*var(--font-scale))] text-text-muted">
                              {item.kind === "comment" ? item.comment.content : "destacou este verso"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Fixo no topo da tela ao rolar pelos versos — livro, capítulo, versão e
          tipografia viram botões, cada um abrindo um seletor rápido sem sair da
          leitura (lista de livros / grade de capítulos / versões por idioma /
          tamanho+tipo de letra com prévia). */}
      <div ref={stickyBarRef} className="sticky top-0 z-20 -mx-[18px] bg-background px-[18px] py-2">
        <div className="flex items-center justify-between gap-2">
          {/* Livro/capítulo: par de navegação principal — junto, estilo cheio (pílula
              preenchida) pra pesar mais que versão/tipografia, que são ajustes secundários. */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPicker((current) => (current === "book" ? null : "book"))}
              aria-expanded={picker === "book"}
              className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[calc(14px*var(--font-scale))] font-semibold text-background transition-transform active:scale-95"
            >
              {bookName}
              <ChevronIcon open={picker === "book"} />
            </button>
            <button
              type="button"
              onClick={() => setPicker((current) => (current === "chapter" ? null : "chapter"))}
              aria-expanded={picker === "chapter"}
              className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[calc(14px*var(--font-scale))] font-semibold text-background transition-transform active:scale-95"
            >
              {chapter}
              <ChevronIcon open={picker === "chapter"} />
            </button>
          </div>

          {/* Versão/tipografia: ajustes secundários — estilo discreto (sem preenchimento). */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setPicker((current) => {
                  // Fecha (clique no próprio botão de novo) — mesmo caminho de saída
                  // que clicar fora: o efeito de [picker, pending] acima devolve a
                  // rolagem pro verso fixado abaixo.
                  if (current === "version") return null;
                  // Abre: fixa o verso do topo AGORA, antes do painel nascer — é
                  // esse que continua no topo até fechar, mesmo que a pessoa troque
                  // de versão dentro do painel (ver handleVersionChange).
                  pinnedVerseRef.current = topVisibleVerse();
                  return "version";
                });
              }}
              aria-expanded={picker === "version"}
              className="inline-flex items-center gap-1 rounded-full border border-[#d4c5ac] px-2.5 py-1.5 text-[calc(12px*var(--font-scale))] font-semibold text-text-secondary transition-transform active:scale-95"
            >
              {version}
              <ChevronIcon open={picker === "version"} />
            </button>
            <button
              type="button"
              onClick={() => {
                setPicker((current) => {
                  // Fecha (clique no próprio botão de novo) — mesmo caminho de saída
                  // que clicar fora: o efeito de [picker, pending] devolve a rolagem
                  // pro verso fixado abaixo (a barra ainda vai encolher de volta ao
                  // tamanho compacto, o que também empurra os versos pra cima).
                  if (current === "settings") return null;
                  // Abre: fixa o verso do topo ANTES do painel nascer — é esse que
                  // continua no topo depois, não importa quantos ajustes de
                  // tamanho/tipo de letra acontecerem enquanto o painel ficar
                  // aberto (ver useLayoutEffect de [verseFontSize, verseFontFamily]).
                  pinnedVerseRef.current = topVisibleVerse();
                  return "settings";
                });
              }}
              aria-expanded={picker === "settings"}
              aria-label="Tamanho e tipo de letra"
              className="inline-flex items-center gap-1 rounded-full border border-[#d4c5ac] px-2.5 py-1.5 text-[calc(12px*var(--font-scale))] font-semibold text-text-secondary transition-transform active:scale-95"
            >
              Aa
              <ChevronIcon open={picker === "settings"} />
            </button>
          </div>
        </div>

        {picker && (
          // absolute (não em fluxo normal): flutua por cima dos versos em vez de
          // empurrá-los pra baixo ao abrir — a barra fixa continua com a mesma
          // altura compacta, aberto ou fechado.
          <div
            ref={pickerPanelRef}
            className="absolute left-[18px] right-[18px] top-full z-30 mt-1.5 max-h-[60vh] overflow-y-auto rounded-[14px] border border-border bg-surface p-3 shadow-sm"
          >
            {picker === "book" && (
              <div className="flex flex-col gap-3">
                {[...OLD_TESTAMENT_SECTIONS, ...NEW_TESTAMENT_SECTIONS].map((section) => (
                  <div key={section.label}>
                    <div className="mb-1 px-2.5 text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
                      {section.label}
                    </div>
                    <div className="flex flex-col">
                      {section.books.map((sectionBookId) => {
                        const meta = getBookMeta(sectionBookId);
                        if (!meta) return null;
                        const isCurrent = sectionBookId === book;
                        return (
                          <button
                            key={sectionBookId}
                            type="button"
                            data-current={isCurrent || undefined}
                            onClick={() => navigateToChapter(sectionBookId, 1)}
                            className={`rounded-[10px] px-2.5 py-2 text-left text-[calc(14px*var(--font-scale))] transition-transform active:scale-[0.98] ${
                              isCurrent ? "bg-canvas font-semibold text-ink" : "text-text-secondary"
                            }`}
                          >
                            {meta.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {picker === "chapter" && (
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: bookChapterCount }, (_, index) => index + 1).map((chapterOption) => (
                  <button
                    key={chapterOption}
                    type="button"
                    data-current={chapterOption === chapter || undefined}
                    onClick={() => navigateToChapter(book, chapterOption)}
                    className={`rounded-[10px] border py-2.5 text-center text-[calc(13px*var(--font-scale))] font-semibold transition-transform active:scale-[0.94] ${
                      chapterOption === chapter ? "border-ink bg-ink text-background" : "border-border bg-background text-text-primary"
                    }`}
                  >
                    {chapterOption}
                  </button>
                ))}
              </div>
            )}

            {picker === "version" && (
              <div className="flex flex-col gap-3">
                {Array.from(versionsByLanguage.entries()).map(([language, items]) => (
                  <div key={language}>
                    <div className="mb-1 px-2.5 text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
                      {LANGUAGE_LABELS[language]}
                    </div>
                    <div className="flex flex-col">
                      {items.map((item) => {
                        const isCurrent = item.abbreviation === version;
                        return (
                          <button
                            key={item.abbreviation}
                            type="button"
                            data-current={isCurrent || undefined}
                            onClick={() => {
                              setPicker(null);
                              handleVersionChange(item.abbreviation);
                            }}
                            className={`rounded-[10px] px-2.5 py-2 text-left text-[calc(14px*var(--font-scale))] transition-transform active:scale-[0.98] ${
                              isCurrent ? "bg-canvas text-ink" : "text-text-secondary"
                            }`}
                          >
                            <span className="font-semibold">{item.abbreviation}</span>
                            {" — "}
                            {item.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {picker === "settings" && (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="mb-1.5 px-0.5 text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
                    Tamanho da letra
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleDecreaseFont}
                      disabled={verseFontSize <= VERSE_FONT_MIN}
                      aria-label="Diminuir letra"
                      className="rounded-lg border border-input-border px-[9px] py-1 text-[calc(13px*var(--font-scale))] font-semibold text-text-muted transition-transform active:scale-90 disabled:opacity-40"
                    >
                      A−
                    </button>
                    <span className="text-[calc(12px*var(--font-scale))] text-text-muted">{verseFontSize}px</span>
                    <button
                      type="button"
                      onClick={handleIncreaseFont}
                      disabled={verseFontSize >= VERSE_FONT_MAX}
                      aria-label="Aumentar letra"
                      className="rounded-lg border border-input-border px-[9px] py-1 text-[calc(17px*var(--font-scale))] font-semibold text-text-muted transition-transform active:scale-90 disabled:opacity-40"
                    >
                      A+
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 px-0.5 text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
                    Tipo da letra
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {VERSE_FONT_FAMILY_OPTIONS.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => applyVerseFontFamily(option.key)}
                        style={{ fontFamily: option.stack }}
                        className={`rounded-[10px] border px-3 py-2 text-[calc(13px*var(--font-scale))] transition-transform active:scale-[0.97] ${
                          option.key === verseFontFamily ? "border-ink bg-canvas font-semibold text-ink" : "border-border text-text-secondary"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
                  fontFamily: verseFontStack,
                  backgroundColor: style?.bg,
                  color: style?.text ?? "#52442f",
                  borderRadius: style ? "10px" : undefined,
                  padding: style ? "11px 14px" : "7px 2px",
                }}
                className="cursor-pointer leading-[1.8]"
              >
                <sup className="mr-[5px] font-sans text-[calc(10px*var(--font-scale))] font-semibold" style={{ color: style?.verseNum ?? "#a3927d" }}>
                  {verse.number}
                </sup>
                {verse.text}
                {verse.commentCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-ink px-2 py-0.5 align-middle font-sans text-[calc(11px*var(--font-scale))] font-semibold text-background">
                    {verse.commentCount} {verse.commentCount === 1 ? "comentário" : "comentários"}
                  </span>
                )}
                {verse.participants.length > 0 && (
                  <span className="ml-1.5 inline-flex items-center align-middle">
                    {verse.participants.map((participant, index) => (
                      <span
                        key={`${participant.name}-${index}`}
                        className={index > 0 ? "-ml-2" : ""}
                        style={{
                          position: "relative",
                          zIndex: verse.participants.length - index,
                          borderRadius: "9999px",
                          boxShadow: `0 0 0 2px ${style?.bg ?? "#f5efe4"}`,
                        }}
                      >
                        <Avatar
                          name={participant.name}
                          avatarUrl={participant.avatarUrl}
                          colorIndex={participant.colorIndex}
                          size="sm"
                          borderColor={participant.highlightColor ? HIGHLIGHT_COLORS[participant.highlightColor].bg : undefined}
                          fallbackColor={
                            participant.highlightColor
                              ? { bg: HIGHLIGHT_COLORS[participant.highlightColor].bg, text: HIGHLIGHT_COLORS[participant.highlightColor].text }
                              : undefined
                          }
                        />
                      </span>
                    ))}
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

                  <AutoResizeTextarea
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
          className={`flex-1 rounded-[13px] border border-input-border py-3 text-center text-[calc(12px*var(--font-scale))] font-semibold transition-transform active:scale-95 ${
            prevHref ? "text-text-secondary" : "pointer-events-none text-text-muted opacity-40"
          }`}
        >
          ← Anterior
        </Link>
        <Link
          href={nextHref ?? "#"}
          aria-disabled={!nextHref}
          className={`flex-1 rounded-[13px] border border-input-border py-3 text-center text-[calc(12px*var(--font-scale))] font-semibold transition-transform active:scale-95 ${
            nextHref ? "text-text-secondary" : "pointer-events-none text-text-muted opacity-40"
          }`}
        >
          Próximo →
        </Link>
      </div>

      <button
        onClick={isReadOptimistic ? handleUnmarkAsRead : handleMarkAsRead}
        className={`mt-auto w-full rounded-[13px] py-[15px] text-[calc(13px*var(--font-scale))] font-semibold transition-transform active:scale-[0.98] ${
          isReadOptimistic ? "border border-input-border text-text-secondary" : "bg-ink text-background"
        }`}
      >
        {isReadOptimistic ? "Já lido · toque para desfazer" : "Marcar como lido"}
      </button>
    </div>
  );
}

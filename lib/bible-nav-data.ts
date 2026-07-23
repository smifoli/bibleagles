import { NEW_TESTAMENT_SECTIONS, OLD_TESTAMENT_SECTIONS } from "@/lib/bible-books";
import { tryGetBookSummary } from "@/lib/bible-data";
import type { createClient } from "@/lib/supabase/server";
import type { Passage } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface BookNavEntry {
  id: string;
  name: string;
  chapterCount: number;
  commentCount: number;
  highlightCount: number;
  readPercent: number;
  isFullyRead: boolean;
}

export interface BookNavSection {
  label: string;
  books: BookNavEntry[];
}

export interface BibleNavData {
  oldTestament: BookNavSection[];
  newTestament: BookNavSection[];
  oldTestamentReadPercent: number;
  newTestamentReadPercent: number;
}

function countByBook(rows: { book: string }[] | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) counts.set(row.book, (counts.get(row.book) ?? 0) + 1);
  return counts;
}

type ProgressRow = {
  book: string | null;
  chapter: number | null;
  reading_plan_days: { passages: Passage[] } | { passages: Passage[] }[] | null;
};

/**
 * Capítulos que o usuário já marcou como lido — via algum dia de algum pacote (ativo
 * ou arquivado — é histórico pessoal, não progresso de um plano em andamento) OU
 * marcado direto, fora de qualquer plano (ver markChapterRead em reader-actions.ts) —
 * agrupados por livro. Base de "isRead"/"isFullyRead"/"readPercent" na grade de
 * capítulos e na lista de livros.
 */
export async function getReadChaptersByBook(supabase: SupabaseServerClient, userId: string): Promise<Map<string, Set<number>>> {
  const { data: progressRows } = await supabase
    .from("reading_progress")
    .select("book, chapter, reading_plan_days(passages)")
    .eq("user_id", userId);

  const readByBook = new Map<string, Set<number>>();
  const add = (book: string, chapter: number) => {
    let chapters = readByBook.get(book);
    if (!chapters) {
      chapters = new Set();
      readByBook.set(book, chapters);
    }
    chapters.add(chapter);
  };

  for (const row of (progressRows ?? []) as ProgressRow[]) {
    if (row.book && row.chapter) {
      add(row.book, row.chapter);
      continue;
    }

    const dayRef = row.reading_plan_days;
    const day = Array.isArray(dayRef) ? dayRef[0] : dayRef;
    if (!day) continue;

    for (const passage of day.passages) {
      const end = passage.chapter_end ?? passage.chapter_start;
      for (let chapter = passage.chapter_start; chapter <= end; chapter++) add(passage.book, chapter);
    }
  }
  return readByBook;
}

export interface BibleNavRawData {
  highlightCounts: Map<string, number>;
  commentCounts: Map<string, number>;
  readByBook: Map<string, Set<number>>;
}

/**
 * Só as queries de /bible, sem nenhuma dependência de `version` — dá pra disparar em
 * paralelo com a busca da versão preferida do usuário (ver app/(app)/bible/page.tsx),
 * já que `buildBibleNavData` só usa `version` pra lookups locais (nome/contagem de
 * capítulos), nunca em filtro de query.
 */
export async function fetchBibleNavRawData(supabase: SupabaseServerClient, userId: string): Promise<BibleNavRawData> {
  // Sem filtro de bible_version: contagem é por referência, não por tradução.
  const [{ data: bookmarkRows }, { data: commentRows }, readByBook] = await Promise.all([
    supabase.from("bookmarks").select("book"),
    supabase.from("comments").select("book"),
    getReadChaptersByBook(supabase, userId),
  ]);

  return {
    highlightCounts: countByBook(bookmarkRows),
    commentCounts: countByBook(commentRows),
    readByBook,
  };
}

/** Monta os dados pra tela /bible a partir do bruto acima + `version`: livros agrupados por
 * seção, com contagem de comentários/destaques da família e se o usuário já leu o livro inteiro. */
export function buildBibleNavData(raw: BibleNavRawData, version: string): BibleNavData {
  const { highlightCounts, commentCounts, readByBook } = raw;

  // % de capítulos lidos em todo o testamento (não a média dos % de cada livro —
  // livros maiores pesam mais), pra barra de progresso de "Antigo"/"Novo Testamento".
  const testamentReadPercent = (sections: typeof OLD_TESTAMENT_SECTIONS): number => {
    let totalChapters = 0;
    let totalRead = 0;
    for (const section of sections) {
      for (const bookId of section.books) {
        const summary = tryGetBookSummary(version, bookId);
        if (!summary) continue;
        totalChapters += summary.chapterCount;
        const readChapters = readByBook.get(bookId);
        if (!readChapters) continue;
        for (let chapter = 1; chapter <= summary.chapterCount; chapter++) {
          if (readChapters.has(chapter)) totalRead++;
        }
      }
    }
    return totalChapters > 0 ? Math.round((totalRead / totalChapters) * 100) : 0;
  };

  const buildSections = (sections: typeof OLD_TESTAMENT_SECTIONS): BookNavSection[] =>
    sections.map((section) => ({
      label: section.label,
      books: section.books
        .map((bookId): BookNavEntry | null => {
          const summary = tryGetBookSummary(version, bookId);
          if (!summary) return null;
          const readChapters = readByBook.get(bookId);
          const readChapterCount = readChapters
            ? Array.from({ length: summary.chapterCount }, (_, index) => index + 1).filter((chapter) => readChapters.has(chapter)).length
            : 0;
          const readPercent = summary.chapterCount > 0 ? Math.round((readChapterCount / summary.chapterCount) * 100) : 0;
          return {
            id: bookId,
            name: summary.name,
            chapterCount: summary.chapterCount,
            commentCount: commentCounts.get(bookId) ?? 0,
            highlightCount: highlightCounts.get(bookId) ?? 0,
            readPercent,
            isFullyRead: readPercent === 100,
          };
        })
        .filter((entry): entry is BookNavEntry => entry !== null),
    }));

  return {
    oldTestament: buildSections(OLD_TESTAMENT_SECTIONS),
    newTestament: buildSections(NEW_TESTAMENT_SECTIONS),
    oldTestamentReadPercent: testamentReadPercent(OLD_TESTAMENT_SECTIONS),
    newTestamentReadPercent: testamentReadPercent(NEW_TESTAMENT_SECTIONS),
  };
}

/**
 * % de capítulos lidos na Bíblia inteira (Antigo + Novo Testamento) — teaser da home.
 * Recebe `readByBook` já buscado (ver getReadChaptersByBook) em vez de buscar aqui —
 * a home dispara essa query em paralelo com a de preferência do usuário (de quem
 * `version` depende) em vez de esperar uma pra só então começar a outra.
 */
export function computeOverallReadPercent(readByBook: Map<string, Set<number>>, version: string): number {
  let totalChapters = 0;
  let totalRead = 0;
  for (const section of [...OLD_TESTAMENT_SECTIONS, ...NEW_TESTAMENT_SECTIONS]) {
    for (const bookId of section.books) {
      const summary = tryGetBookSummary(version, bookId);
      if (!summary) continue;
      totalChapters += summary.chapterCount;
      const readChapters = readByBook.get(bookId);
      if (!readChapters) continue;
      for (let chapter = 1; chapter <= summary.chapterCount; chapter++) {
        if (readChapters.has(chapter)) totalRead++;
      }
    }
  }
  return totalChapters > 0 ? Math.round((totalRead / totalChapters) * 100) : 0;
}

export interface ChapterActivity {
  commentCount: number;
  highlightCount: number;
  isRead: boolean;
}

/**
 * Contagem de comentários/destaques da família por capítulo, mais quais capítulos o
 * usuário já leu (marcou como lido em algum dia de algum plano — a única noção de
 * "lido" que existe no app, ver reading_progress), pra grade de /bible/[book].
 */
export async function getChapterActivityForBook(
  supabase: SupabaseServerClient,
  bookId: string,
  userId: string
): Promise<Map<number, ChapterActivity>> {
  const [{ data: bookmarkRows }, { data: commentRows }, readByBook] = await Promise.all([
    supabase.from("bookmarks").select("chapter").eq("book", bookId),
    supabase.from("comments").select("chapter").eq("book", bookId),
    getReadChaptersByBook(supabase, userId),
  ]);

  const activity = new Map<number, ChapterActivity>();
  const get = (chapter: number) => {
    let entry = activity.get(chapter);
    if (!entry) {
      entry = { commentCount: 0, highlightCount: 0, isRead: false };
      activity.set(chapter, entry);
    }
    return entry;
  };

  for (const row of bookmarkRows ?? []) get(row.chapter).highlightCount++;
  for (const row of commentRows ?? []) get(row.chapter).commentCount++;
  for (const chapter of Array.from(readByBook.get(bookId) ?? [])) get(chapter).isRead = true;

  return activity;
}

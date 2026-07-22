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
  isFullyRead: boolean;
}

export interface BookNavSection {
  label: string;
  books: BookNavEntry[];
}

export interface BibleNavData {
  oldTestament: BookNavSection[];
  newTestament: BookNavSection[];
}

function countByBook(rows: { book: string }[] | null): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) counts.set(row.book, (counts.get(row.book) ?? 0) + 1);
  return counts;
}

type ProgressWithPassages = { reading_plan_days: { passages: Passage[] } | { passages: Passage[] }[] | null };

/**
 * Capítulos que o usuário já marcou como lido (em qualquer dia de qualquer pacote,
 * ativo ou arquivado — é histórico pessoal, não progresso de um plano em andamento),
 * agrupados por livro. Base de "isRead"/"isFullyRead" na grade de capítulos e na
 * lista de livros.
 */
async function getReadChaptersByBook(supabase: SupabaseServerClient, userId: string): Promise<Map<string, Set<number>>> {
  const { data: progressRows } = await supabase.from("reading_progress").select("reading_plan_days(passages)").eq("user_id", userId);

  const readByBook = new Map<string, Set<number>>();
  for (const row of (progressRows ?? []) as ProgressWithPassages[]) {
    const dayRef = row.reading_plan_days;
    const day = Array.isArray(dayRef) ? dayRef[0] : dayRef;
    if (!day) continue;

    for (const passage of day.passages) {
      let chapters = readByBook.get(passage.book);
      if (!chapters) {
        chapters = new Set();
        readByBook.set(passage.book, chapters);
      }
      const end = passage.chapter_end ?? passage.chapter_start;
      for (let chapter = passage.chapter_start; chapter <= end; chapter++) chapters.add(chapter);
    }
  }
  return readByBook;
}

/** Dados pra tela /bible: livros agrupados por seção, com contagem de comentários/destaques da família e se o usuário já leu o livro inteiro. */
export async function getBibleNavData(supabase: SupabaseServerClient, version: string, userId: string): Promise<BibleNavData> {
  // Sem filtro de bible_version: contagem é por referência, não por tradução.
  const [{ data: bookmarkRows }, { data: commentRows }, readByBook] = await Promise.all([
    supabase.from("bookmarks").select("book"),
    supabase.from("comments").select("book"),
    getReadChaptersByBook(supabase, userId),
  ]);

  const highlightCounts = countByBook(bookmarkRows);
  const commentCounts = countByBook(commentRows);

  const buildSections = (sections: typeof OLD_TESTAMENT_SECTIONS): BookNavSection[] =>
    sections.map((section) => ({
      label: section.label,
      books: section.books
        .map((bookId): BookNavEntry | null => {
          const summary = tryGetBookSummary(version, bookId);
          if (!summary) return null;
          const readChapters = readByBook.get(bookId);
          const isFullyRead =
            summary.chapterCount > 0 &&
            Array.from({ length: summary.chapterCount }, (_, index) => index + 1).every((chapter) => readChapters?.has(chapter));
          return {
            id: bookId,
            name: summary.name,
            chapterCount: summary.chapterCount,
            commentCount: commentCounts.get(bookId) ?? 0,
            highlightCount: highlightCounts.get(bookId) ?? 0,
            isFullyRead,
          };
        })
        .filter((entry): entry is BookNavEntry => entry !== null),
    }));

  return {
    oldTestament: buildSections(OLD_TESTAMENT_SECTIONS),
    newTestament: buildSections(NEW_TESTAMENT_SECTIONS),
  };
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

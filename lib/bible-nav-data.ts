import { NEW_TESTAMENT_SECTIONS, OLD_TESTAMENT_SECTIONS } from "@/lib/bible-books";
import { tryGetBookSummary } from "@/lib/bible-data";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface BookNavEntry {
  id: string;
  name: string;
  chapterCount: number;
  commentCount: number;
  highlightCount: number;
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

/** Dados pra tela /bible: livros agrupados por seção, com contagem de comentários/destaques da família. */
export async function getBibleNavData(supabase: SupabaseServerClient, version: string): Promise<BibleNavData> {
  // Sem filtro de bible_version: contagem é por referência, não por tradução.
  const [{ data: bookmarkRows }, { data: commentRows }] = await Promise.all([
    supabase.from("bookmarks").select("book"),
    supabase.from("comments").select("book"),
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
          return {
            id: bookId,
            name: summary.name,
            chapterCount: summary.chapterCount,
            commentCount: commentCounts.get(bookId) ?? 0,
            highlightCount: highlightCounts.get(bookId) ?? 0,
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
}

/** Contagem de comentários/destaques da família por capítulo, pra grade de /bible/[book]. */
export async function getChapterActivityForBook(
  supabase: SupabaseServerClient,
  bookId: string
): Promise<Map<number, ChapterActivity>> {
  const [{ data: bookmarkRows }, { data: commentRows }] = await Promise.all([
    supabase.from("bookmarks").select("chapter").eq("book", bookId),
    supabase.from("comments").select("chapter").eq("book", bookId),
  ]);

  const activity = new Map<number, ChapterActivity>();
  const get = (chapter: number) => {
    let entry = activity.get(chapter);
    if (!entry) {
      entry = { commentCount: 0, highlightCount: 0 };
      activity.set(chapter, entry);
    }
    return entry;
  };

  for (const row of bookmarkRows ?? []) get(row.chapter).highlightCount++;
  for (const row of commentRows ?? []) get(row.chapter).commentCount++;

  return activity;
}

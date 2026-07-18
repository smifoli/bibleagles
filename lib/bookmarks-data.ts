import { BOOK_ORDER, getBookMeta } from "@/lib/bible-books";
import { getChapter } from "@/lib/bible-data";
import type { createClient } from "@/lib/supabase/server";
import type { HighlightColor } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface BookmarkEntry {
  id: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  version: string;
  color: HighlightColor;
  verseText: string;
  createdAt: string;
}

export interface BookmarkBookOption {
  id: string;
  name: string;
}

export interface BookmarksData {
  bookmarks: BookmarkEntry[];
  books: BookmarkBookOption[];
}

/** Texto do versículo pra dar contexto na lista de destaques; "" se o capítulo não existir localmente. */
function tryGetVerseText(version: string, book: string, chapter: number, verse: number): string {
  try {
    return getChapter(version, book, chapter).verses.find((item) => item.number === verse)?.text ?? "";
  } catch {
    return "";
  }
}

/** Dados pra tela /bookmarks: destaques do usuário atual, mais a lista de livros presentes (pro filtro). */
export async function getBookmarksData(supabase: SupabaseServerClient, userId: string): Promise<BookmarksData> {
  const { data: rows } = await supabase
    .from("bookmarks")
    .select("id, book, chapter, verse, bible_version, color, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const bookmarks: BookmarkEntry[] = (rows ?? []).map((row) => ({
    id: row.id,
    book: row.book,
    bookName: getBookMeta(row.book)?.name ?? row.book,
    chapter: row.chapter,
    verse: row.verse,
    version: row.bible_version,
    color: row.color,
    verseText: tryGetVerseText(row.bible_version, row.book, row.chapter, row.verse),
    createdAt: row.created_at,
  }));

  const presentBookIds = new Set(bookmarks.map((bookmark) => bookmark.book));
  const books: BookmarkBookOption[] = BOOK_ORDER.filter((id) => presentBookIds.has(id)).map((id) => ({
    id,
    name: getBookMeta(id)?.name ?? id,
  }));

  return { bookmarks, books };
}

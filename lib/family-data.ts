import { getBookMeta } from "@/lib/bible-books";
import type { createClient } from "@/lib/supabase/server";
import type { HighlightColor } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface FamilyActivityItem {
  id: string;
  userId: string;
  userName: string;
  kind: "highlight" | "comment";
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  version: string;
  color?: HighlightColor;
  quote?: string;
  createdAt: string;
}

const FEED_LIMIT_PER_SOURCE = 60;

/** Dados pra tela /family: destaques + comentários de todos os membros, em ordem cronológica — versão
 * mais completa (não limitada a 6 itens) do feed que aparece resumido em ActivityFeed na home. */
export async function getFamilyFeedData(supabase: SupabaseServerClient): Promise<FamilyActivityItem[]> {
  const [{ data: familyMembers }, { data: comments }, { data: bookmarks }] = await Promise.all([
    supabase.from("users").select("id, name").order("created_at", { ascending: true }),
    supabase
      .from("comments")
      .select("id, user_id, book, chapter, verse, bible_version, content, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT_PER_SOURCE),
    supabase
      .from("bookmarks")
      .select("id, user_id, book, chapter, verse, bible_version, color, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT_PER_SOURCE),
  ]);

  const memberNames = new Map((familyMembers ?? []).map((member) => [member.id, member.name]));

  const items: FamilyActivityItem[] = [
    ...(comments ?? []).map((comment) => ({
      id: comment.id,
      userId: comment.user_id,
      userName: memberNames.get(comment.user_id) ?? "Alguém",
      kind: "comment" as const,
      book: comment.book,
      bookName: getBookMeta(comment.book)?.name ?? comment.book,
      chapter: comment.chapter,
      verse: comment.verse,
      version: comment.bible_version,
      quote: comment.content,
      createdAt: comment.created_at,
    })),
    ...(bookmarks ?? []).map((bookmark) => ({
      id: bookmark.id,
      userId: bookmark.user_id,
      userName: memberNames.get(bookmark.user_id) ?? "Alguém",
      kind: "highlight" as const,
      book: bookmark.book,
      bookName: getBookMeta(bookmark.book)?.name ?? bookmark.book,
      chapter: bookmark.chapter,
      verse: bookmark.verse,
      version: bookmark.bible_version,
      color: bookmark.color as HighlightColor,
      createdAt: bookmark.created_at,
    })),
  ];

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

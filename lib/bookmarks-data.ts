import { BOOK_ORDER, getBookMeta } from "@/lib/bible-books";
import { getChapter } from "@/lib/bible-data";
import type { createClient } from "@/lib/supabase/server";
import type { HighlightColor } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface HighlightMark {
  userId: string;
  userName: string;
  colorIndex: number;
  color: HighlightColor;
  createdAt: string;
}

export interface HighlightComment {
  id: string;
  userId: string;
  userName: string;
  colorIndex: number;
  content: string;
  createdAt: string;
}

/** Um versículo com pelo menos um destaque ou comentário — agrega todas as marcas
 * e comentários de todo mundo nesse versículo em uma única entrada. */
export interface HighlightGroupEntry {
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  version: string;
  verseText: string;
  mostRecentAt: string;
  highlights: HighlightMark[];
  comments: HighlightComment[];
}

export interface BookmarkBookOption {
  id: string;
  name: string;
}

export interface FamilyPersonOption {
  id: string;
  name: string;
  colorIndex: number;
}

export interface BookmarksData {
  groups: HighlightGroupEntry[];
  books: BookmarkBookOption[];
  people: FamilyPersonOption[];
}

function tryGetVerseText(version: string, book: string, chapter: number, verse: number): string {
  try {
    return getChapter(version, book, chapter).verses.find((item) => item.number === verse)?.text ?? "";
  } catch {
    return "";
  }
}

function groupKey(book: string, chapter: number, verse: number): string {
  return `${book}|${chapter}|${verse}`;
}

/** Dados pra tela /bookmarks ("Destaques"): destaques + comentários de TODA a família,
 * unificados por versículo — cada versículo com atividade vira uma entrada só, com quem
 * destacou e quem comentou, ordenadas pela atividade mais recente. */
export async function getBookmarksData(supabase: SupabaseServerClient): Promise<BookmarksData> {
  const [{ data: familyMembers }, { data: bookmarkRows }, { data: commentRows }] = await Promise.all([
    supabase.from("users").select("id, name, is_deleted").order("created_at", { ascending: true }),
    supabase
      .from("bookmarks")
      .select("id, user_id, book, chapter, verse, bible_version, color, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("id, user_id, book, chapter, verse, bible_version, content, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const memberOrder = new Map((familyMembers ?? []).map((member, index) => [member.id, index]));
  const memberNames = new Map(
    (familyMembers ?? []).map((member) => [member.id, member.is_deleted ? `${member.name} (deletado)` : member.name])
  );
  const colorIndexFor = (userId: string) => memberOrder.get(userId) ?? 0;
  const nameFor = (userId: string) => memberNames.get(userId) ?? "Alguém";

  const groups = new Map<string, HighlightGroupEntry>();
  // Versão do item mais recente de cada grupo — decide qual versão usar pro link/texto
  // do versículo, já que destaques e comentários na mesma referência podem ter versões diferentes.
  const latestVersion = new Map<string, { version: string; at: string }>();

  function getOrCreateGroup(book: string, chapter: number, verse: number): HighlightGroupEntry {
    const key = groupKey(book, chapter, verse);
    const existing = groups.get(key);
    if (existing) return existing;
    const created: HighlightGroupEntry = {
      book,
      bookName: getBookMeta(book)?.name ?? book,
      chapter,
      verse,
      version: "",
      verseText: "",
      mostRecentAt: "1970-01-01T00:00:00Z",
      highlights: [],
      comments: [],
    };
    groups.set(key, created);
    return created;
  }

  function trackActivity(group: HighlightGroupEntry, version: string, createdAt: string) {
    if (createdAt > group.mostRecentAt) group.mostRecentAt = createdAt;
    const key = groupKey(group.book, group.chapter, group.verse);
    const current = latestVersion.get(key);
    if (!current || createdAt > current.at) latestVersion.set(key, { version, at: createdAt });
  }

  for (const row of bookmarkRows ?? []) {
    const group = getOrCreateGroup(row.book, row.chapter, row.verse);
    group.highlights.push({
      userId: row.user_id,
      userName: nameFor(row.user_id),
      colorIndex: colorIndexFor(row.user_id),
      color: row.color,
      createdAt: row.created_at,
    });
    trackActivity(group, row.bible_version, row.created_at);
  }

  for (const row of commentRows ?? []) {
    const group = getOrCreateGroup(row.book, row.chapter, row.verse);
    group.comments.push({
      id: row.id,
      userId: row.user_id,
      userName: nameFor(row.user_id),
      colorIndex: colorIndexFor(row.user_id),
      content: row.content,
      createdAt: row.created_at,
    });
    trackActivity(group, row.bible_version, row.created_at);
  }

  Array.from(groups.values()).forEach((group) => {
    const key = groupKey(group.book, group.chapter, group.verse);
    const version = latestVersion.get(key)?.version ?? "";
    group.version = version;
    group.verseText = tryGetVerseText(version, group.book, group.chapter, group.verse);
  });

  const sortedGroups = Array.from(groups.values()).sort((a, b) => (a.mostRecentAt < b.mostRecentAt ? 1 : -1));

  const presentBookIds = new Set(sortedGroups.map((group) => group.book));
  const books: BookmarkBookOption[] = BOOK_ORDER.filter((id) => presentBookIds.has(id)).map((id) => ({
    id,
    name: getBookMeta(id)?.name ?? id,
  }));

  const people: FamilyPersonOption[] = (familyMembers ?? []).map((member, index) => ({
    id: member.id,
    name: nameFor(member.id),
    colorIndex: index,
  }));

  return { groups: sortedGroups, books, people };
}

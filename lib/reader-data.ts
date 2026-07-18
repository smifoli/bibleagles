import { getChapter } from "@/lib/bible-data";
import { HIGHLIGHT_COLORS, SAND_HIGHLIGHT, type HighlightColorStyle } from "@/lib/highlight-colors";
import { getActivePackagesWithToday, passageMatches } from "@/lib/reading-plan";
import type { createClient } from "@/lib/supabase/server";
import type { HighlightColor } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface VerseHighlightMark {
  name: string;
  color: HighlightColor;
}

export interface VerseHighlight {
  style: HighlightColorStyle;
  ownColor: HighlightColor | null;
  markedBy: VerseHighlightMark[];
}

export interface ReaderComment {
  id: string;
  userName: string;
  content: string;
  createdAt: string;
  isEdited: boolean;
  likeCount: number;
  likedByMe: boolean;
  isOwn: boolean;
  replies: ReaderComment[];
}

export interface ReaderVerse {
  number: number;
  text: string;
  highlight: VerseHighlight | null;
  commentCount: number;
}

export interface ReaderPlanContext {
  planDayId: string;
  packageTitle: string;
  dayNumber: number;
  alreadyCompleted: boolean;
}

export interface ReaderData {
  reference: string;
  verses: ReaderVerse[];
  commentsByVerse: Record<number, ReaderComment[]>;
  planContext: ReaderPlanContext | null;
}

export async function getReaderData(
  supabase: SupabaseServerClient,
  userId: string,
  bookId: string,
  chapter: number,
  version: string
): Promise<ReaderData> {
  const chapterContent = getChapter(version, bookId, chapter);

  const [{ data: bookmarkRows }, { data: commentRows }, { data: familyMembers }, planContext] = await Promise.all([
    supabase.from("bookmarks").select("user_id, verse, color").eq("book", bookId).eq("chapter", chapter).eq("bible_version", version),
    supabase
      .from("comments")
      .select("id, user_id, verse, content, parent_id, created_at, updated_at")
      .eq("book", bookId)
      .eq("chapter", chapter)
      .eq("bible_version", version)
      .order("created_at", { ascending: true }),
    supabase.from("users").select("id, name"),
    getTodaysPlanContext(supabase, userId, bookId, chapter),
  ]);

  const memberNames = new Map((familyMembers ?? []).map((member) => [member.id, member.name]));

  const highlightsByVerse = new Map<number, { userId: string; color: HighlightColor }[]>();
  for (const row of bookmarkRows ?? []) {
    const list = highlightsByVerse.get(row.verse) ?? [];
    list.push({ userId: row.user_id, color: row.color as HighlightColor });
    highlightsByVerse.set(row.verse, list);
  }

  const commentIds = (commentRows ?? []).map((row) => row.id);
  const { data: likeRows } =
    commentIds.length > 0
      ? await supabase.from("comment_likes").select("comment_id, user_id").in("comment_id", commentIds)
      : { data: [] as { comment_id: string; user_id: string }[] };

  const likeCounts = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const row of likeRows ?? []) {
    likeCounts.set(row.comment_id, (likeCounts.get(row.comment_id) ?? 0) + 1);
    if (row.user_id === userId) likedByMe.add(row.comment_id);
  }

  // Threading tem só 1 nível (imposto pelo trigger enforce_comment_depth):
  // toda comment_rows aqui é raiz (parent_id null) ou resposta direta de uma raiz.
  const commentById = new Map<string, ReaderComment>();
  for (const row of commentRows ?? []) {
    commentById.set(row.id, {
      id: row.id,
      userName: memberNames.get(row.user_id) ?? "Alguém",
      content: row.content,
      createdAt: row.created_at,
      isEdited: row.updated_at !== row.created_at,
      likeCount: likeCounts.get(row.id) ?? 0,
      likedByMe: likedByMe.has(row.id),
      isOwn: row.user_id === userId,
      replies: [],
    });
  }

  const commentsByVerse: Record<number, ReaderComment[]> = {};
  const commentCountByVerse = new Map<number, number>();
  for (const row of commentRows ?? []) {
    const comment = commentById.get(row.id)!;
    commentCountByVerse.set(row.verse, (commentCountByVerse.get(row.verse) ?? 0) + 1);

    if (row.parent_id) {
      commentById.get(row.parent_id)?.replies.push(comment);
    } else {
      const list = commentsByVerse[row.verse] ?? [];
      list.push(comment);
      commentsByVerse[row.verse] = list;
    }
  }

  const verses: ReaderVerse[] = chapterContent.verses.map((verse) => {
    const highlightRows = highlightsByVerse.get(verse.number);
    let highlight: VerseHighlight | null = null;

    if (highlightRows && highlightRows.length > 0) {
      const own = highlightRows.find((row) => row.userId === userId);
      highlight = {
        style: own ? HIGHLIGHT_COLORS[own.color] : SAND_HIGHLIGHT,
        ownColor: own?.color ?? null,
        markedBy: highlightRows.map((row) => ({ name: memberNames.get(row.userId) ?? "Alguém", color: row.color })),
      };
    }

    return {
      number: verse.number,
      text: verse.text,
      highlight,
      commentCount: commentCountByVerse.get(verse.number) ?? 0,
    };
  });

  return {
    reference: chapterContent.reference,
    verses,
    commentsByVerse,
    planContext,
  };
}

async function getTodaysPlanContext(
  supabase: SupabaseServerClient,
  userId: string,
  bookId: string,
  chapter: number
): Promise<ReaderPlanContext | null> {
  const todayPackages = await getActivePackagesWithToday(supabase);

  const match = todayPackages.find((pkg) => pkg.passages.some((passage) => passageMatches(passage, bookId, chapter)));
  if (!match) return null;

  const { data: progress } = await supabase
    .from("reading_progress")
    .select("id")
    .eq("plan_day_id", match.planDayId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    planDayId: match.planDayId,
    packageTitle: match.packageTitle,
    dayNumber: match.dayNumber,
    alreadyCompleted: Boolean(progress),
  };
}

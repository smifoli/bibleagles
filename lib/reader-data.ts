import { getChapter } from "@/lib/bible-data";
import { HIGHLIGHT_COLORS, SAND_HIGHLIGHT, type HighlightColorStyle } from "@/lib/highlight-colors";
import { getActivePackagesWithToday, passageMatches } from "@/lib/reading-plan";
import type { createClient } from "@/lib/supabase/server";
import type { HighlightColor } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface VerseHighlight {
  style: HighlightColorStyle;
  ownColor: HighlightColor | null;
  markedByNames: string[];
}

export interface ReaderComment {
  id: string;
  userName: string;
  content: string;
  createdAt: string;
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
      .select("id, user_id, verse, content, created_at")
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

  const commentsByVerse: Record<number, ReaderComment[]> = {};
  for (const row of commentRows ?? []) {
    const list = commentsByVerse[row.verse] ?? [];
    list.push({
      id: row.id,
      userName: memberNames.get(row.user_id) ?? "Alguém",
      content: row.content,
      createdAt: row.created_at,
    });
    commentsByVerse[row.verse] = list;
  }

  const verses: ReaderVerse[] = chapterContent.verses.map((verse) => {
    const highlightRows = highlightsByVerse.get(verse.number);
    let highlight: VerseHighlight | null = null;

    if (highlightRows && highlightRows.length > 0) {
      const own = highlightRows.find((row) => row.userId === userId);
      highlight = {
        style: own ? HIGHLIGHT_COLORS[own.color] : SAND_HIGHLIGHT,
        ownColor: own?.color ?? null,
        markedByNames: highlightRows.map((row) => memberNames.get(row.userId) ?? "Alguém"),
      };
    }

    return {
      number: verse.number,
      text: verse.text,
      highlight,
      commentCount: commentsByVerse[verse.number]?.length ?? 0,
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

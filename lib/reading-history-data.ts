import type { createClient } from "@/lib/supabase/server";
import { formatShortDate } from "@/lib/format";
import { getUserTimeZone } from "@/lib/timezone";
import { getBookMeta } from "@/lib/bible-books";
import type { Passage } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ReadHistoryItem {
  book: string;
  chapter: number;
  reference: string;
  completedAt: string;
  dateLabel: string;
}

interface ProgressRow {
  completed_at: string;
  book: string | null;
  chapter: number | null;
  reading_plan_days: { passages: Passage[] } | { passages: Passage[] }[] | null;
}

/** Todo capítulo que o usuário já marcou como lido — via algum dia de plano (mesma
 * fonte de getReadChaptersByBook, lib/bible-nav-data.ts) OU marcado direto fora de
 * plano — ordenado do mais recente pro mais antigo pela data em que foi DE FATO lido
 * (completed_at), não a data programada de um plano. Um dia de plano que cobre vários
 * capítulos (passage com chapter_start..chapter_end) expande em uma entrada por
 * capítulo. Se o mesmo capítulo aparecer mais de uma vez (ex.: lido avulso e também
 * coberto por um plano depois), fica só a leitura mais antiga — é "quando eu li isso
 * pela primeira vez", não uma entrada por evento de marcação. */
export async function getReadingHistory(supabase: SupabaseServerClient, userId: string): Promise<ReadHistoryItem[]> {
  const timeZone = await getUserTimeZone();

  const { data } = await supabase
    .from("reading_progress")
    .select("completed_at, book, chapter, reading_plan_days(passages)")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  const byKey = new Map<string, { book: string; chapter: number; completedAt: string }>();
  const add = (book: string, chapter: number, completedAt: string) => {
    const key = `${book}:${chapter}`;
    const existing = byKey.get(key);
    if (!existing || completedAt < existing.completedAt) byKey.set(key, { book, chapter, completedAt });
  };

  for (const row of (data ?? []) as ProgressRow[]) {
    if (row.book && row.chapter) {
      add(row.book, row.chapter, row.completed_at);
      continue;
    }

    const dayRef = row.reading_plan_days;
    const day = Array.isArray(dayRef) ? dayRef[0] : dayRef;
    if (!day) continue;

    for (const passage of day.passages) {
      const end = passage.chapter_end ?? passage.chapter_start;
      for (let chapter = passage.chapter_start; chapter <= end; chapter++) add(passage.book, chapter, row.completed_at);
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => (a.completedAt < b.completedAt ? 1 : a.completedAt > b.completedAt ? -1 : 0))
    .map((entry) => ({
      book: entry.book,
      chapter: entry.chapter,
      reference: `${getBookMeta(entry.book)?.name ?? entry.book} ${entry.chapter}`,
      completedAt: entry.completedAt,
      dateLabel: formatShortDate(new Date(entry.completedAt), timeZone),
    }));
}

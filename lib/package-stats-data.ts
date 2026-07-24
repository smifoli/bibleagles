import type { createClient } from "@/lib/supabase/server";
import { formatShortDate, parseDateOnly, toDateOnlyString } from "@/lib/format";
import { passageMatches } from "@/lib/reading-plan";
import { tryGetBookSummary } from "@/lib/bible-data";
import { getDefaultVersion } from "@/lib/bible-versions";
import type { Passage, PackageStatus } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface PackageDayItem {
  id: string;
  date: string;
  dateLabel: string;
  title: string;
  passageLabel: string | null;
  readCount: number;
  isReadByMe: boolean;
  readByMemberIds: string[];
  firstPassageBook: string | null;
  firstPassageChapterStart: number | null;
  readHref: string | null;
}

export interface PackageMemberStat {
  id: string;
  name: string;
  avatarUrl: string | null;
  completedDays: number;
  isFullyCompleted: boolean;
  percent: number;
}

export interface MostActiveMember {
  name: string;
  count: number;
}

export interface MostCommentedVerse {
  reference: string;
  count: number;
  book: string;
  chapter: number;
  verse: number;
  version: string;
}

export interface PackageStats {
  id: string;
  title: string;
  status: PackageStatus;
  statusLabel: string;
  startDateLabel: string;
  currentDayNumber: number;
  totalDays: number;
  progressPercent: number;
  daysRemaining: number;
  totalComments: number;
  totalHighlights: number;
  totalDaysRead: number;
  members: PackageMemberStat[];
  mostActiveMember: MostActiveMember | null;
  mostCommentedVerse: MostCommentedVerse | null;
  days: PackageDayItem[];
}

const STATUS_LABELS: Record<PackageStatus, string> = {
  active: "Ativo",
  draft: "Rascunho",
  archived: "Arquivado",
};

/** Nome de exibição de um livro a partir do código (ex.: "MAT" -> "Mateus"), usando a versão padrão em pt. */
function bookDisplayName(bookId: string): string {
  const defaultVersion = getDefaultVersion("pt");
  return tryGetBookSummary(defaultVersion.abbreviation, bookId)?.name ?? bookId;
}

function formatPassageLabel(passage: Passage): string {
  const name = bookDisplayName(passage.book);
  const hasChapterRange = passage.chapter_end !== null && passage.chapter_end !== passage.chapter_start;

  if (hasChapterRange) {
    return `${name} ${passage.chapter_start}–${passage.chapter_end}`;
  }

  if (passage.verse_start !== null) {
    const hasVerseRange = passage.verse_end !== null && passage.verse_end !== passage.verse_start;
    return `${name} ${passage.chapter_start}:${passage.verse_start}${hasVerseRange ? `-${passage.verse_end}` : ""}`;
  }

  return `${name} ${passage.chapter_start}`;
}

interface PackageDayWithProgressRow {
  id: string;
  date: string;
  title: string;
  passages: Passage[];
  reading_progress: { user_id: string; plan_day_id: string }[];
}

/** Busca dados agregados de progresso/engajamento de um pacote pra tela /package/[id]. Retorna null se o pacote não existir. */
export async function getPackageStats(supabase: SupabaseServerClient, packageId: string, userId: string): Promise<PackageStats | null> {
  // Nada aqui depende do resultado de outra query — todas disparam juntas. O progresso
  // vem embutido na própria query dos dias (reading_progress.plan_day_id referencia
  // reading_plan_days.id) em vez de uma segunda viagem filtrando por planDayIds —
  // types/database.ts não modela Relationships, daí o cast manual.
  const [{ data: pkg }, { data: days }, { data: familyMembers }, { data: allComments }, { data: allBookmarks }] =
    await Promise.all([
      supabase.from("reading_packages").select("id, title, status, start_date").eq("id", packageId).single(),
      supabase
        .from("reading_plan_days")
        .select("id, date, title, passages, reading_progress(user_id, plan_day_id)")
        .eq("package_id", packageId)
        .order("date", { ascending: true }),
      supabase.from("users").select("id, name, avatar_url").order("created_at", { ascending: true }),
      supabase.from("comments").select("id, user_id, book, chapter, verse, bible_version, created_at"),
      supabase.from("bookmarks").select("id, user_id, book, chapter, created_at"),
    ]);

  if (!pkg) return null;

  const planDays = (days ?? []) as unknown as PackageDayWithProgressRow[];
  const members = familyMembers ?? [];
  const totalDays = planDays.length;
  const allPassages = planDays.flatMap((day) => day.passages);

  const today = toDateOnlyString();
  const currentDayNumber = totalDays === 0 ? 0 : Math.min(Math.max(planDays.filter((day) => day.date <= today).length, 1), totalDays);
  const daysRemaining = Math.max(totalDays - currentDayNumber, 0);
  const progressPercent = totalDays === 0 ? 0 : Math.round((currentDayNumber / totalDays) * 100);

  const progressRows = planDays.flatMap((day) => day.reading_progress);

  // comments/bookmarks não são vinculados ao pacote no schema — pertencem ao pacote se
  // caírem em algum (book, chapter) coberto pelas passagens de algum dia do pacote.
  const belongsToPackage = (book: string, chapter: number) => allPassages.some((passage) => passageMatches(passage, book, chapter));
  const packageComments = (allComments ?? []).filter((comment) => belongsToPackage(comment.book, comment.chapter));
  const packageBookmarks = (allBookmarks ?? []).filter((bookmark) => belongsToPackage(bookmark.book, bookmark.chapter));

  const totalDaysRead = new Set(progressRows.map((row) => row.plan_day_id)).size;

  const memberStats: PackageMemberStat[] = members.map((member) => {
    const completedDays = progressRows.filter((row) => row.user_id === member.id).length;
    return {
      id: member.id,
      name: member.name,
      avatarUrl: member.avatar_url,
      completedDays,
      isFullyCompleted: totalDays > 0 && completedDays === totalDays,
      percent: totalDays === 0 ? 0 : Math.round((completedDays / totalDays) * 100),
    };
  });

  let mostActiveMember: MostActiveMember | null = null;
  for (const member of members) {
    const count =
      packageComments.filter((comment) => comment.user_id === member.id).length +
      packageBookmarks.filter((bookmark) => bookmark.user_id === member.id).length;
    if (count > 0 && (mostActiveMember === null || count > mostActiveMember.count)) {
      mostActiveMember = { name: member.name, count };
    }
  }

  let mostCommentedVerse: MostCommentedVerse | null = null;
  const verseCounts = new Map<string, { book: string; chapter: number; verse: number; version: string; count: number }>();
  for (const comment of packageComments) {
    const key = `${comment.book}:${comment.chapter}:${comment.verse}`;
    const entry = verseCounts.get(key);
    if (entry) entry.count += 1;
    else verseCounts.set(key, { book: comment.book, chapter: comment.chapter, verse: comment.verse, version: comment.bible_version, count: 1 });
  }
  for (const entry of Array.from(verseCounts.values())) {
    if (mostCommentedVerse === null || entry.count > mostCommentedVerse.count) {
      mostCommentedVerse = {
        reference: `${bookDisplayName(entry.book)} ${entry.chapter}:${entry.verse}`,
        count: entry.count,
        book: entry.book,
        chapter: entry.chapter,
        verse: entry.verse,
        version: entry.version,
      };
    }
  }

  const dayItems: PackageDayItem[] = planDays.map((day) => {
    const dayProgress = progressRows.filter((row) => row.plan_day_id === day.id);
    const firstPassage = day.passages[0] as Passage | undefined;
    return {
      id: day.id,
      date: day.date,
      dateLabel: formatShortDateLabel(day.date),
      title: day.title,
      passageLabel: firstPassage ? formatPassageLabel(firstPassage) : null,
      readCount: dayProgress.length,
      isReadByMe: dayProgress.some((row) => row.user_id === userId),
      readByMemberIds: dayProgress.map((row) => row.user_id),
      firstPassageBook: firstPassage?.book ?? null,
      firstPassageChapterStart: firstPassage?.chapter_start ?? null,
      readHref: firstPassage
        ? `/read/${firstPassage.book}/${firstPassage.chapter_start}?planDay=${day.id}&from=${encodeURIComponent(`/package/${packageId}`)}`
        : null,
    };
  });

  return {
    id: pkg.id,
    title: pkg.title,
    status: pkg.status,
    statusLabel: STATUS_LABELS[pkg.status],
    startDateLabel: formatShortDateLabel(pkg.start_date),
    currentDayNumber,
    totalDays,
    progressPercent,
    daysRemaining,
    totalComments: packageComments.length,
    totalHighlights: packageBookmarks.length,
    totalDaysRead,
    members: memberStats,
    mostActiveMember,
    mostCommentedVerse,
    days: dayItems,
  };
}

function formatShortDateLabel(dateOnly: string): string {
  return formatShortDate(parseDateOnly(dateOnly));
}

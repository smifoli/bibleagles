import type { createClient } from "@/lib/supabase/server";
import { formatShortDate, parseDateOnly } from "@/lib/format";
import { getActivePackagesWithToday } from "@/lib/reading-plan";
import type { Passage } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface FamilyMemberStatus {
  id: string;
  name: string;
  completed: boolean;
}

export interface PackageCardData {
  packageId: string;
  planDayId: string;
  eyebrow: string;
  title: string;
  dayNumber: number;
  totalDays: number;
  chapterTitle: string;
  dateLabel: string;
  pendingCount: number;
  percent: number;
  firstPassage: Passage | null;
}

export interface FeaturedPackageCardData extends PackageCardData {
  members: FamilyMemberStatus[];
}

export interface ActivityItem {
  id: string;
  userId: string;
  userName: string;
  kind: "highlight" | "comment";
  book: string;
  chapter: number;
  verse: number;
  version: string;
  quote?: string;
  createdAt: string;
}

export interface HomeData {
  userName: string;
  featured: FeaturedPackageCardData | null;
  secondary: PackageCardData[];
  activity: ActivityItem[];
}

export async function getHomeData(supabase: SupabaseServerClient, userId: string): Promise<HomeData> {
  const [{ data: currentUser }, { data: familyMembers }, todayPackages] = await Promise.all([
    supabase.from("users").select("name").eq("id", userId).single(),
    supabase.from("users").select("id, name").order("created_at", { ascending: true }),
    getActivePackagesWithToday(supabase),
  ]);

  const memberNames = new Map((familyMembers ?? []).map((member) => [member.id, member.name]));

  // Pendências (dias vencidos e não lidos) por pacote, pra badge "em dia" / "N
  // pendentes" nos cards — mesma noção de "Pendentes" usada em /package/[id].
  const allDueDayIds = todayPackages.flatMap((pkg) => pkg.dueDayIds);
  const { data: myProgress } =
    allDueDayIds.length > 0
      ? await supabase.from("reading_progress").select("plan_day_id").eq("user_id", userId).in("plan_day_id", allDueDayIds)
      : { data: [] as { plan_day_id: string }[] };
  const myCompletedDayIds = new Set((myProgress ?? []).map((row) => row.plan_day_id));

  const cards: PackageCardData[] = todayPackages.map((pkg) => ({
    packageId: pkg.packageId,
    planDayId: pkg.planDayId,
    eyebrow: pkg.packageDescription ?? "Leitura em família",
    title: pkg.packageTitle,
    dayNumber: pkg.dayNumber,
    totalDays: pkg.totalDays,
    chapterTitle: pkg.chapterTitle,
    dateLabel: formatShortDate(parseDateOnly(pkg.date)),
    pendingCount: pkg.dueDayIds.filter((id) => !myCompletedDayIds.has(id)).length,
    percent: Math.round((pkg.dayNumber / pkg.totalDays) * 100),
    firstPassage: pkg.passages[0] ?? null,
  }));

  const [featuredCard, ...secondary] = cards;
  let featured: FeaturedPackageCardData | null = null;

  if (featuredCard) {
    const { data: progress } = await supabase
      .from("reading_progress")
      .select("user_id")
      .eq("plan_day_id", featuredCard.planDayId);

    const completedIds = new Set((progress ?? []).map((row) => row.user_id));
    featured = {
      ...featuredCard,
      members: (familyMembers ?? []).map((member) => ({
        id: member.id,
        name: member.name,
        completed: completedIds.has(member.id),
      })),
    };
  }

  const [{ data: comments }, { data: bookmarks }] = await Promise.all([
    supabase
      .from("comments")
      .select("id, user_id, book, chapter, verse, bible_version, content, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("bookmarks")
      .select("id, user_id, book, chapter, verse, bible_version, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const activity: ActivityItem[] = [
    ...(comments ?? []).map((comment) => ({
      id: comment.id,
      userId: comment.user_id,
      userName: memberNames.get(comment.user_id) ?? "Alguém",
      kind: "comment" as const,
      book: comment.book,
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
      chapter: bookmark.chapter,
      verse: bookmark.verse,
      version: bookmark.bible_version,
      createdAt: bookmark.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return {
    userName: currentUser?.name ?? "",
    featured,
    secondary,
    activity,
  };
}

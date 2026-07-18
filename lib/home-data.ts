import type { createClient } from "@/lib/supabase/server";
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
  eyebrow: string;
  title: string;
  dayNumber: number;
  totalDays: number;
  chapterTitle: string;
  percent: number;
  firstPassage: Passage | null;
}

export interface FeaturedPackageCardData extends PackageCardData {
  members: FamilyMemberStatus[];
}

export interface ActivityItem {
  id: string;
  userName: string;
  kind: "highlight" | "comment";
  book: string;
  chapter: number;
  verse: number;
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

  const cards: (PackageCardData & { planDayId: string })[] = todayPackages.map((pkg) => ({
    packageId: pkg.packageId,
    planDayId: pkg.planDayId,
    eyebrow: pkg.packageDescription ?? "Leitura em família",
    title: pkg.packageTitle,
    dayNumber: pkg.dayNumber,
    totalDays: pkg.totalDays,
    chapterTitle: pkg.chapterTitle,
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
      .select("id, user_id, book, chapter, verse, content, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("bookmarks")
      .select("id, user_id, book, chapter, verse, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const activity: ActivityItem[] = [
    ...(comments ?? []).map((comment) => ({
      id: comment.id,
      userName: memberNames.get(comment.user_id) ?? "Alguém",
      kind: "comment" as const,
      book: comment.book,
      chapter: comment.chapter,
      verse: comment.verse,
      quote: comment.content,
      createdAt: comment.created_at,
    })),
    ...(bookmarks ?? []).map((bookmark) => ({
      id: bookmark.id,
      userName: memberNames.get(bookmark.user_id) ?? "Alguém",
      kind: "highlight" as const,
      book: bookmark.book,
      chapter: bookmark.chapter,
      verse: bookmark.verse,
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

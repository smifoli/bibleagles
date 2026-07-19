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
  isAdmin: boolean;
  featured: FeaturedPackageCardData | null;
  secondary: PackageCardData[];
  activity: ActivityItem[];
}

export async function getHomeData(supabase: SupabaseServerClient, userId: string): Promise<HomeData> {
  // Tudo que não depende de resultado de outra query dispara junto numa onda só —
  // cada await sequencial soma uma viagem de rede inteira até o Supabase.
  const [{ data: currentUser }, { data: familyMembers }, todayPackages, { data: comments }, { data: bookmarks }] =
    await Promise.all([
      supabase.from("users").select("name, role").eq("id", userId).single(),
      supabase.from("users").select("id, name, is_deleted").order("created_at", { ascending: true }),
      getActivePackagesWithToday(supabase),
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

  // Membro removido pelo admin, mas com conteúdo preservado, segue aparecendo
  // como autor (só marcado) — some, porém, do checklist "quem já leu hoje".
  const memberNames = new Map(
    (familyMembers ?? []).map((member) => [member.id, member.is_deleted ? `${member.name} (deletado)` : member.name])
  );
  const activeFamilyMembers = (familyMembers ?? []).filter((member) => !member.is_deleted);

  const cards: PackageCardData[] = todayPackages.map((pkg) => ({
    packageId: pkg.packageId,
    planDayId: pkg.planDayId,
    eyebrow: pkg.packageDescription ?? "Leitura em família",
    title: pkg.packageTitle,
    dayNumber: pkg.dayNumber,
    totalDays: pkg.totalDays,
    chapterTitle: pkg.chapterTitle,
    dateLabel: formatShortDate(parseDateOnly(pkg.date)),
    pendingCount: 0,
    percent: Math.round((pkg.dayNumber / pkg.totalDays) * 100),
    firstPassage: pkg.passages[0] ?? null,
  }));

  const [featuredCard, ...secondary] = cards;
  const featuredPackage = todayPackages[0];

  // Segunda onda: depende dos pacotes de hoje (dueDayIds / planDayId), mas as
  // duas queries entre si são independentes — disparam juntas.
  const allDueDayIds = todayPackages.flatMap((pkg) => pkg.dueDayIds);
  const [{ data: myProgress }, { data: featuredProgress }] = await Promise.all([
    allDueDayIds.length > 0
      ? supabase.from("reading_progress").select("plan_day_id").eq("user_id", userId).in("plan_day_id", allDueDayIds)
      : Promise.resolve({ data: [] as { plan_day_id: string }[] }),
    featuredPackage
      ? supabase.from("reading_progress").select("user_id").eq("plan_day_id", featuredPackage.planDayId)
      : Promise.resolve({ data: [] as { user_id: string }[] }),
  ]);

  const myCompletedDayIds = new Set((myProgress ?? []).map((row) => row.plan_day_id));
  for (const card of cards) {
    const pkg = todayPackages.find((item) => item.packageId === card.packageId);
    card.pendingCount = pkg ? pkg.dueDayIds.filter((id) => !myCompletedDayIds.has(id)).length : 0;
  }

  let featured: FeaturedPackageCardData | null = null;
  if (featuredCard) {
    const completedIds = new Set((featuredProgress ?? []).map((row) => row.user_id));
    featured = {
      ...featuredCard,
      members: activeFamilyMembers.map((member) => ({
        id: member.id,
        name: member.name,
        completed: completedIds.has(member.id),
      })),
    };
  }

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
    isAdmin: currentUser?.role === "admin",
    featured,
    secondary,
    activity,
  };
}

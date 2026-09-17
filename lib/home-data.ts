import type { createClient } from "@/lib/supabase/server";
import { getActivePackagesWithToday } from "@/lib/reading-plan";
import type { Passage } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface FamilyMemberStatus {
  id: string;
  name: string;
  avatarUrl: string | null;
  completed: boolean;
  /** Tem algum dia ANTERIOR a hoje ainda não lido. "Ainda não leu hoje" não conta
   * como atraso — senão a família inteira amanheceria "atrasada" todo dia antes da
   * leitura. Mesmo critério da tela de stats do pacote, pra ninguém mudar de status
   * entre uma tela e outra. */
  late: boolean;
  /** % de dias do pacote inteiro (passados, hoje e futuros) que essa pessoa já leu —
   * posição dela na linha do tempo do plano, não só se leu hoje. */
  percent: number;
}

/** Um pacote ativo com leitura pra hoje — uma linha na checklist "Sua leitura de
 * hoje". `pendingCount` inclui dias vencidos anteriores, não só o de hoje (mesmo
 * critério de antes) — por isso `done` (pendingCount === 0) é o sinal confiável de
 * "está em dia neste plano", não só "já leu hoje". */
export interface TodayTask {
  packageId: string;
  planDayId: string;
  packageTitle: string;
  dayNumber: number;
  totalDays: number;
  chapterTitle: string;
  pendingCount: number;
  done: boolean;
  firstPassage: Passage | null;
}

/** Progresso da família num pacote ativo — usado no bloco "A família nos planos",
 * que mostra todo pacote ativo (não só o que tem leitura pra hoje). */
export interface PlanFamilyStatus {
  packageId: string;
  packageTitle: string;
  dayNumber: number;
  totalDays: number;
  /** % de hoje na linha do tempo do plano (dia atual / total de dias). */
  percent: number;
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
  tasks: TodayTask[];
  planFamily: PlanFamilyStatus[];
  activity: ActivityItem[];
}

export async function getHomeData(supabase: SupabaseServerClient, userId: string): Promise<HomeData> {
  // Tudo que não depende de resultado de outra query dispara junto numa onda só —
  // cada await sequencial soma uma viagem de rede inteira até o Supabase.
  const [{ data: currentUser }, { data: familyMembers }, todayPackages, { data: comments }, { data: bookmarks }] =
    await Promise.all([
      supabase.from("users").select("name, role").eq("id", userId).single(),
      supabase.from("users").select("id, name, is_deleted, avatar_url").order("created_at", { ascending: true }),
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

  const tasks: TodayTask[] = todayPackages.map((pkg) => ({
    packageId: pkg.packageId,
    planDayId: pkg.planDayId,
    packageTitle: pkg.packageTitle,
    dayNumber: pkg.dayNumber,
    totalDays: pkg.totalDays,
    chapterTitle: pkg.chapterTitle,
    pendingCount: 0,
    done: false,
    firstPassage: pkg.passages[0] ?? null,
  }));

  // Segunda onda: depende dos pacotes de hoje (dueDayIds / allDayIds), mas as
  // duas queries entre si são independentes — disparam juntas. A segunda cobre
  // TODOS os pacotes ativos (não só um "featured") — cada plano ganha seu próprio
  // bloco de progresso da família na home agora.
  const allDueDayIds = todayPackages.flatMap((pkg) => pkg.dueDayIds);
  const allActiveDayIds = todayPackages.flatMap((pkg) => pkg.allDayIds);
  const [{ data: myProgress }, { data: allProgress }] = await Promise.all([
    allDueDayIds.length > 0
      ? supabase.from("reading_progress").select("plan_day_id").eq("user_id", userId).in("plan_day_id", allDueDayIds)
      : Promise.resolve({ data: [] as { plan_day_id: string }[] }),
    allActiveDayIds.length > 0
      ? supabase.from("reading_progress").select("user_id, plan_day_id").in("plan_day_id", allActiveDayIds)
      : Promise.resolve({ data: [] as { user_id: string; plan_day_id: string }[] }),
  ]);

  const myCompletedDayIds = new Set((myProgress ?? []).map((row) => row.plan_day_id));
  for (const task of tasks) {
    const pkg = todayPackages.find((item) => item.packageId === task.packageId);
    task.pendingCount = pkg ? pkg.dueDayIds.filter((id) => !myCompletedDayIds.has(id)).length : 0;
    task.done = task.pendingCount === 0;
  }

  const readDayIdsByMember = new Map<string, Set<string>>();
  for (const row of allProgress ?? []) {
    if (!row.plan_day_id) continue;
    let readDayIds = readDayIdsByMember.get(row.user_id);
    if (!readDayIds) readDayIdsByMember.set(row.user_id, (readDayIds = new Set()));
    readDayIds.add(row.plan_day_id);
  }

  const planFamily: PlanFamilyStatus[] = todayPackages.map((pkg) => {
    const packageDayIds = new Set(pkg.allDayIds);
    // Dias já vencidos (antes de hoje) — quem deve algum deles está atrasado. O dia
    // de hoje fica de fora: enquanto ainda é hoje, não ler ainda não é atraso.
    const pastDueDayIds = pkg.dueDayIds.filter((id) => id !== pkg.planDayId);
    return {
      packageId: pkg.packageId,
      packageTitle: pkg.packageTitle,
      dayNumber: pkg.dayNumber,
      totalDays: pkg.totalDays,
      percent: Math.round((pkg.dayNumber / pkg.totalDays) * 100),
      members: activeFamilyMembers.map((member) => {
        const readDayIds = readDayIdsByMember.get(member.id) ?? new Set<string>();
        const readInThisPackageCount = Array.from(readDayIds).filter((id) => packageDayIds.has(id)).length;
        return {
          id: member.id,
          name: member.name,
          avatarUrl: member.avatar_url,
          completed: readDayIds.has(pkg.planDayId),
          late: pastDueDayIds.some((id) => !readDayIds.has(id)),
          percent: pkg.totalDays > 0 ? Math.round((readInThisPackageCount / pkg.totalDays) * 100) : 0,
        };
      }),
    };
  });

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
    tasks,
    planFamily,
    activity,
  };
}

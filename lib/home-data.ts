import type { createClient } from "@/lib/supabase/server";
import { getActivePlans } from "@/lib/reading-plan";
import { formatShortDate, parseDateOnly, todayDateString } from "@/lib/format";
import { getUserTimeZone } from "@/lib/timezone";
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

/** Um dia pendente (ainda não lido por mim) de algum pacote ativo, vencido (data <=
 * hoje) — capítulo de hoje ou atrasado de um dia anterior. A lista inteira (de todos
 * os pacotes ativos, não só o que tem dia hoje) sai ordenada por data crescente: os
 * mais atrasados primeiro, na ordem em que deveriam ter sido lidos, com o de hoje por
 * último. */
export interface PendingReadingItem {
  packageId: string;
  planDayId: string;
  packageTitle: string;
  dayNumber: number;
  totalDays: number;
  chapterTitle: string;
  date: string;
  dateLabel: string;
  isToday: boolean;
  firstPassage: Passage | null;
}

/** Progresso da família num pacote ativo — usado no bloco de planos da home, que
 * mostra todo pacote ativo (mesmo um sem dia configurado pra hoje), separado em
 * "planos pendentes" e "planos finalizados". */
export interface PlanFamilyStatus {
  packageId: string;
  packageTitle: string;
  dayNumber: number;
  totalDays: number;
  /** % de hoje na linha do tempo do plano (dia atual / total de dias). */
  percent: number;
  /** Plano "finalizado" pra mim é ter lido TODOS os dias do pacote (não só os já
   * vencidos) — inclusive os futuros, se eu tiver lido adiantado. Enquanto faltar
   * qualquer dia, o plano fica em "pendente", mesmo se eu estiver em dia com o
   * calendário até hoje. */
  finishedByMe: boolean;
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
  pendingItems: PendingReadingItem[];
  planFamily: PlanFamilyStatus[];
  activity: ActivityItem[];
}

export async function getHomeData(supabase: SupabaseServerClient, userId: string): Promise<HomeData> {
  // Tudo que não depende de resultado de outra query dispara junto numa onda só —
  // cada await sequencial soma uma viagem de rede inteira até o Supabase.
  const [{ data: currentUser }, { data: familyMembers }, activePlans, { data: comments }, { data: bookmarks }] =
    await Promise.all([
      supabase.from("users").select("name, role").eq("id", userId).single(),
      supabase.from("users").select("id, name, is_deleted, avatar_url").order("created_at", { ascending: true }),
      getActivePlans(supabase),
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

  // Segunda onda: depende dos dias vencidos/todos os dias dos planos ativos, mas as
  // duas queries entre si são independentes — disparam juntas. A segunda cobre TODOS
  // os pacotes ativos (não só um "featured") — cada plano ganha seu próprio bloco de
  // progresso da família na home.
  const allDueDayIds = activePlans.flatMap((plan) => plan.dueDayIds);
  const allActiveDayIds = activePlans.flatMap((plan) => plan.allDayIds);
  const [{ data: myProgress }, { data: allProgress }] = await Promise.all([
    allDueDayIds.length > 0
      ? supabase.from("reading_progress").select("plan_day_id").eq("user_id", userId).in("plan_day_id", allDueDayIds)
      : Promise.resolve({ data: [] as { plan_day_id: string }[] }),
    allActiveDayIds.length > 0
      ? supabase.from("reading_progress").select("user_id, plan_day_id").in("plan_day_id", allActiveDayIds)
      : Promise.resolve({ data: [] as { user_id: string; plan_day_id: string }[] }),
  ]);

  const myCompletedDayIds = new Set((myProgress ?? []).map((row) => row.plan_day_id));
  const today = todayDateString(await getUserTimeZone());

  const pendingItems: PendingReadingItem[] = activePlans
    .flatMap((plan) =>
      plan.days
        .filter((day) => day.date <= today && !myCompletedDayIds.has(day.id))
        .map((day) => ({
          packageId: plan.packageId,
          planDayId: day.id,
          packageTitle: plan.packageTitle,
          dayNumber: day.dayNumber,
          totalDays: plan.totalDays,
          chapterTitle: day.title,
          date: day.date,
          dateLabel: formatShortDate(parseDateOnly(day.date)),
          isToday: day.date === today,
          firstPassage: day.passages[0] ?? null,
        }))
    )
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const readDayIdsByMember = new Map<string, Set<string>>();
  for (const row of allProgress ?? []) {
    if (!row.plan_day_id) continue;
    let readDayIds = readDayIdsByMember.get(row.user_id);
    if (!readDayIds) readDayIdsByMember.set(row.user_id, (readDayIds = new Set()));
    readDayIds.add(row.plan_day_id);
  }

  const myReadDayIds = readDayIdsByMember.get(userId) ?? new Set<string>();

  const planFamily: PlanFamilyStatus[] = activePlans.map((plan) => {
    const packageDayIds = new Set(plan.allDayIds);
    const todayDay = plan.days.find((day) => day.date === today);
    return {
      packageId: plan.packageId,
      packageTitle: plan.packageTitle,
      dayNumber: plan.currentDayNumber,
      totalDays: plan.totalDays,
      percent: Math.round((plan.currentDayNumber / plan.totalDays) * 100),
      finishedByMe: plan.totalDays > 0 && plan.allDayIds.every((id) => myReadDayIds.has(id)),
      members: activeFamilyMembers.map((member) => {
        const readDayIds = readDayIdsByMember.get(member.id) ?? new Set<string>();
        const readInThisPackageCount = Array.from(readDayIds).filter((id) => packageDayIds.has(id)).length;
        return {
          id: member.id,
          name: member.name,
          avatarUrl: member.avatar_url,
          completed: todayDay ? readDayIds.has(todayDay.id) : plan.dueDayIds.every((id) => readDayIds.has(id)),
          late: plan.pastDueDayIds.some((id) => !readDayIds.has(id)),
          percent: plan.totalDays > 0 ? Math.round((readInThisPackageCount / plan.totalDays) * 100) : 0,
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
    pendingItems,
    planFamily,
    activity,
  };
}

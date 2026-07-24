import type { createClient } from "@/lib/supabase/server";
import { toDateOnlyString } from "@/lib/format";
import type { Passage } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface TodayPlanDay {
  packageId: string;
  packageTitle: string;
  packageDescription: string | null;
  planDayId: string;
  date: string;
  dayNumber: number;
  totalDays: number;
  chapterTitle: string;
  passages: Passage[];
  /** IDs de todos os dias do pacote com data <= hoje — pra calcular pendências por usuário. */
  dueDayIds: string[];
  /** IDs de TODOS os dias do pacote (passados, hoje e futuros) — pra calcular o quanto
   * cada pessoa da família já avançou no plano inteiro (não só o que já venceu). */
  allDayIds: string[];
}

interface PackageWithDaysRow {
  id: string;
  title: string;
  description: string | null;
  reading_plan_days: { id: string; date: string; title: string; passages: Passage[] }[];
}

/** Pacotes ativos que têm um dia configurado para hoje, na ordem de start_date.
 * Uma query só (dias embutidos via relação package_id) em vez de uma por pacote.
 * `types/database.ts` é escrito à mão e não modela Relationships, então o client
 * tipado não infere o formato do embed — o shape real é o de PackageWithDaysRow. */
export async function getActivePackagesWithToday(supabase: SupabaseServerClient): Promise<TodayPlanDay[]> {
  const today = toDateOnlyString();

  const { data } = await supabase
    .from("reading_packages")
    .select("id, title, description, reading_plan_days(id, date, title, passages)")
    .eq("status", "active")
    .order("start_date", { ascending: true });
  const packages = (data ?? []) as unknown as PackageWithDaysRow[];

  const results: TodayPlanDay[] = [];

  for (const pkg of packages) {
    const days = [...pkg.reading_plan_days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (days.length === 0) continue;

    const todayIndex = days.findIndex((day) => day.date === today);
    if (todayIndex === -1) continue;

    const todayDay = days[todayIndex];
    results.push({
      packageId: pkg.id,
      packageTitle: pkg.title,
      packageDescription: pkg.description,
      planDayId: todayDay.id,
      date: todayDay.date,
      dayNumber: todayIndex + 1,
      totalDays: days.length,
      chapterTitle: todayDay.title,
      passages: todayDay.passages,
      dueDayIds: days.filter((day) => day.date <= today).map((day) => day.id),
      allDayIds: days.map((day) => day.id),
    });
  }

  return results;
}

export function passageMatches(passage: Passage, bookId: string, chapter: number): boolean {
  return passage.book === bookId && chapter >= passage.chapter_start && chapter <= (passage.chapter_end ?? passage.chapter_start);
}

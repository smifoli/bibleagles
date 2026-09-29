import type { createClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/format";
import { getUserTimeZone } from "@/lib/timezone";
import type { Passage } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ActivePlanDay {
  id: string;
  date: string;
  dayNumber: number;
  title: string;
  passages: Passage[];
}

/** Um pacote com status 'active' e TODOS os seus dias — não só o de hoje, pra
 * dar pra listar pendências atrasadas mesmo num plano sem dia configurado pra
 * hoje exatamente (plano com furos entre datas, ou já com todos os dias no
 * passado). */
export interface ActivePlan {
  packageId: string;
  packageTitle: string;
  packageDescription: string | null;
  totalDays: number;
  /** Dia "atual" do plano — quantidade de dias já vencidos (clamp 1..totalDays),
   * mesmo critério de lib/package-stats-data.ts e lib/admin-packages-data.ts,
   * usado mesmo quando não existe um dia com date=hoje exato. */
  currentDayNumber: number;
  days: ActivePlanDay[];
  /** IDs de dias com data <= hoje — usados pra achar pendências por usuário. */
  dueDayIds: string[];
  /** IDs de dias com data < hoje (estritamente atrasados, exclui hoje). */
  pastDueDayIds: string[];
  /** IDs de TODOS os dias do pacote (passados, hoje e futuros). */
  allDayIds: string[];
}

interface PackageWithDaysRow {
  id: string;
  title: string;
  description: string | null;
  reading_plan_days: { id: string; date: string; title: string; passages: Passage[] }[];
}

/** Todos os pacotes ativos que têm pelo menos um dia configurado, na ordem de
 * start_date. Uma query só (dias embutidos via relação package_id) em vez de
 * uma por pacote. `types/database.ts` é escrito à mão e não modela
 * Relationships, então o client tipado não infere o formato do embed — o
 * shape real é o de PackageWithDaysRow. */
export async function getActivePlans(supabase: SupabaseServerClient): Promise<ActivePlan[]> {
  const today = todayDateString(await getUserTimeZone());

  const { data } = await supabase
    .from("reading_packages")
    .select("id, title, description, reading_plan_days(id, date, title, passages)")
    .eq("status", "active")
    .order("start_date", { ascending: true });
  const packages = (data ?? []) as unknown as PackageWithDaysRow[];

  const results: ActivePlan[] = [];

  for (const pkg of packages) {
    const sortedDays = [...pkg.reading_plan_days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    if (sortedDays.length === 0) continue;

    const days: ActivePlanDay[] = sortedDays.map((day, index) => ({
      id: day.id,
      date: day.date,
      dayNumber: index + 1,
      title: day.title,
      passages: day.passages,
    }));
    const totalDays = days.length;
    const currentDayNumber = Math.min(Math.max(days.filter((day) => day.date <= today).length, 1), totalDays);

    results.push({
      packageId: pkg.id,
      packageTitle: pkg.title,
      packageDescription: pkg.description,
      totalDays,
      currentDayNumber,
      days,
      dueDayIds: days.filter((day) => day.date <= today).map((day) => day.id),
      pastDueDayIds: days.filter((day) => day.date < today).map((day) => day.id),
      allDayIds: days.map((day) => day.id),
    });
  }

  return results;
}

export function passageMatches(passage: Passage, bookId: string, chapter: number): boolean {
  return passage.book === bookId && chapter >= passage.chapter_start && chapter <= (passage.chapter_end ?? passage.chapter_start);
}

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
}

/** Pacotes ativos que têm um dia configurado para hoje, na ordem de start_date. */
export async function getActivePackagesWithToday(supabase: SupabaseServerClient): Promise<TodayPlanDay[]> {
  const today = toDateOnlyString();

  const { data: packages } = await supabase
    .from("reading_packages")
    .select("id, title, description")
    .eq("status", "active")
    .order("start_date", { ascending: true });

  const results: TodayPlanDay[] = [];

  for (const pkg of packages ?? []) {
    const { data: days } = await supabase
      .from("reading_plan_days")
      .select("id, date, title, passages")
      .eq("package_id", pkg.id)
      .order("date", { ascending: true });

    if (!days || days.length === 0) continue;

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
    });
  }

  return results;
}

export function passageMatches(passage: Passage, bookId: string, chapter: number): boolean {
  return passage.book === bookId && chapter >= passage.chapter_start && chapter <= (passage.chapter_end ?? passage.chapter_start);
}

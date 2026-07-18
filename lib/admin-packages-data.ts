import type { createClient } from "@/lib/supabase/server";
import { formatShortDate, parseDateOnly, toDateOnlyString } from "@/lib/format";
import type { PackageStatus } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AdminPackageSummary {
  id: string;
  title: string;
  status: PackageStatus;
  totalDays: number;
  currentDayNumber: number;
  progressPercent: number;
  startDateLabel: string;
}

export interface AdminPackagesOverview {
  active: AdminPackageSummary[];
  draft: AdminPackageSummary[];
  archived: AdminPackageSummary[];
}

/** Visão geral de todos os pacotes agrupados por status, pra aba Pacotes de /admin. */
export async function getAdminPackagesOverview(supabase: SupabaseServerClient): Promise<AdminPackagesOverview> {
  const [{ data: packages }, { data: days }] = await Promise.all([
    supabase.from("reading_packages").select("id, title, status, start_date").order("start_date", { ascending: false }),
    supabase.from("reading_plan_days").select("package_id, date"),
  ]);

  const daysByPackage = new Map<string, string[]>();
  for (const day of days ?? []) {
    const list = daysByPackage.get(day.package_id) ?? [];
    list.push(day.date);
    daysByPackage.set(day.package_id, list);
  }

  const today = toDateOnlyString();
  const overview: AdminPackagesOverview = { active: [], draft: [], archived: [] };

  for (const pkg of packages ?? []) {
    const packageDays = (daysByPackage.get(pkg.id) ?? []).sort();
    const totalDays = packageDays.length;
    const currentDayNumber = totalDays === 0 ? 0 : Math.min(Math.max(packageDays.filter((date) => date <= today).length, 1), totalDays);
    const progressPercent = totalDays === 0 ? 0 : Math.round((currentDayNumber / totalDays) * 100);

    const summary: AdminPackageSummary = {
      id: pkg.id,
      title: pkg.title,
      status: pkg.status,
      totalDays,
      currentDayNumber,
      progressPercent,
      startDateLabel: formatShortDate(parseDateOnly(pkg.start_date)),
    };

    overview[pkg.status].push(summary);
  }

  return overview;
}

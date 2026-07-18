import type { createClient } from "@/lib/supabase/server";
import type { Passage, PackageStatus } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface EditablePackageDay {
  date: string;
  title: string;
  passages: Passage[];
}

export interface EditablePackage {
  id: string;
  title: string;
  description: string;
  status: PackageStatus;
  days: EditablePackageDay[];
}

/** Pacote + dias pra pré-popular o editor de /admin/package/[id]/edit. Null se não existir. */
export async function getPackageForEdit(supabase: SupabaseServerClient, packageId: string): Promise<EditablePackage | null> {
  const [{ data: pkg }, { data: days }] = await Promise.all([
    supabase.from("reading_packages").select("id, title, description, status").eq("id", packageId).maybeSingle(),
    supabase.from("reading_plan_days").select("date, title, passages").eq("package_id", packageId).order("date", { ascending: true }),
  ]);

  if (!pkg) return null;

  return {
    id: pkg.id,
    title: pkg.title,
    description: pkg.description ?? "",
    status: pkg.status,
    days: (days ?? []).map((day) => ({ date: day.date, title: day.title, passages: day.passages })),
  };
}

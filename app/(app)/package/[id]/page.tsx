import { notFound } from "next/navigation";
import { PackageStatsView } from "@/components/package/PackageStatsView";
import { getPackageStats } from "@/lib/package-stats-data";
import { createClient } from "@/lib/supabase/server";

export default async function PackageStatsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: profile }, stats] = await Promise.all([
    supabase.from("users").select("role").eq("id", user.id).single(),
    getPackageStats(supabase, params.id, user.id),
  ]);

  if (!stats) notFound();

  return <PackageStatsView stats={stats} canEdit={profile?.role === "admin"} />;
}

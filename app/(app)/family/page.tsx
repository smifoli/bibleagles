import { notFound } from "next/navigation";
import { FamilyFeedView } from "@/components/family/FamilyFeedView";
import { getFamilyFeedData } from "@/lib/family-data";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function FamilyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) notFound();

  const [items, { data: profile }] = await Promise.all([
    getFamilyFeedData(supabase),
    supabase.from("users").select("role").eq("id", user.id).single(),
  ]);

  return <FamilyFeedView items={items} currentUserId={user.id} isAdmin={profile?.role === "admin"} />;
}

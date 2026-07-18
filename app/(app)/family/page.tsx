import { notFound } from "next/navigation";
import { FamilyFeedView } from "@/components/family/FamilyFeedView";
import { getFamilyFeedData } from "@/lib/family-data";
import { createClient } from "@/lib/supabase/server";

export default async function FamilyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const items = await getFamilyFeedData(supabase);

  return <FamilyFeedView items={items} />;
}

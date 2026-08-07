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
    supabase.from("users").select("role, family_feed_seen_at").eq("id", user.id).single(),
  ]);

  // Marca a visita como "agora" só depois de já ter lido o valor anterior acima
  // (lastSeenAt) — senão todo item ficaria "visto" antes mesmo de ser mostrado.
  // Com await: em ambiente serverless a função pode ser encerrada assim que a
  // resposta é enviada, então uma escrita "fire-and-forget" arriscaria nunca rodar.
  await supabase.from("users").update({ family_feed_seen_at: new Date().toISOString() }).eq("id", user.id);

  return (
    <FamilyFeedView
      items={items}
      currentUserId={user.id}
      isAdmin={profile?.role === "admin"}
      lastSeenAt={profile?.family_feed_seen_at ?? null}
    />
  );
}

"use server";

import { createClient, getUser } from "@/lib/supabase/server";

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Uma inscrição por endpoint (unique na tabela) — upsert em vez de insert pra
// o mesmo aparelho reativar notificações sem esbarrar na constraint.
export async function savePushSubscription(subscription: PushSubscriptionRow): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({ user_id: user.id, ...subscription }, { onConflict: "endpoint" });

  if (error) return { error: "Não foi possível ativar as notificações neste aparelho." };
  return {};
}

export async function deletePushSubscription(endpoint: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) return { error: "Não foi possível desativar as notificações." };
  return {};
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";

export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) return { error: "Não foi possível marcar como lida." };

  revalidatePath("/notifications");
  // "layout" pra atualizar o badge de não lidas no BottomNav, que vive no
  // layout compartilhado de todas as páginas de dentro de (app), não só /notifications.
  revalidatePath("/", "layout");
  return {};
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) return { error: "Não foi possível marcar todas como lidas." };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return {};
}

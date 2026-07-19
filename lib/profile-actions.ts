"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Language } from "@/types/database";

export async function updateProfileName(name: string): Promise<{ error?: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "O nome não pode ficar vazio." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase.from("users").update({ name: trimmed }).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar o nome." };

  revalidatePath("/profile");
  return {};
}

export async function updatePreferences(version: string, language: Language): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("users")
    .update({ preferred_version: version, preferred_language: language })
    .eq("id", user.id);
  if (error) return { error: "Não foi possível salvar as preferências." };

  revalidatePath("/profile");
  return {};
}

export async function updateNotifications(enabled: boolean, time: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("users")
    .update({ notification_enabled: enabled, notification_time: time })
    .eq("id", user.id);
  if (error) return { error: "Não foi possível salvar as notificações." };

  revalidatePath("/profile");
  return {};
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

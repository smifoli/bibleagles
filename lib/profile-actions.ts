"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient, getUser } from "@/lib/supabase/server";
import { FONT_SIZE_COOKIE } from "@/lib/font-size";
import type { FontSizePreference, Language } from "@/types/database";

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

export async function updateFontSize(fontSize: FontSizePreference): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase.from("users").update({ font_size: fontSize }).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar o tamanho da letra." };

  // Grava também num cookie (1 ano) pra o layout aplicar o tamanho sem
  // precisar consultar o banco em toda navegação — só a troca de preferência
  // paga essa escrita.
  const cookieStore = await cookies();
  cookieStore.set(FONT_SIZE_COOKIE, fontSize, { maxAge: 60 * 60 * 24 * 365, path: "/" });

  revalidatePath("/", "layout");
  return {};
}

/**
 * Persiste a URL da foto de perfil já enviada pro bucket 'avatars' (upload
 * feito client-side, direto no Storage, antes de chamar essa action). `null`
 * remove a foto e volta pra bolinha com a inicial.
 */
export async function updateAvatarUrl(avatarUrl: string | null): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase.from("users").update({ avatar_url: avatarUrl }).eq("id", user.id);
  if (error) return { error: "Não foi possível salvar a foto." };

  // A foto aparece em vários lugares do app (perfil, comentários, destaques) —
  // mesmo alcance de revalidação usado pelo tamanho da letra.
  revalidatePath("/", "layout");
  return {};
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { HighlightColor } from "@/types/database";

export async function toggleHighlight(
  book: string,
  chapter: number,
  verse: number,
  version: string,
  color: HighlightColor
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("bookmarks")
    .upsert(
      { user_id: user.id, book, chapter, verse, bible_version: version, color },
      { onConflict: "user_id,book,chapter,verse,bible_version" }
    );

  if (error) return { error: "Não foi possível salvar o destaque." };

  revalidatePath(`/read/${book}/${chapter}`);
  return {};
}

export async function addComment(
  book: string,
  chapter: number,
  verse: number,
  version: string,
  content: string
): Promise<{ error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Escreva algo antes de comentar." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("comments")
    .insert({ user_id: user.id, book, chapter, verse, bible_version: version, content: trimmed, parent_id: null });

  if (error) return { error: "Não foi possível enviar o comentário." };

  revalidatePath(`/read/${book}/${chapter}`);
  return {};
}

export async function markPlanDayRead(book: string, chapter: number, planDayId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  // upsert pela unique(user_id, plan_day_id): idempotente caso o botão seja
  // tocado de novo antes de re-renderizar como desabilitado.
  const { error } = await supabase
    .from("reading_progress")
    .upsert({ user_id: user.id, plan_day_id: planDayId }, { onConflict: "user_id,plan_day_id" });

  if (error) return { error: "Não foi possível marcar como lido." };

  revalidatePath(`/read/${book}/${chapter}`);
  revalidatePath("/");
  return {};
}

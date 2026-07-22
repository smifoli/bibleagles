"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import type { HighlightColor } from "@/types/database";

/**
 * Clicar na cor já selecionada remove o destaque; qualquer outra cor
 * substitui a atual (upsert). `currentColor` é a cor já marcada pelo próprio
 * usuário nesse versículo (ou null se não há nenhuma).
 */
export async function toggleHighlight(
  book: string,
  chapter: number,
  verse: number,
  version: string,
  color: HighlightColor,
  currentColor: HighlightColor | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } =
    color === currentColor
      ? await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("book", book)
          .eq("chapter", chapter)
          .eq("verse", verse)
          .eq("bible_version", version)
      : await supabase
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
  content: string,
  parentId: string | null = null
): Promise<{ error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Escreva algo antes de comentar." };

  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("comments")
    .insert({ user_id: user.id, book, chapter, verse, bible_version: version, content: trimmed, parent_id: parentId });

  // Réplica a uma resposta (não a uma raiz) é barrada pelo trigger
  // enforce_comment_depth — repassamos como erro amigável.
  if (error) return { error: "Não foi possível enviar o comentário." };

  revalidatePath(`/read/${book}/${chapter}`);
  return {};
}

export async function editComment(
  book: string,
  chapter: number,
  commentId: string,
  content: string
): Promise<{ error?: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Escreva algo antes de salvar." };

  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("comments")
    .update({ content: trimmed })
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return { error: "Não foi possível salvar a edição." };

  revalidatePath(`/read/${book}/${chapter}`);
  return {};
}

/** Apaga um comentário — o próprio autor ou um admin (RLS decide de fato). */
export async function deleteComment(book: string, chapter: number, commentId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase.from("comments").delete().eq("id", commentId);

  if (error) return { error: "Não foi possível apagar o comentário." };

  revalidatePath(`/read/${book}/${chapter}`);
  return {};
}

export async function toggleCommentLike(
  book: string,
  chapter: number,
  commentId: string,
  liked: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = liked
    ? await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", user.id)
    : await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: user.id });

  if (error) return { error: "Não foi possível curtir o comentário." };

  revalidatePath(`/read/${book}/${chapter}`);
  return {};
}

export async function markPlanDayRead(book: string, chapter: number, planDayId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  // upsert pela unique(user_id, plan_day_id): idempotente caso o botão seja
  // tocado de novo antes de re-renderizar como desabilitado.
  const { error } = await supabase
    .from("reading_progress")
    .upsert({ user_id: user.id, plan_day_id: planDayId, book: null, chapter: null }, { onConflict: "user_id,plan_day_id" });

  if (error) return { error: "Não foi possível marcar como lido." };

  revalidatePath(`/read/${book}/${chapter}`);
  revalidatePath("/bible");
  revalidatePath(`/bible/${book}`);
  revalidatePath("/");
  return {};
}

/** Desfaz o "marcar como lido" — permite corrigir um toque por engano. */
export async function unmarkPlanDayRead(book: string, chapter: number, planDayId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("reading_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("plan_day_id", planDayId);

  if (error) return { error: "Não foi possível desmarcar." };

  revalidatePath(`/read/${book}/${chapter}`);
  revalidatePath("/bible");
  revalidatePath(`/bible/${book}`);
  revalidatePath("/");
  return {};
}

/**
 * Marca um capítulo como lido fora de qualquer plano — ex.: navegação livre pela
 * Bíblia num capítulo que não faz parte de nenhum pacote. Grava direto em
 * (book, chapter), sem plan_day_id (ver reading_progress_target_check na migration).
 */
export async function markChapterRead(book: string, chapter: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("reading_progress")
    .upsert({ user_id: user.id, book, chapter, plan_day_id: null }, { onConflict: "user_id,book,chapter" });

  if (error) return { error: "Não foi possível marcar como lido." };

  revalidatePath(`/read/${book}/${chapter}`);
  revalidatePath("/bible");
  revalidatePath(`/bible/${book}`);
  revalidatePath("/");
  return {};
}

export async function unmarkChapterRead(book: string, chapter: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("reading_progress")
    .delete()
    .eq("user_id", user.id)
    .eq("book", book)
    .eq("chapter", chapter);

  if (error) return { error: "Não foi possível desmarcar." };

  revalidatePath(`/read/${book}/${chapter}`);
  revalidatePath("/bible");
  revalidatePath(`/bible/${book}`);
  revalidatePath("/");
  return {};
}

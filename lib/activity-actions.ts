"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Apaga um item de atividade (comentário ou destaque) da home/família — o
 * próprio autor ou um admin (a permissão de fato é decidida pelas RLS
 * policies "*_own_delete"/"*_admin_delete" no banco; aqui só repassamos o id).
 */
export async function deleteActivityItem(kind: "comment" | "highlight", id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const table = kind === "comment" ? "comments" : "bookmarks";
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { error: kind === "comment" ? "Não foi possível apagar o comentário." : "Não foi possível remover o destaque." };

  revalidatePath("/");
  revalidatePath("/family");
  return {};
}

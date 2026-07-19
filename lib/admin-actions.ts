"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

// PRD 3.11 / issue #16: só admin altera papel de outro usuário, e nunca o
// próprio (regra reforçada aqui e também pelo trigger protect_user_role_trigger
// no banco — ver supabase/migrations/20260616120000_initial_schema.sql).
export async function updateMemberRole(memberId: string, nextRole: UserRole): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  if (memberId === user.id) return { error: "Você não pode alterar seu próprio papel." };

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Apenas administradores podem alterar papéis." };

  const { error } = await supabase.from("users").update({ role: nextRole }).eq("id", memberId);
  if (error) return { error: "Não foi possível atualizar o papel do membro." };

  revalidatePath("/admin");
  return {};
}

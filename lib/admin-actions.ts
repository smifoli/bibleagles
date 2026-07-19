"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

/**
 * Remove um membro da família. `deleteContent = true` apaga a conta e, em
 * cascata (FKs no banco), todos os comentários/destaques/progresso dele.
 * `deleteContent = false` só bane o login (não consegue mais entrar) e marca
 * `is_deleted` — o perfil e o conteúdo ficam, mas o nome passa a aparecer
 * como "Nome (deletado)" em qualquer lugar que hoje mostra o autor.
 */
export async function deleteMember(memberId: string, deleteContent: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  if (memberId === user.id) return { error: "Você não pode remover a si mesmo." };

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Apenas administradores podem remover membros." };

  const admin = createAdminClient();

  if (deleteContent) {
    const { error } = await admin.auth.admin.deleteUser(memberId);
    if (error) return { error: "Não foi possível remover o membro." };
  } else {
    // ~100 anos — a Admin API não tem um valor literal "permanente", esse é
    // o workaround padrão da própria documentação da Supabase.
    const { error: banError } = await admin.auth.admin.updateUserById(memberId, { ban_duration: "876000h" });
    if (banError) return { error: "Não foi possível remover o membro." };

    const { error: updateError } = await supabase.from("users").update({ is_deleted: true }).eq("id", memberId);
    if (updateError) return { error: "Não foi possível remover o membro." };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/family");
  return {};
}

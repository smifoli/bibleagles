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

const ANNOUNCEMENT_MAX_LENGTH = 300;

/**
 * Aviso livre do admin pra família inteira (push + item em "Avisos"), tipo
 * `announcement` (ver migration 20260917120000). Uma linha por destinatário —
 * o insert em massa é o que dispara, um webhook por linha, o push de cada um
 * (mesmo trigger notify_push_on_new_notification de qualquer notificação).
 * O check de admin aqui é só UX (erro cedo, sem round-trip); quem garante de
 * verdade é a policy notifications_admin_insert_announcement no banco.
 */
export async function sendAnnouncement(message: string): Promise<{ error?: string; sentCount?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return { error: "Sessão expirada." };

  const trimmed = message.trim();
  if (!trimmed) return { error: "Escreva uma mensagem." };
  if (trimmed.length > ANNOUNCEMENT_MAX_LENGTH) return { error: `Mensagem muito longa (máximo ${ANNOUNCEMENT_MAX_LENGTH} caracteres).` };

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Apenas administradores podem enviar avisos." };

  const { data: recipients, error: recipientsError } = await supabase
    .from("users")
    .select("id")
    .eq("is_deleted", false)
    .neq("id", user.id);
  if (recipientsError) return { error: "Não foi possível buscar os destinatários." };
  if (!recipients || recipients.length === 0) return { error: "Não há outros membros pra avisar." };

  const rows = recipients.map((recipient) => ({
    recipient_id: recipient.id,
    actor_id: user.id,
    type: "announcement" as const,
    message: trimmed,
  }));
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) return { error: "Não foi possível enviar o aviso." };

  revalidatePath("/admin");
  return { sentCount: recipients.length };
}

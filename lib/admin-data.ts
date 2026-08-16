import type { createClient } from "@/lib/supabase/server";
import type { CommentNotificationScope, UserRole } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  pushActive: boolean;
  pushDeviceCount: number;
  reminderEnabled: boolean;
  reminderTime: string; // "HH:MM"
  commentScope: CommentNotificationScope;
  chapterReadEnabled: boolean;
}

export async function getAdminMembers(supabase: SupabaseServerClient): Promise<AdminMember[]> {
  // push_subscriptions só é legível pelo dono da linha ou por admin (policy
  // push_subscriptions_select_admin, migration 20260816120000) — sem ela essa
  // segunda query voltaria vazia pra qualquer membro que não fosse o próprio.
  const [{ data: users }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, name, email, avatar_url, role, notification_enabled, notification_time, comment_notification_scope, chapter_read_notifications"
      )
      .eq("is_deleted", false)
      .order("name", { ascending: true }),
    supabase.from("push_subscriptions").select("user_id"),
  ]);

  // Uma linha por aparelho/navegador inscrito (ver migration
  // 20260814190000_add_push_subscriptions.sql) — conta quantas cada usuário tem.
  const deviceCountByUser = new Map<string, number>();
  for (const row of subscriptions ?? []) {
    deviceCountByUser.set(row.user_id, (deviceCountByUser.get(row.user_id) ?? 0) + 1);
  }

  return (users ?? []).map((row) => {
    const pushDeviceCount = deviceCountByUser.get(row.id) ?? 0;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url,
      role: row.role,
      pushActive: pushDeviceCount > 0,
      pushDeviceCount,
      reminderEnabled: row.notification_enabled,
      reminderTime: (row.notification_time ?? "07:00:00").slice(0, 5),
      commentScope: row.comment_notification_scope,
      chapterReadEnabled: row.chapter_read_notifications,
    };
  });
}

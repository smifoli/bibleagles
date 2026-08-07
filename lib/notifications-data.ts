import { getBookMeta } from "@/lib/bible-books";
import type { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actorName: string;
  read: boolean;
  createdAt: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  version: string;
  commentContent: string;
}

/** Só a contagem — usada no badge do sino, presente em toda página (ver AppLayout). */
export async function getUnreadNotificationCount(supabase: SupabaseServerClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  return count ?? 0;
}

const NOTIFICATIONS_LIMIT = 100;

export async function getNotificationsData(supabase: SupabaseServerClient, userId: string): Promise<NotificationItem[]> {
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, actor_id, comment_id, read_at, created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  if (!notifications || notifications.length === 0) return [];

  // types/database.ts não modela Relationships (mesma decisão de reader-data.ts) —
  // busca à parte de autores e comentários em vez de embed, e junta em memória.
  const actorIds = Array.from(new Set(notifications.map((row) => row.actor_id)));
  const commentIds = Array.from(new Set(notifications.map((row) => row.comment_id)));

  const [{ data: actors }, { data: comments }] = await Promise.all([
    supabase.from("users").select("id, name, is_deleted").in("id", actorIds),
    supabase.from("comments").select("id, book, chapter, verse, bible_version, content").in("id", commentIds),
  ]);

  const actorNames = new Map(
    (actors ?? []).map((actor) => [actor.id, actor.is_deleted ? `${actor.name} (deletado)` : actor.name])
  );
  const commentById = new Map((comments ?? []).map((comment) => [comment.id, comment]));

  return notifications.flatMap((row): NotificationItem[] => {
    const comment = commentById.get(row.comment_id);
    // Comentário apagado depois da notificação seria removido em cascata (fk on
    // delete cascade) — chegar aqui sem ele não deveria acontecer, mas não
    // quebra a lista por causa de uma linha inconsistente.
    if (!comment) return [];

    return [
      {
        id: row.id,
        type: row.type as NotificationType,
        actorName: actorNames.get(row.actor_id) ?? "Alguém",
        read: row.read_at !== null,
        createdAt: row.created_at,
        book: comment.book,
        bookName: getBookMeta(comment.book)?.name ?? comment.book,
        chapter: comment.chapter,
        verse: comment.verse,
        version: comment.bible_version,
        commentContent: comment.content,
      },
    ];
  });
}

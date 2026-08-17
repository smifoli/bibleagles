import { getBookMeta } from "@/lib/bible-books";
import type { createClient } from "@/lib/supabase/server";
import type { NotificationType } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actorName: string;
  actorAvatarUrl: string | null;
  /** Índice estável do autor na família (ordem de criação) — cor de identidade do avatar, igual ao resto do app. */
  actorColorIndex: number;
  read: boolean;
  createdAt: string;
  book: string;
  bookName: string;
  chapter: number;
  /** null em chapter_read — a referência é o capítulo inteiro, sem versículo/versão/conteúdo. */
  verse: number | null;
  version: string | null;
  commentContent: string | null;
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
    .select("id, type, actor_id, comment_id, book, chapter, read_at, created_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);

  if (!notifications || notifications.length === 0) return [];

  // types/database.ts não modela Relationships (mesma decisão de reader-data.ts) —
  // busca à parte de autores e comentários em vez de embed, e junta em memória.
  // Família inteira (não só os actorIds) pra manter o mesmo colorIndex por ordem
  // de criação usado em bookmarks/reader — ver colorIndexFor em lib/bookmarks-data.ts.
  const commentIds = Array.from(new Set(notifications.flatMap((row) => (row.comment_id ? [row.comment_id] : []))));

  const [{ data: familyMembers }, { data: comments }] = await Promise.all([
    supabase.from("users").select("id, name, is_deleted, avatar_url").order("created_at", { ascending: true }),
    commentIds.length > 0
      ? supabase.from("comments").select("id, book, chapter, verse, bible_version, content").in("id", commentIds)
      : Promise.resolve({ data: [] as { id: string; book: string; chapter: number; verse: number; bible_version: string; content: string }[] }),
  ]);

  const memberOrder = new Map((familyMembers ?? []).map((member, index) => [member.id, index]));
  const actorNames = new Map(
    (familyMembers ?? []).map((member) => [member.id, member.is_deleted ? `${member.name} (deletado)` : member.name])
  );
  const actorAvatars = new Map((familyMembers ?? []).map((member) => [member.id, member.avatar_url]));
  const commentById = new Map((comments ?? []).map((comment) => [comment.id, comment]));

  return notifications.flatMap((row): NotificationItem[] => {
    const base = {
      id: row.id,
      type: row.type as NotificationType,
      actorName: actorNames.get(row.actor_id) ?? "Alguém",
      actorAvatarUrl: actorAvatars.get(row.actor_id) ?? null,
      actorColorIndex: memberOrder.get(row.actor_id) ?? 0,
      read: row.read_at !== null,
      createdAt: row.created_at,
    };

    // chapter_read não tem comentário: a referência (book, chapter) vem da
    // própria notificação e aponta pro capítulo inteiro.
    if (row.type === "chapter_read") {
      if (!row.book || !row.chapter) return [];
      return [
        {
          ...base,
          book: row.book,
          bookName: getBookMeta(row.book)?.name ?? row.book,
          chapter: row.chapter,
          verse: null,
          version: null,
          commentContent: null,
        },
      ];
    }

    const comment = row.comment_id ? commentById.get(row.comment_id) : undefined;
    // Comentário apagado depois da notificação seria removido em cascata (fk on
    // delete cascade) — chegar aqui sem ele não deveria acontecer, mas não
    // quebra a lista por causa de uma linha inconsistente.
    if (!comment) return [];

    return [
      {
        ...base,
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

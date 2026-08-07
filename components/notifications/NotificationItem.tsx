"use client";

import Link from "next/link";
import { formatRelativeTime } from "@/lib/format";
import { markNotificationRead } from "@/lib/notifications-actions";
import type { NotificationItem as NotificationItemData } from "@/lib/notifications-data";

const VERB_BY_TYPE: Record<NotificationItemData["type"], string> = {
  comment_reply: "respondeu seu comentário em",
  comment_on_thread: "comentou em",
  comment_like: "curtiu seu comentário em",
  comment_on_read_chapter: "comentou em",
};

// Só o tipo "leu o capítulo" precisa desse lembrete — os outros já deixam a
// relação com o destinatário clara pelo verbo (respondeu/comentou na mesma
// conversa/curtiu).
const SUFFIX_BY_TYPE: Partial<Record<NotificationItemData["type"], string>> = {
  comment_on_read_chapter: ", que você já leu",
};

export function NotificationItem({ item }: { item: NotificationItemData }) {
  const reference = `${item.bookName} ${item.chapter}:${item.verse}`;
  const href = `/read/${item.book}/${item.chapter}?version=${item.version}&verse=${item.verse}&from=${encodeURIComponent("/notifications")}`;

  return (
    <Link
      href={href}
      prefetch={false}
      // Marca como lida ao abrir — sem esperar a resposta: a navegação não
      // deve travar por causa disso, e o badge/lista só refletem no próximo
      // carregamento (revalidatePath dentro da action).
      onClick={() => {
        if (!item.read) markNotificationRead(item.id);
      }}
      className={`flex items-start gap-3 rounded-[14px] border border-border px-3.5 py-3 ${item.read ? "bg-surface" : "bg-canvas"}`}
    >
      <span className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${item.read ? "bg-transparent" : "bg-ink"}`} />
      <div className="min-w-0 flex-1">
        <div className={`text-[calc(13px*var(--font-scale))] leading-[1.5] ${item.read ? "text-text-secondary" : "text-text-primary"}`}>
          <span className="font-medium">{item.actorName}</span> {VERB_BY_TYPE[item.type]}{" "}
          <span className="text-link">{reference}</span>
          {SUFFIX_BY_TYPE[item.type]}
        </div>
        <div className="mt-0.5 truncate font-serif text-[calc(13px*var(--font-scale))] italic text-text-muted">
          &quot;{item.commentContent}&quot;
        </div>
        <div className="mt-px text-[calc(11px*var(--font-scale))] text-[#a3927d]">{formatRelativeTime(new Date(item.createdAt))}</div>
      </div>
    </Link>
  );
}

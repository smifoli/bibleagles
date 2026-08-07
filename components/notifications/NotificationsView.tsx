import { MarkAllReadButton } from "@/components/notifications/MarkAllReadButton";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import type { NotificationItem as NotificationItemData } from "@/lib/notifications-data";

export function NotificationsView({ items }: { items: NotificationItemData[] }) {
  const hasUnread = items.some((item) => !item.read);

  return (
    <div className="flex min-h-dvh flex-col gap-[17px]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[calc(20px*var(--font-scale))] font-semibold text-text-primary">Notificações</div>
          <p className="mt-0.5 text-[calc(12px*var(--font-scale))] text-text-muted">Respostas, comentários e curtidas</p>
        </div>
        {hasUnread && <MarkAllReadButton />}
      </header>

      {items.length === 0 ? (
        <p className="text-[calc(14px*var(--font-scale))] text-text-muted">Nenhuma notificação ainda.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => (
            <NotificationItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

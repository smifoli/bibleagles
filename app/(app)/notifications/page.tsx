import { notFound } from "next/navigation";
import { NotificationsView } from "@/components/notifications/NotificationsView";
import { getNotificationsData } from "@/lib/notifications-data";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) notFound();

  const items = await getNotificationsData(supabase, user.id);

  // Abrir a aba já conta como "visto" — evita depender de clicar item a item
  // ou no botão "marcar todas como lidas" só pra sumir o badge do sino. Roda
  // depois de buscar `items`, então esta renderização ainda mostra o destaque
  // visual de quem estava não lido; só a próxima visita chega tudo já lido.
  // Sem risco de prefetch disparar isso à toa: a rota é force-dynamic sem
  // loading.tsx, então o Link do BottomNav não pré-renderiza este Server
  // Component antes do usuário realmente abrir a aba.
  if (items.some((item) => !item.read)) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id).is("read_at", null);
  }

  return <NotificationsView items={items} />;
}

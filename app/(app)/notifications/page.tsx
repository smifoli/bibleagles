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

  return <NotificationsView items={items} />;
}

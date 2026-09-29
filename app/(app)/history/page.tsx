import { notFound } from "next/navigation";
import { ReadingHistoryView } from "@/components/history/ReadingHistoryView";
import { getReadingHistory } from "@/lib/reading-history-data";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function ReadingHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) notFound();

  const items = await getReadingHistory(supabase, user.id);

  return <ReadingHistoryView items={items} />;
}

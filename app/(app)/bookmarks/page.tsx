import { notFound } from "next/navigation";
import { BookmarksView } from "@/components/bookmarks/BookmarksView";
import { getBookmarksData } from "@/lib/bookmarks-data";
import { createClient } from "@/lib/supabase/server";

export default async function BookmarksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const data = await getBookmarksData(supabase, user.id);

  return <BookmarksView bookmarks={data.bookmarks} books={data.books} />;
}

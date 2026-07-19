import { redirect } from "next/navigation";
import { PackageEditorView } from "@/components/admin/PackageEditorView";
import { BOOK_ORDER } from "@/lib/bible-books";
import { getDefaultVersion } from "@/lib/bible-versions";
import { tryGetBookSummary } from "@/lib/bible-data";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function NewPackagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const version = getDefaultVersion("pt").abbreviation;
  const bookChapterCounts = Object.fromEntries(
    BOOK_ORDER.map((bookId) => [bookId, tryGetBookSummary(version, bookId)?.chapterCount ?? 1])
  );

  return <PackageEditorView mode="new" bookChapterCounts={bookChapterCounts} />;
}

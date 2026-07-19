import { notFound, redirect } from "next/navigation";
import { PackageEditorView } from "@/components/admin/PackageEditorView";
import { BOOK_ORDER } from "@/lib/bible-books";
import { getDefaultVersion } from "@/lib/bible-versions";
import { tryGetBookSummary } from "@/lib/bible-data";
import { getPackageForEdit } from "@/lib/package-admin-data";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function EditPackagePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const editable = await getPackageForEdit(supabase, params.id);
  if (!editable) notFound();

  const version = getDefaultVersion("pt").abbreviation;
  const bookChapterCounts = Object.fromEntries(
    BOOK_ORDER.map((bookId) => [bookId, tryGetBookSummary(version, bookId)?.chapterCount ?? 1])
  );

  return <PackageEditorView mode="edit" packageId={editable.id} initial={editable} bookChapterCounts={bookChapterCounts} />;
}

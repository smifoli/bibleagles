import { notFound } from "next/navigation";
import { ChapterGridView } from "@/components/bible-nav/ChapterGridView";
import { BIBLE_VERSIONS, getDefaultVersion, getVersionByAbbreviation } from "@/lib/bible-versions";
import { tryGetBookSummary } from "@/lib/bible-data";
import { getChapterActivityForBook } from "@/lib/bible-nav-data";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function BibleBookPage({
  params,
  searchParams,
}: {
  params: { book: string };
  searchParams: { version?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) notFound();

  const requestedVersion = searchParams.version ? getVersionByAbbreviation(searchParams.version) : undefined;

  // Só busca a preferência salva quando a versão não vier na URL (o seletor
  // de versão e a navegação a partir de /bible sempre a incluem).
  const { data: profile } = requestedVersion
    ? { data: null }
    : await supabase.from("users").select("preferred_version, preferred_language").eq("id", user.id).single();

  const version =
    requestedVersion ??
    (profile?.preferred_version ? getVersionByAbbreviation(profile.preferred_version) : undefined) ??
    getDefaultVersion(profile?.preferred_language ?? "pt");

  const bookId = params.book.toUpperCase();
  const summary = tryGetBookSummary(version.abbreviation, bookId);
  if (!summary) notFound();

  const chapterActivity = await getChapterActivityForBook(supabase, bookId);

  return (
    <ChapterGridView
      bookId={bookId}
      bookName={summary.name}
      chapterCount={summary.chapterCount}
      version={version.abbreviation}
      versions={BIBLE_VERSIONS}
      chapterActivity={Array.from(chapterActivity.entries())}
    />
  );
}

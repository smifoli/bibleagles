import { notFound } from "next/navigation";
import { ReaderView } from "@/components/reader/ReaderView";
import { BIBLE_VERSIONS, getDefaultVersion, getVersionByAbbreviation } from "@/lib/bible-versions";
import { getReaderData } from "@/lib/reader-data";
import { createClient } from "@/lib/supabase/server";

export default async function ReaderPage({
  params,
  searchParams,
}: {
  params: { book: string; chapter: string };
  searchParams: { version?: string; verse?: string };
}) {
  const chapter = Number(params.chapter);
  if (!Number.isInteger(chapter) || chapter <= 0) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("users")
    .select("preferred_version, preferred_language")
    .eq("id", user.id)
    .single();

  const requestedVersion = searchParams.version ? getVersionByAbbreviation(searchParams.version) : undefined;
  const version =
    requestedVersion ??
    (profile?.preferred_version ? getVersionByAbbreviation(profile.preferred_version) : undefined) ??
    getDefaultVersion(profile?.preferred_language ?? "pt");

  let data;
  try {
    data = await getReaderData(supabase, user.id, params.book.toUpperCase(), chapter, version.abbreviation);
  } catch {
    notFound();
  }

  const initialVerse = searchParams.verse ? Number(searchParams.verse) : undefined;

  return (
    <ReaderView
      book={params.book.toUpperCase()}
      chapter={chapter}
      version={version.abbreviation}
      versions={BIBLE_VERSIONS}
      data={data}
      initialVerse={Number.isInteger(initialVerse) ? initialVerse : undefined}
    />
  );
}

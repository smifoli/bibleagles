import { notFound } from "next/navigation";
import { ReaderView } from "@/components/reader/ReaderView";
import { tryGetBookSummary } from "@/lib/bible-data";
import { BOOK_ORDER } from "@/lib/bible-books";
import { BIBLE_VERSIONS, getDefaultVersion, getVersionByAbbreviation } from "@/lib/bible-versions";
import { getReaderData } from "@/lib/reader-data";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function ReaderPage({
  params,
  searchParams,
}: {
  params: { book: string; chapter: string };
  searchParams: { version?: string; verse?: string; planDay?: string; from?: string };
}) {
  const chapter = Number(params.chapter);
  if (!Number.isInteger(chapter) || chapter <= 0) notFound();

  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);
  if (!user) notFound();

  const requestedVersion = searchParams.version ? getVersionByAbbreviation(searchParams.version) : undefined;

  // A maioria das navegações pro leitor (próximo/anterior capítulo, links de
  // família, destaques, busca) já leva a versão na URL — só busca a
  // preferência salva quando ela não vier explícita (ex.: card "Leitura de
  // hoje" da home), evitando uma consulta ao banco à toa.
  const { data: profile } = requestedVersion
    ? { data: null }
    : await supabase.from("users").select("preferred_version, preferred_language").eq("id", user.id).single();

  const version =
    requestedVersion ??
    (profile?.preferred_version ? getVersionByAbbreviation(profile.preferred_version) : undefined) ??
    getDefaultVersion(profile?.preferred_language ?? "pt");

  const bookId = params.book.toUpperCase();

  let data;
  try {
    data = await getReaderData(supabase, user.id, bookId, chapter, version.abbreviation, searchParams.planDay);
  } catch {
    notFound();
  }

  const initialVerse = searchParams.verse ? Number(searchParams.verse) : undefined;

  // Navegação anterior/próximo capítulo, cruzando limite de livro via BOOK_ORDER.
  // Carrega version + from adiante (não planDay — o dia do plano é específico
  // do capítulo atual, não faz sentido propagar pro vizinho).
  function buildChapterHref(targetBook: string, targetChapter: number): string {
    const params = new URLSearchParams({ version: version.abbreviation });
    if (searchParams.from) params.set("from", searchParams.from);
    return `/read/${targetBook}/${targetChapter}?${params.toString()}`;
  }

  const currentBookSummary = tryGetBookSummary(version.abbreviation, bookId);
  const bookIndex = BOOK_ORDER.indexOf(bookId);

  let prevHref: string | null = null;
  if (chapter > 1) {
    prevHref = buildChapterHref(bookId, chapter - 1);
  } else if (bookIndex > 0) {
    const prevBookId = BOOK_ORDER[bookIndex - 1];
    const prevBookSummary = tryGetBookSummary(version.abbreviation, prevBookId);
    if (prevBookSummary) prevHref = buildChapterHref(prevBookId, prevBookSummary.chapterCount);
  }

  let nextHref: string | null = null;
  if (currentBookSummary && chapter < currentBookSummary.chapterCount) {
    nextHref = buildChapterHref(bookId, chapter + 1);
  } else if (bookIndex >= 0 && bookIndex < BOOK_ORDER.length - 1) {
    const nextBookId = BOOK_ORDER[bookIndex + 1];
    const nextBookSummary = tryGetBookSummary(version.abbreviation, nextBookId);
    if (nextBookSummary) nextHref = buildChapterHref(nextBookId, 1);
  }

  return (
    <ReaderView
      book={bookId}
      chapter={chapter}
      version={version.abbreviation}
      versions={BIBLE_VERSIONS}
      data={data}
      initialVerse={Number.isInteger(initialVerse) ? initialVerse : undefined}
      backPath={searchParams.from}
      prevHref={prevHref}
      nextHref={nextHref}
    />
  );
}

import { notFound } from "next/navigation";
import { BibleNavView } from "@/components/bible-nav/BibleNavView";
import { BIBLE_VERSIONS, getDefaultVersion, getVersionByAbbreviation } from "@/lib/bible-versions";
import { getBibleNavData } from "@/lib/bible-nav-data";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function BiblePage({ searchParams }: { searchParams: { version?: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) notFound();

  const requestedVersion = searchParams.version ? getVersionByAbbreviation(searchParams.version) : undefined;

  // Só busca a preferência salva quando a versão não vier na URL (o seletor
  // de versão sempre a inclui ao trocar; só a primeira visita via bottom nav
  // chega sem ela).
  const { data: profile } = requestedVersion
    ? { data: null }
    : await supabase.from("users").select("preferred_version, preferred_language").eq("id", user.id).single();

  const version =
    requestedVersion ??
    (profile?.preferred_version ? getVersionByAbbreviation(profile.preferred_version) : undefined) ??
    getDefaultVersion(profile?.preferred_language ?? "pt");

  const nav = await getBibleNavData(supabase, version.abbreviation);

  return <BibleNavView version={version.abbreviation} versions={BIBLE_VERSIONS} nav={nav} />;
}

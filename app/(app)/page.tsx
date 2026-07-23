import Link from "next/link";
import { ActivePackageCard } from "@/components/home/ActivePackageCard";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { NoReadingToday } from "@/components/home/NoReadingToday";
import { SecondaryPackageCard } from "@/components/home/SecondaryPackageCard";
import { formatGreetingDate, getGreeting } from "@/lib/format";
import { getHomeData } from "@/lib/home-data";
import { computeOverallReadPercent, getReadChaptersByBook } from "@/lib/bible-nav-data";
import { getDefaultVersion, getVersionByAbbreviation } from "@/lib/bible-versions";
import { createClient, getUser } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);

  // getHomeData e getReadChaptersByBook não dependem da versão preferida — disparam já,
  // em paralelo com a query de perfil, em vez de esperá-la terminar pra só então começar.
  const profilePromise = supabase.from("users").select("preferred_version, preferred_language").eq("id", user!.id).single();
  const homeDataPromise = getHomeData(supabase, user!.id);
  const readByBookPromise = getReadChaptersByBook(supabase, user!.id);

  const { data: profile } = await profilePromise;
  const version =
    (profile?.preferred_version ? getVersionByAbbreviation(profile.preferred_version) : undefined) ??
    getDefaultVersion(profile?.preferred_language ?? "pt");

  const [{ userName, isAdmin, featured, secondary, activity }, readByBook] = await Promise.all([
    homeDataPromise,
    readByBookPromise,
  ]);
  const biblePercent = computeOverallReadPercent(readByBook, version.abbreviation);

  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[calc(22px*var(--font-scale))] font-semibold tracking-[-0.5px] text-text-primary">
            {getGreeting(now)}, {userName}
          </h1>
          <p className="mt-0.5 text-[calc(12px*var(--font-scale))] text-text-muted">{formatGreetingDate(now)}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-input-border bg-[#ece3d6]">
          <img src="/logo.svg" alt="" width={32} height={32} className="h-full w-full object-cover" />
        </div>
      </div>

      <Link
        href="/bible"
        className="flex items-center gap-3 rounded-[14px] border border-border bg-surface p-3.5 transition-transform active:scale-[0.98]"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[calc(11px*var(--font-scale))] font-semibold text-text-secondary">Sua Bíblia</div>
          <div className="mt-1.5 h-[5px] rounded-full bg-[#e8dcc6]">
            <div className="h-full rounded-full bg-[#5c8a52]" style={{ width: `${biblePercent}%` }} />
          </div>
        </div>
        <span className="shrink-0 text-[calc(14px*var(--font-scale))] font-bold text-ink">{biblePercent}%</span>
      </Link>

      <div className="flex flex-col gap-4">
        <div className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
          Pacotes ativos
        </div>
        {featured ? (
          <>
            <ActivePackageCard card={featured} />
            {secondary.map((card) => (
              <SecondaryPackageCard key={card.packageId} card={card} />
            ))}
          </>
        ) : (
          <NoReadingToday />
        )}
      </div>

      <ActivityFeed items={activity} currentUserId={user!.id} isAdmin={isAdmin} />
    </div>
  );
}

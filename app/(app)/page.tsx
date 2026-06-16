import { ActivePackageCard } from "@/components/home/ActivePackageCard";
import { ActivityFeed } from "@/components/home/ActivityFeed";
import { NoReadingToday } from "@/components/home/NoReadingToday";
import { SecondaryPackageCard } from "@/components/home/SecondaryPackageCard";
import { formatGreetingDate, getGreeting } from "@/lib/format";
import { getHomeData } from "@/lib/home-data";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { userName, featured, secondary, activity } = await getHomeData(supabase, user!.id);

  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.5px] text-text-primary">
            {getGreeting(now)}, {userName}
          </h1>
          <p className="mt-0.5 text-xs text-text-muted">{formatGreetingDate(now)}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-input-border bg-[#ece3d6]">
          <img src="/logo.svg" alt="" width={32} height={32} className="h-full w-full object-cover" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">
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

      <ActivityFeed items={activity} />
    </div>
  );
}

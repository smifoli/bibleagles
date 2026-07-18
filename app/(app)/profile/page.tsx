import { notFound } from "next/navigation";
import { NotificationsCard } from "@/components/profile/NotificationsCard";
import { PreferencesCard } from "@/components/profile/PreferencesCard";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ReadingCalendar } from "@/components/profile/ReadingCalendar";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { BIBLE_VERSIONS } from "@/lib/bible-versions";
import { getProfileData } from "@/lib/profile-data";
import { createClient } from "@/lib/supabase/server";
import type { Language } from "@/types/database";

const LANGUAGES: Language[] = Array.from(new Set(BIBLE_VERSIONS.map((version) => version.language)));

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { user: profile, calendar } = await getProfileData(supabase, user.id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[20px] font-semibold text-text-primary">Perfil</h1>

      <ProfileHeader name={profile.name} email={profile.email} />

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">Preferências</div>
        <PreferencesCard
          version={profile.preferredVersion}
          language={profile.preferredLanguage}
          versions={BIBLE_VERSIONS}
          languages={LANGUAGES}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">Notificações</div>
        <NotificationsCard enabled={profile.notificationEnabled} time={profile.notificationTime} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-semibold uppercase tracking-[2px] text-text-muted">
          Leitura · {calendar.monthLabel}
        </div>
        <ReadingCalendar calendar={calendar} />
      </div>

      <SignOutButton />
    </div>
  );
}

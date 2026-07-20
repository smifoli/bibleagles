import type { createClient } from "@/lib/supabase/server";
import { toDateOnlyString } from "@/lib/format";
import { getDefaultVersion, getVersionByAbbreviation } from "@/lib/bible-versions";
import type { FontSizePreference, Language, UserRole } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  preferredVersion: string;
  preferredLanguage: Language;
  notificationEnabled: boolean;
  notificationTime: string; // "HH:MM"
  fontSize: FontSizePreference;
}

export type CalendarDayStatus = "read" | "today" | "default";

export interface CalendarDay {
  day: number;
  status: CalendarDayStatus;
}

export interface ReadingCalendarData {
  monthLabel: string; // "Julho 2026"
  monthNameLower: string; // "julho"
  weekdayLabels: string[];
  leadingBlanks: number;
  days: CalendarDay[];
  readCount: number;
}

export interface ProfileData {
  user: ProfileUser;
  calendar: ReadingCalendarData;
}

const WEEKDAY_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg..Dom, igual ao mockup
const AVAILABLE_LANGUAGES: Language[] = ["pt", "en"];

export async function getProfileData(supabase: SupabaseServerClient, userId: string): Promise<ProfileData> {
  // getReadingCalendar não depende de userRow (só do userId) — dispara junto.
  const [{ data: userRow }, calendar] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, name, email, role, avatar_url, preferred_version, preferred_language, notification_enabled, notification_time, font_size"
      )
      .eq("id", userId)
      .single(),
    getReadingCalendar(supabase, userId),
  ]);

  // Mesma lógica de fallback de app/(app)/bible/page.tsx: o valor gravado pode
  // apontar pra uma versão fora do catálogo (ex.: default de banco 'NVT', que é
  // comercial e não é distribuída) — nesse caso caímos pro padrão do idioma.
  const requestedVersion = userRow?.preferred_version ? getVersionByAbbreviation(userRow.preferred_version) : undefined;
  const fallbackLanguage: Language = AVAILABLE_LANGUAGES.includes(userRow?.preferred_language as Language)
    ? (userRow!.preferred_language as Language)
    : "pt";
  const version = requestedVersion ?? getDefaultVersion(fallbackLanguage);

  const user: ProfileUser = {
    id: userRow?.id ?? userId,
    name: userRow?.name ?? "",
    email: userRow?.email ?? "",
    role: userRow?.role ?? "member",
    avatarUrl: userRow?.avatar_url ?? null,
    preferredVersion: version.abbreviation,
    preferredLanguage: version.language,
    notificationEnabled: userRow?.notification_enabled ?? false,
    notificationTime: (userRow?.notification_time ?? "07:00:00").slice(0, 5),
    fontSize: userRow?.font_size ?? "normal",
  };

  return { user, calendar };
}

async function getReadingCalendar(supabase: SupabaseServerClient, userId: string): Promise<ReadingCalendarData> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const monthStart = toDateOnlyString(new Date(year, month, 1));
  const monthEnd = toDateOnlyString(new Date(year, month, daysInMonth));

  // Segue o mesmo padrão de duas consultas + join em JS usado em lib/home-data.ts
  // (sem embed do PostgREST): pega os plan_day_id do mês, depois a progresso do usuário.
  const { data: monthDays } = await supabase
    .from("reading_plan_days")
    .select("id, date")
    .gte("date", monthStart)
    .lte("date", monthEnd);

  const dateByPlanDayId = new Map((monthDays ?? []).map((row) => [row.id, row.date]));
  const planDayIds = Array.from(dateByPlanDayId.keys());

  const { data: progress } =
    planDayIds.length > 0
      ? await supabase.from("reading_progress").select("plan_day_id").eq("user_id", userId).in("plan_day_id", planDayIds)
      : { data: [] };

  const readDates = new Set(
    (progress ?? [])
      .map((row) => dateByPlanDayId.get(row.plan_day_id))
      .filter((date): date is string => Boolean(date))
  );

  const days: CalendarDay[] = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateString = toDateOnlyString(new Date(year, month, day));
    const status: CalendarDayStatus = day === today ? "today" : readDates.has(dateString) ? "read" : "default";
    return { day, status };
  });

  // getDay(): 0=domingo..6=sábado. Convertendo pra semana começando na segunda
  // (índice 0), pra bater com os rótulos "S T Q Q S S D" do mockup.
  const leadingBlanks = (new Date(year, month, 1).getDay() + 6) % 7;

  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });
  const monthNameLower = monthFormatter.format(now);
  const monthLabel = `${monthNameLower.charAt(0).toUpperCase()}${monthNameLower.slice(1)} ${year}`;

  return {
    monthLabel,
    monthNameLower,
    weekdayLabels: WEEKDAY_LABELS,
    leadingBlanks,
    days,
    readCount: readDates.size,
  };
}

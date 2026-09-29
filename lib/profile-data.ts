import type { createClient } from "@/lib/supabase/server";
import { toDateOnlyString, todayDateString } from "@/lib/format";
import { getUserTimeZone } from "@/lib/timezone";
import { getDefaultVersion, getVersionByAbbreviation } from "@/lib/bible-versions";
import type { CommentNotificationScope, FontSizePreference, Language, UserRole } from "@/types/database";

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
  commentNotificationScope: CommentNotificationScope;
  chapterReadNotifications: boolean;
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
        "id, name, email, role, avatar_url, preferred_version, preferred_language, notification_enabled, notification_time, comment_notification_scope, chapter_read_notifications, font_size"
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
    commentNotificationScope: userRow?.comment_notification_scope ?? "read_chapters",
    chapterReadNotifications: userRow?.chapter_read_notifications ?? true,
    fontSize: userRow?.font_size ?? "normal",
  };

  return { user, calendar };
}

async function getReadingCalendar(supabase: SupabaseServerClient, userId: string): Promise<ReadingCalendarData> {
  // Ano/mês/dia extraídos de todayDateString() (fuso de quem pediu a página),
  // não de now.getFullYear()/getMonth()/getDate() — esses usam o fuso do
  // processo (servidor, em produção, normalmente UTC), que perto do fim da
  // tarde/noite já tinha virado o dia lá: o calendário marcava o dia errado
  // como "hoje".
  const timeZone = await getUserTimeZone();
  const [year, monthOneIndexed, today] = todayDateString(timeZone).split("-").map(Number);
  const month = monthOneIndexed - 1; // 0-indexed, pro resto da função
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Marca o dia em que a leitura foi de fato registrada (completed_at), não o dia em
  // que o plano previa que ela acontecesse (reading_plan_days.date) — um capítulo
  // atrasado lido hoje deve acender hoje no calendário, não o dia em que venceu.
  // completed_at é timestamptz; sem filtro de intervalo na query (busca todo o
  // progresso do usuário, igual o resto do código faz) porque um range em UTC
  // calculado a partir de ano/mês do fuso do usuário cortaria errado perto da
  // virada do mês pra quem não está em UTC — mais simples cruzar tudo em JS.
  const { data: progress } = await supabase.from("reading_progress").select("completed_at").eq("user_id", userId);

  const readDates = new Set(
    (progress ?? []).map((row) => toDateOnlyString(new Date(row.completed_at), timeZone))
  );

  let readCountThisMonth = 0;
  const days: CalendarDay[] = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateString = toDateOnlyString(new Date(year, month, day));
    const read = readDates.has(dateString);
    if (read) readCountThisMonth += 1;
    const status: CalendarDayStatus = day === today ? "today" : read ? "read" : "default";
    return { day, status };
  });

  const firstOfMonth = new Date(year, month, 1);

  // getDay(): 0=domingo..6=sábado. Convertendo pra semana começando na segunda
  // (índice 0), pra bater com os rótulos "S T Q Q S S D" do mockup.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long" });
  const monthNameLower = monthFormatter.format(firstOfMonth);
  const monthLabel = `${monthNameLower.charAt(0).toUpperCase()}${monthNameLower.slice(1)} ${year}`;

  return {
    monthLabel,
    monthNameLower,
    weekdayLabels: WEEKDAY_LABELS,
    leadingBlanks,
    days,
    readCount: readCountThisMonth,
  };
}

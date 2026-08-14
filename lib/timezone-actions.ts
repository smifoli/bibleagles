"use server";

import { createClient, getUser } from "@/lib/supabase/server";

/**
 * Persiste o fuso IANA do navegador em users.timezone. O cookie "tz" resolve
 * "hoje" nas Server Components, mas o lembrete diário roda por cron — sem
 * request de ninguém, logo sem cookie — e precisa do fuso gravado no banco
 * (Edge Function send-reminder). Chamada por TimezoneSync quando o fuso real
 * difere do salvo.
 */
export async function saveUserTimezone(timeZone: string): Promise<void> {
  try {
    // eslint-disable-next-line no-new -- só valida o nome IANA
    new Intl.DateTimeFormat(undefined, { timeZone });
  } catch {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) return;

  await supabase.from("users").update({ timezone: timeZone }).eq("id", user.id);
}

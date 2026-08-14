import { cookies } from "next/headers";
import { TIMEZONE_COOKIE } from "@/lib/timezone-cookie";

// Chute inicial só pra antes do cookie existir (primeiro request de um
// navegador novo, sem JS, etc.) — família é majoritariamente BR hoje, mas é
// só um fallback: components/layout/TimezoneSync corrige o cookie assim que
// o navegador roda, e a página seguinte já usa o fuso certo.
const FALLBACK_TIMEZONE = "America/Sao_Paulo";

function isValidTimeZone(timeZone: string): boolean {
  try {
    // eslint-disable-next-line no-new -- só valida, o objeto em si não é usado
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fuso IANA de quem está fazendo a requisição, lido do cookie que
 * TimezoneSync mantém sincronizado com o navegador — nunca um fuso fixo do
 * servidor. "Que dia é hoje"/"que horas são" devem sempre passar por aqui em
 * vez de new Date().getHours()/toLocaleDateString() sem timeZone explícito,
 * que usam o fuso do processo (o do servidor, não o de quem está lendo).
 */
export async function getUserTimeZone(): Promise<string> {
  const cookieStore = await cookies();
  const value = cookieStore.get(TIMEZONE_COOKIE)?.value;
  return value && isValidTimeZone(value) ? value : FALLBACK_TIMEZONE;
}

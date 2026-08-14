"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TIMEZONE_COOKIE } from "@/lib/timezone-cookie";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * O servidor não tem como saber o fuso de quem está lendo (rodaria no fuso
 * dele mesmo — UTC em produção); só o navegador sabe. Esse componente não
 * renderiza nada — só mantém um cookie ("tz") sincronizado com
 * Intl.DateTimeFormat().resolvedOptions().timeZone, que lib/timezone.ts lê
 * em todo Server Component/Action que precisa de "hoje" ou "que horas são"
 * (getGreeting, todayDateString em getActivePackagesWithToday etc.).
 *
 * Montado uma vez em app/(app)/layout.tsx. Se o cookie já bate, não faz
 * nada; se mudou (primeira visita desse navegador, ou viagem pra outro
 * fuso), atualiza e força as Server Components a buscarem de novo — só
 * acontece uma vez por navegador/mudança de fuso, não em toda navegação.
 */
export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (readCookie(TIMEZONE_COOKIE) === timeZone) return;

    // 1 ano — mesma ideia do last_read_path: um cookie de preferência de
    // dispositivo, não de sessão.
    document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(timeZone)}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}

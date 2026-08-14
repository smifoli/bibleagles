/**
 * Nome do cookie que guarda o fuso IANA do navegador de quem está usando o
 * app (ex.: "America/Sao_Paulo", "Europe/Lisbon") — arquivo separado de
 * lib/timezone.ts (que lê o cookie via next/headers, só server) justamente
 * pra esse nome poder ser importado também do lado cliente (TimezoneSync)
 * sem puxar next/headers pro bundle do browser. Mesmo padrão de
 * lib/last-read.ts (LAST_READ_COOKIE).
 */
export const TIMEZONE_COOKIE = "tz";

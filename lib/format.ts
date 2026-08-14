// Família toda no Brasil (ver feedback_i18n_pt_only_until_20 na memória — só
// PT até existir infra de i18n) — saudação e "que dia é hoje" sempre nesse
// fuso, nunca no fuso do processo que roda o código (servidor, em produção,
// normalmente UTC). Ver todayDateString() mais abaixo pro porquê disso importar.
const FAMILY_TIMEZONE = "America/Sao_Paulo";

export function getGreeting(date: Date = new Date()): string {
  // % 24 porque hour12: false com Intl às vezes devolve "24" pra meia-noite
  // em vez de "0", dependendo do runtime.
  const hour =
    Number(new Intl.DateTimeFormat("en-US", { timeZone: FAMILY_TIMEZONE, hour: "numeric", hour12: false }).format(date)) % 24;
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatGreetingDate(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FAMILY_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);

  // Intl em pt-BR retorna "segunda-feira, 15 de junho" — removemos o "-feira"
  // pra bater com o design ("Segunda, 15 de junho").
  const withoutSuffix = formatted.replace("-feira", "");
  return withoutSuffix.charAt(0).toUpperCase() + withoutSuffix.slice(1);
}

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSeconds < 60) return "agora mesmo";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `há ${diffMinutes} ${diffMinutes === 1 ? "minuto" : "minutos"}`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `há ${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;

  const diffWeeks = Math.floor(diffDays / 7);
  return `há ${diffWeeks} ${diffWeeks === 1 ? "semana" : "semanas"}`;
}

// Sem timeZone explícito de propósito: usada tanto pra "hoje" quanto pra
// reformatar uma data já construída a partir de ano/mês/dia locais (ex.:
// addDays em lib/package-generator.ts, o calendário em getReadingCalendar) —
// nesses casos o Date já nasceu com componentes locais, e forçar um fuso
// diferente na hora de formatar quebraria a simetria e devolveria o dia
// errado. Pra "que dia é hoje pra família", use todayDateString() abaixo.
export function toDateOnlyString(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

/**
 * "Hoje", sempre no fuso da família — não do processo que roda o código
 * (servidor, em produção, normalmente UTC). Sem isso, perto do fim da
 * tarde/noite no Brasil o servidor já tinha virado o dia: "hoje" virava
 * amanhã, e quem já tinha lido tudo aparecia como pendente/atrasado na
 * timeline (comparava o progresso de hoje contra o plan_day de amanhã).
 */
export function todayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: FAMILY_TIMEZONE });
}

/** "YYYY-MM-DD" -> Date à meia-noite local (evita o shift de fuso de `new Date("YYYY-MM-DD")`, que é UTC). */
export function parseDateOnly(dateOnly: string): Date {
  return new Date(`${dateOnly}T00:00:00`);
}

/** Data curta estilo "4 jun" (dia + mês abreviado, sem ano, sem ponto). */
export function formatShortDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(date);
  return formatted.replace(".", "");
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatGreetingDate(date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
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

export function toDateOnlyString(date: Date = new Date()): string {
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD em horário local, não UTC
}

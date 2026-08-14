// Chamada pelo job do pg_cron a cada 5 minutos (ver migration
// 20260815000000_daily_reminder.sql). Percorre quem ligou o "Lembrete diário"
// no perfil e, pra cada um, decide NO FUSO DELE se é hora de lembrar:
//   1. horário local dentro da janela [notification_time, +5min);
//   2. ainda não foi lembrado hoje (users.reminder_last_sent_on, data local);
//   3. existe leitura de pacote ativo pra hoje que a pessoa ainda não marcou —
//      quem já leu não precisa de lembrete.
// Passando { "test_user_id": "<uuid>" } no corpo, os três filtros são pulados
// e o push sai na hora pra esse usuário — só pra testar formato/entrega.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:luccafoschmidt@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Espelha o "*/5 * * * *" do cron — janela maior que o intervalo reenviaria,
// menor deixaria horários caírem no vão entre duas execuções.
const WINDOW_MINUTES = 5;
const FALLBACK_TIMEZONE = "America/Sao_Paulo";

interface ReminderUser {
  id: string;
  notification_time: string; // "HH:MM:SS"
  timezone: string;
  reminder_last_sent_on: string | null;
}

/** "YYYY-MM-DD" e minutos desde meia-noite do agora local no fuso dado. */
function localNow(timeZone: string): { date: string; minutes: number } {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  } catch {
    tz = FALLBACK_TIMEZONE;
  }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  // hour12:false pode render "24" à meia-noite em alguns runtimes — normaliza.
  const hour = Number(get("hour")) % 24;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: hour * 60 + Number(get("minute")),
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let testUserId: string | null = null;
  try {
    const body = await req.json();
    testUserId = typeof body?.test_user_id === "string" ? body.test_user_id : null;
  } catch {
    // corpo vazio/inválido = execução normal do cron
  }

  const { data: users } = await supabase
    .from("users")
    .select("id, notification_time, timezone, reminder_last_sent_on")
    .eq("notification_enabled", true)
    .eq("is_deleted", false);

  const skipped: Record<string, string> = {};
  let sent = 0;

  for (const user of (users ?? []) as ReminderUser[]) {
    const isTest = user.id === testUserId;
    if (testUserId !== null && !isTest) continue;

    const { date: localDate, minutes: nowMinutes } = localNow(user.timezone);

    if (!isTest) {
      const [hourPart, minutePart] = user.notification_time.split(":");
      const targetMinutes = Number(hourPart) * 60 + Number(minutePart);
      const delta = nowMinutes - targetMinutes;
      if (delta < 0 || delta >= WINDOW_MINUTES) {
        skipped[user.id] = "fora-do-horario";
        continue;
      }
      if (user.reminder_last_sent_on === localDate) {
        skipped[user.id] = "ja-lembrado-hoje";
        continue;
      }
    }

    // Todos os dias já vencidos (até hoje, no fuso do usuário) de pacotes
    // ativos — o lembrete diz o que ler hoje E o que ficou pra trás, e ainda
    // dispara pra quem já leu hoje mas deve dias antigos.
    const { data: dueDays } = await supabase
      .from("reading_plan_days")
      .select("id, title, date, reading_packages!inner(status)")
      .lte("date", localDate)
      .eq("reading_packages.status", "active")
      .order("date", { ascending: true });
    const dayIds = (dueDays ?? []).map((day) => day.id);

    let todayTitles: string[] = [];
    let overdueTitles: string[] = [];
    if (dayIds.length > 0) {
      const { data: progress } = await supabase
        .from("reading_progress")
        .select("plan_day_id")
        .eq("user_id", user.id)
        .in("plan_day_id", dayIds);
      const readIds = new Set((progress ?? []).map((row) => row.plan_day_id));
      const pending = (dueDays ?? []).filter((day) => !readIds.has(day.id));
      todayTitles = pending.filter((day) => day.date === localDate).map((day) => day.title);
      overdueTitles = pending.filter((day) => day.date < localDate).map((day) => day.title);
    }

    if (todayTitles.length === 0 && overdueTitles.length === 0 && !isTest) {
      skipped[user.id] = dayIds.length === 0 ? "sem-leitura-hoje" : "em-dia";
      continue;
    }

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user.id);

    if (!subscriptions || subscriptions.length === 0) {
      skipped[user.id] = "sem-inscricao-push";
      continue;
    }

    // "Hoje: Atos 11 · Em atraso: Atos 7, Atos 9" — atrasos listados até 3,
    // depois vira contagem pra o corpo do push não virar um parágrafo.
    const bodyParts: string[] = [];
    if (todayTitles.length > 0) bodyParts.push(`Hoje: ${todayTitles.join(" · ")}`);
    if (overdueTitles.length > 0) {
      const shown = overdueTitles.slice(0, 3).join(", ");
      const rest = overdueTitles.length - 3;
      bodyParts.push(`Em atraso: ${shown}${rest > 0 ? ` e mais ${rest}` : ""}`);
    }

    const message = JSON.stringify({
      title: "Hora de ler 📖",
      body: bodyParts.length > 0 ? bodyParts.join(" · ") : "Sua leitura de hoje te espera.",
      url: "/",
    });

    const expiredIds: string[] = [];
    let sentToUser = 0;
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, message);
          sentToUser += 1;
        } catch (error) {
          // 404/410 = inscrição cancelada/expirada do lado do navegador — só
          // limpa. Outros erros não apagam a inscrição por engano.
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) expiredIds.push(sub.id);
        }
      })
    );

    if (expiredIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredIds);
    }

    if (sentToUser > 0) {
      sent += sentToUser;
      // Marca a data local mesmo em teste — reenviar de novo no horário real do
      // mesmo dia seria confuso; o teste conta como o lembrete do dia.
      await supabase.from("users").update({ reminder_last_sent_on: localDate }).eq("id", user.id);
    } else {
      skipped[user.id] = "falha-no-envio";
    }
  }

  return new Response(JSON.stringify({ sent, skipped }), { headers: { "Content-Type": "application/json" } });
});

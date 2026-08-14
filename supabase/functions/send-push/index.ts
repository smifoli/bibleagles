// Chamada pelo trigger notify_push_on_new_notification (ver migration
// 20260814190100_push_notifications_webhook.sql) toda vez que uma linha nasce
// em public.notifications. Busca as inscrições de push do destinatário e
// manda o Web Push de verdade — é essa função que faz a notificação aparecer
// no aparelho (inclusive iPhone instalado na Tela de Início), não o insert
// em si.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";
import { BOOK_NAMES_PT } from "./book-names.ts";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:luccafoschmidt@gmail.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

type NotificationType =
  | "comment_reply"
  | "comment_on_thread"
  | "comment_like"
  | "comment_on_read_chapter"
  | "comment_on_any_chapter";

// `ref` é "João 3:16" (mesmo formato da lista em /notifications) — ou "" se o
// comentário não foi encontrado, caso em que os títulos ficam sem o "em ...".
const TITLE_BY_TYPE: Record<NotificationType, (actor: string, ref: string) => string> = {
  comment_reply: (actor, ref) => `${actor} respondeu seu comentário${ref && ` em ${ref}`}`,
  comment_on_thread: (actor, ref) => `${actor} comentou na mesma conversa${ref && ` em ${ref}`}`,
  comment_like: (actor, ref) => `${actor} curtiu seu comentário${ref && ` em ${ref}`}`,
  comment_on_read_chapter: (actor, ref) => (ref ? `${actor} comentou em ${ref}, que você já leu` : `${actor} comentou num capítulo que você leu`),
  comment_on_any_chapter: (actor, ref) => `${actor} comentou${ref && ` em ${ref}`}`,
};

interface WebhookPayload {
  notification_id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  comment_id: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { recipient_id, actor_id, type, comment_id } = payload;

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", recipient_id);

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { "Content-Type": "application/json" } });
  }

  const [{ data: actor }, { data: comment }] = await Promise.all([
    supabase.from("users").select("name").eq("id", actor_id).single(),
    supabase.from("comments").select("book, chapter, verse, content").eq("id", comment_id).single(),
  ]);

  const actorName = actor?.name ?? "Alguém";
  const reference = comment ? `${BOOK_NAMES_PT[comment.book] ?? comment.book} ${comment.chapter}:${comment.verse}` : "";
  const title = (TITLE_BY_TYPE[type] ?? TITLE_BY_TYPE.comment_on_thread)(actorName, reference);
  const body = comment?.content ? (comment.content.length > 120 ? `${comment.content.slice(0, 120)}…` : comment.content) : "";
  const url = comment
    ? `/read/${comment.book}/${comment.chapter}?verse=${comment.verse}&from=${encodeURIComponent("/notifications")}`
    : "/notifications";

  const message = JSON.stringify({ title, body, url });

  const expiredIds: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        );
        sent += 1;
      } catch (error) {
        // 404/410 = o navegador cancelou/expirou essa inscrição do lado dele —
        // não é erro nosso, só limpa a linha. Qualquer outro erro (rede, push
        // service fora do ar) não deve apagar a inscrição por engano.
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) expiredIds.push(sub.id);
      }
    })
  );

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return new Response(JSON.stringify({ sent, expired: expiredIds.length }), {
    headers: { "Content-Type": "application/json" },
  });
});

// Helpers client-only pra Web Push (Notification + Push API do navegador).
// iOS só expõe PushManager quando o PWA foi instalado na Tela de Início
// (display-mode: standalone) — numa aba normal do Safari o objeto nem existe,
// então isPushSupported() já cobre isso sem precisar de detecção à parte.

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData, (char) => char.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function isIos(): boolean {
  return typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// (navigator as any).standalone é a forma pré-padrão do Safari — o Safari
// ainda não reporta display-mode:standalone via matchMedia de forma confiável
// em todas as versões, então checa os dois.
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

// navigator.serviceWorker.ready nunca resolve quando nenhum service worker chega
// a ser registrado (PWA desligado em dev, registro que falhou, SW antigo quebrado
// ainda no aparelho) — sem um teto de espera, qualquer problema no SW deixaria a
// UI de push presa em "checando" pra sempre.
const SW_READY_TIMEOUT_MS = 6000;

export async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS);
    }),
  ]);
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await getPushRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await getPushRegistration();
  if (!registration) throw new Error("sw-unavailable");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("permission-denied");

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    // lib.dom's PushSubscriptionOptionsInit espera BufferSource<ArrayBuffer>;
    // Uint8Array.from() tipa o backing buffer como ArrayBufferLike (aceita
    // SharedArrayBuffer também) — na prática é sempre um ArrayBuffer aqui.
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });
}

export async function unsubscribeFromPush(subscription: PushSubscription): Promise<void> {
  await subscription.unsubscribe();
}

export function subscriptionToRow(subscription: PushSubscription): { endpoint: string; p256dh: string; auth: string } {
  const json = subscription.toJSON();
  return {
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh ?? "",
    auth: json.keys?.auth ?? "",
  };
}

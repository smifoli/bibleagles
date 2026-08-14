import withPWAInit from "next-pwa";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Fotos de perfil (bucket "avatars") vêm do Storage do próprio projeto Supabase.
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

const withPWA = withPWAInit({
  dest: "public",
  // register: true não funciona em App Router (o next-pwa 5.x injeta o script
  // de registro na entry "main.js" do Pages Router, que aqui nunca carrega) —
  // o registro é feito à mão em components/pwa/ServiceWorkerRegistration.tsx.
  register: false,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline",
  },
  buildExcludes: [/middleware-manifest\.json$/, /app-build-manifest\.json$/],
  // Handlers de "push"/"notificationclick" (public/push-sw.js) — importScripts
  // injeta um `importScripts("/push-sw.js")` no topo do sw.js que o Workbox
  // gera, sem precisar trocar pro modo swSrc/injectManifest (que perderia o
  // fallback offline configurado acima).
  importScripts: ["/push-sw.js"],
});

export default withPWA(nextConfig);

"use client";

import { useEffect } from "react";

// next-pwa 5.x (register: true) injeta o script de registro na entry "main.js"
// do Pages Router — este app é 100% App Router ("main-app.js"), então aquela
// entry nunca carrega e o sw.js gerado ficava órfão: nenhuma página jamais
// chamava register(), e nada que depende do service worker (push, offline)
// chegava a existir. O registro vive aqui, no layout raiz, por isso mesmo.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Em dev o next-pwa fica desligado (next.config.mjs) — registrar o sw.js
    // committado em public/ ativaria um worker velho cacheando o app.
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem HTTPS/rede o registro falha — o app segue funcionando sem SW.
    });
  }, []);

  return null;
}

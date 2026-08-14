"use client";

import { useEffect, useState } from "react";
import { ChapterReadNotificationRow } from "@/components/profile/ChapterReadNotificationRow";
import { CommentNotificationRows } from "@/components/profile/CommentNotificationRows";
import { DailyReminderRows } from "@/components/profile/DailyReminderRows";
import { Toggle } from "@/components/ui/Toggle";
import { deletePushSubscription, savePushSubscription } from "@/lib/push-actions";
import {
  getCurrentSubscription,
  getPushRegistration,
  isIos,
  isPushSupported,
  isStandalone,
  subscribeToPush,
  subscriptionToRow,
  unsubscribeFromPush,
} from "@/lib/push-subscribe";
import type { CommentNotificationScope } from "@/types/database";

type Status = "checking" | "unsupported" | "sw-unavailable" | "ios-install" | "denied" | "off" | "on" | "saving";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

interface NotificationsSettingsCardProps {
  reminderEnabled: boolean;
  reminderTime: string; // "HH:MM"
  commentScope: CommentNotificationScope;
  chapterReadEnabled: boolean;
}

// Bloco único da seção Notificações do perfil. A linha de cima é a permissão
// de push deste aparelho (estado vem do próprio PushManager, específico de
// cada dispositivo — não de uma coluna em users); as demais preferências
// (lembrete diário, comentários, leituras) só aparecem com o push ativo,
// porque sem inscrição de push nenhuma delas chega mesmo.
export function NotificationsSettingsCard({
  reminderEnabled,
  reminderTime,
  commentScope,
  chapterReadEnabled,
}: NotificationsSettingsCardProps) {
  const [status, setStatus] = useState<Status>("checking");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      if (!isPushSupported()) {
        if (!cancelled) setStatus(isIos() && !isStandalone() ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      const registration = await getPushRegistration();
      if (cancelled) return;
      if (!registration) {
        setStatus("sw-unavailable");
        return;
      }
      const current = await registration.pushManager.getSubscription();
      if (cancelled) return;
      setSubscription(current);
      setStatus(current ? "on" : "off");
    }

    checkStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle(next: boolean) {
    setError(null);

    if (next) {
      if (!VAPID_PUBLIC_KEY) {
        setError("Notificações push não configuradas neste ambiente.");
        return;
      }
      setStatus("saving");
      try {
        const sub = await subscribeToPush(VAPID_PUBLIC_KEY);
        const { error: saveError } = await savePushSubscription(subscriptionToRow(sub));
        if (saveError) throw new Error(saveError);
        setSubscription(sub);
        setStatus("on");
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message === "permission-denied") {
          setStatus("denied");
        } else if (message === "sw-unavailable") {
          setStatus("sw-unavailable");
        } else {
          setStatus("off");
          setError("Não foi possível ativar as notificações. Tente de novo.");
        }
      }
      return;
    }

    setStatus("saving");
    const current = subscription ?? (await getCurrentSubscription());
    if (current) {
      await deletePushSubscription(current.endpoint);
      await unsubscribeFromPush(current);
    }
    setSubscription(null);
    setStatus("off");
  }

  // "saving" com inscrição existente = desativando (mantém as linhas até
  // concluir); "saving" ainda sem inscrição = ativando (só mostra depois que
  // der certo, senão as opções piscariam numa ativação que falhou).
  const showSettings = status === "on" || (status === "saving" && subscription !== null);

  return (
    <div className="flex flex-col rounded-[18px] border border-border bg-surface px-4">
      <div className="flex items-center justify-between py-2.5">
        <span className="text-[calc(13px*var(--font-scale))] text-[#2c2218]">Notificações neste aparelho</span>
        {status === "checking" || status === "unsupported" || status === "sw-unavailable" ? (
          <span className="text-[calc(11px*var(--font-scale))] text-text-muted">
            {status === "checking" ? "…" : status === "sw-unavailable" ? "Indisponível" : "Não suportado"}
          </span>
        ) : status === "ios-install" ? (
          <span className="text-[calc(11px*var(--font-scale))] text-text-muted">Instale o app</span>
        ) : (
          <Toggle
            checked={status === "on" || status === "saving"}
            onChange={handleToggle}
            disabled={status === "saving" || status === "denied"}
            ariaLabel="Notificações push neste aparelho"
          />
        )}
      </div>

      {status === "ios-install" ? (
        <div className="border-t border-border py-2.5 text-[calc(12px*var(--font-scale))] leading-[1.5] text-text-secondary">
          No iPhone, notificações só funcionam com o BiblEagles instalado na Tela de Início: toque em{" "}
          <span className="font-medium">Compartilhar</span> no Safari e depois em{" "}
          <span className="font-medium">Adicionar à Tela de Início</span>. Depois de instalado, abra o app por lá pra
          ativar aqui.
        </div>
      ) : null}

      {status === "sw-unavailable" ? (
        <div className="border-t border-border py-2.5 text-[calc(12px*var(--font-scale))] leading-[1.5] text-text-secondary">
          Não foi possível preparar as notificações neste acesso — recarregue a página pra tentar de novo. (Rodando em
          desenvolvimento local, este recurso fica desligado.)
        </div>
      ) : null}

      {status === "denied" ? (
        <div className="border-t border-border py-2.5 text-[calc(12px*var(--font-scale))] leading-[1.5] text-text-secondary">
          Notificações bloqueadas nas configurações do navegador/aparelho para o BiblEagles — precisa liberar por lá
          antes de ativar aqui de novo.
        </div>
      ) : null}

      {error ? (
        <div className="border-t border-border py-2.5 text-[calc(12px*var(--font-scale))] text-error">{error}</div>
      ) : null}

      {showSettings ? (
        <>
          <div className="h-px bg-border" />
          <DailyReminderRows enabled={reminderEnabled} time={reminderTime} />
          <div className="h-px bg-border" />
          <CommentNotificationRows scope={commentScope} />
          <div className="h-px bg-border" />
          <ChapterReadNotificationRow enabled={chapterReadEnabled} />
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { updateChapterReadNotifications } from "@/lib/profile-actions";

// Aviso quando alguém da família marca um capítulo como lido ("Kevin leu
// Atos 11"). Ligado por padrão; leitura acontece todo dia, então precisa ter
// como desligar sem mexer nas outras notificações.
export function ChapterReadNotificationsCard({ enabled }: { enabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    setIsEnabled(next);
    startTransition(async () => {
      await updateChapterReadNotifications(next);
    });
  }

  return (
    <div className="flex items-center justify-between rounded-[18px] border border-border bg-surface px-4 py-2.5">
      <span className="text-[calc(13px*var(--font-scale))] text-[#2c2218]">Quando alguém ler um capítulo</span>
      <Toggle checked={isEnabled} onChange={handleToggle} ariaLabel="Avisar quando alguém da família ler um capítulo" />
    </div>
  );
}

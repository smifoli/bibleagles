"use client";

import { useState, useTransition } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { updateChapterReadNotifications } from "@/lib/profile-actions";

// Linha do aviso "Kevin leu Atos 11", dentro do bloco único de Notificações
// (NotificationsSettingsCard). Ligado por padrão; leitura acontece todo dia,
// então precisa ter como desligar sem mexer nas outras notificações.
export function ChapterReadNotificationRow({ enabled }: { enabled: boolean }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    setIsEnabled(next);
    startTransition(async () => {
      await updateChapterReadNotifications(next);
    });
  }

  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[calc(13px*var(--font-scale))] text-[#2c2218]">Quando alguém ler um capítulo</span>
      <Toggle checked={isEnabled} onChange={handleToggle} ariaLabel="Avisar quando alguém da família ler um capítulo" />
    </div>
  );
}

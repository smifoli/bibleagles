"use client";

import { useState, useTransition } from "react";
import { updateNotifications } from "@/lib/profile-actions";

interface NotificationsCardProps {
  enabled: boolean;
  time: string; // "HH:MM"
}

export function NotificationsCard({ enabled, time }: NotificationsCardProps) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [currentTime, setCurrentTime] = useState(time);
  const [, startTransition] = useTransition();

  function save(nextEnabled: boolean, nextTime: string) {
    startTransition(async () => {
      await updateNotifications(nextEnabled, nextTime);
    });
  }

  function handleToggle() {
    const next = !isEnabled;
    setIsEnabled(next);
    save(next, currentTime);
  }

  function handleTimeChange(next: string) {
    if (!next) return;
    setCurrentTime(next);
    save(isEnabled, next);
  }

  return (
    <div className="flex flex-col rounded-[18px] border border-border bg-surface px-4">
      <div className="flex items-center justify-between py-2.5">
        <span className="text-[13px] text-[#2c2218]">Lembrete diário</span>
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          onClick={handleToggle}
          className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors ${isEnabled ? "bg-ink" : "bg-border"}`}
        >
          <span
            className={`absolute top-[3px] h-4 w-4 rounded-full bg-[#f5efe4] transition-all ${
              isEnabled ? "right-[3px]" : "left-[3px]"
            }`}
          />
        </button>
      </div>
      <div className="h-px bg-border" />
      <div className="flex items-center justify-between py-2.5">
        <span className="text-[13px] text-[#2c2218]">Horário</span>
        <input
          type="time"
          value={currentTime}
          onChange={(event) => handleTimeChange(event.target.value)}
          disabled={!isEnabled}
          className="rounded-[10px] border border-border bg-surface px-3 py-1.5 text-xs text-ink disabled:opacity-50"
        />
      </div>
    </div>
  );
}

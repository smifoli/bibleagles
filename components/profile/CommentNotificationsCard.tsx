"use client";

import { useState, useTransition } from "react";
import { updateCommentNotificationScope } from "@/lib/profile-actions";
import type { CommentNotificationScope } from "@/types/database";

const OPTIONS: { value: CommentNotificationScope; label: string }[] = [
  { value: "read_chapters", label: "Só onde eu já li" },
  { value: "all", label: "Em toda a Bíblia" },
];

// Alcance das notificações de comentário novo da família. Respostas, conversas
// em que você participa e curtidas não passam por aqui — são sempre sobre um
// comentário seu, então notificam independente desta escolha.
export function CommentNotificationsCard({ scope }: { scope: CommentNotificationScope }) {
  const [current, setCurrent] = useState(scope);
  const [, startTransition] = useTransition();

  function handleSelect(next: CommentNotificationScope) {
    if (next === current) return;
    setCurrent(next);
    startTransition(async () => {
      await updateCommentNotificationScope(next);
    });
  }

  return (
    <div className="flex flex-col rounded-[18px] border border-border bg-surface px-4">
      <div className="flex items-center justify-between gap-3 py-2.5">
        <span className="text-[calc(13px*var(--font-scale))] text-[#2c2218]">Comentários da família</span>
        <div className="flex shrink-0 rounded-full border border-border p-0.5">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              aria-pressed={current === option.value}
              className={`rounded-full px-2.5 py-1 text-[calc(11px*var(--font-scale))] font-semibold transition-colors ${
                current === option.value ? "bg-ink text-background" : "text-text-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-border py-2.5 text-[calc(12px*var(--font-scale))] leading-[1.5] text-text-secondary">
        {current === "read_chapters"
          ? "Você é avisado de comentários novos só em capítulos que já leu. Respostas e curtidas nos seus comentários avisam sempre."
          : "Você é avisado de qualquer comentário novo da família, mesmo em capítulos que ainda não leu."}
      </div>
    </div>
  );
}

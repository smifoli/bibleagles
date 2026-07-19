"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteActivityItem } from "@/lib/activity-actions";

export function ActivityDeleteButton({ kind, id }: { kind: "comment" | "highlight"; id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteActivityItem(kind, id);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleDelete} disabled={pending} className="text-[11px] font-semibold text-error">
            Confirmar
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="text-[11px] font-semibold text-text-muted"
          >
            Cancelar
          </button>
        </div>
        {error && <span className="text-[10px] text-error">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Apagar"
      className="shrink-0 px-1 text-sm font-semibold text-text-muted"
    >
      ×
    </button>
  );
}

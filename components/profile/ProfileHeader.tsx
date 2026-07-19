"use client";

import { useState, useTransition } from "react";
import { updateProfileName } from "@/lib/profile-actions";

export function ProfileHeader({ name, email }: { name: string; email: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const result = await updateProfileName(value);
      if (result.error) setError(result.error);
      else setEditing(false);
    });
  }

  function handleCancel() {
    setValue(name);
    setError(undefined);
    setEditing(false);
  }

  return (
    <div className="flex flex-col items-center gap-2.5 py-1 pb-2">
      <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-[#cdbfac] bg-[#b5723e] text-[calc(26px*var(--font-scale))] font-bold text-[#f5efe4]">
        {initial}
      </div>

      {editing ? (
        <div className="flex w-full max-w-[240px] flex-col items-center gap-2">
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="w-full rounded-[10px] border border-input-border bg-background px-3 py-2 text-center text-[calc(13px*var(--font-scale))] text-ink focus:border-ink focus:outline-none"
          />
          {error && <p className="text-[calc(12px*var(--font-scale))] text-error">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-full bg-ink px-4 py-1.5 text-[calc(12px*var(--font-scale))] font-semibold text-background disabled:opacity-60"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full border border-input-border px-4 py-1.5 text-[calc(12px*var(--font-scale))] font-semibold text-text-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center">
            <div className="text-[calc(18px*var(--font-scale))] font-semibold text-text-primary">{name}</div>
            <div className="mt-0.5 text-[calc(12px*var(--font-scale))] text-text-muted">{email}</div>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-input-border px-[18px] py-2 text-[calc(12px*var(--font-scale))] font-semibold text-text-secondary"
          >
            Editar perfil
          </button>
        </>
      )}
    </div>
  );
}

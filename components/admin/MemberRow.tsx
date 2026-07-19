"use client";

import { useState, useTransition } from "react";
import { deleteMember, updateMemberRole } from "@/lib/admin-actions";
import type { AdminMember } from "@/lib/admin-data";

interface AvatarColor {
  bg: string;
  text: string;
}

export function MemberRow({
  member,
  avatarColor,
  isFirst,
  isSelf,
}: {
  member: AdminMember;
  avatarColor: AvatarColor;
  isFirst: boolean;
  isSelf: boolean;
}) {
  const [error, setError] = useState<string>();
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isAdmin = member.role === "admin";
  const initial = member.name.trim().charAt(0).toUpperCase() || "?";

  function handleToggle() {
    setError(undefined);
    startTransition(async () => {
      const result = await updateMemberRole(member.id, isAdmin ? "member" : "admin");
      if (result.error) setError(result.error);
    });
  }

  function handleRemove(deleteContent: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteMember(member.id, deleteContent);
      if (result.error) setError(result.error);
      else setConfirmingRemove(false);
    });
  }

  return (
    <div className={`py-2.5 ${isFirst ? "" : "border-t border-border"}`}>
      <div className="flex items-center gap-[11px]">
        <div
          className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full text-[calc(11px*var(--font-scale))] font-semibold"
          style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[calc(14px*var(--font-scale))] font-semibold text-ink">{member.name}</div>
          <div className="truncate text-[calc(11px*var(--font-scale))] text-text-muted">{member.email}</div>
          {error ? <div className="mt-0.5 text-[calc(11px*var(--font-scale))] text-error">{error}</div> : null}
        </div>
        <span
          className={
            isAdmin
              ? "shrink-0 whitespace-nowrap rounded-full bg-[rgba(44,34,24,0.1)] px-2.5 py-1 text-[calc(10px*var(--font-scale))] font-semibold text-ink"
              : "shrink-0 whitespace-nowrap rounded-full bg-[#ece3d6] px-2.5 py-1 text-[calc(10px*var(--font-scale))] font-semibold text-text-muted"
          }
        >
          {isAdmin ? "Admin" : "Membro"}
        </span>
        {isSelf ? null : (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {!(isAdmin && isSelf) && (
              <button
                type="button"
                onClick={handleToggle}
                disabled={isPending}
                className="whitespace-nowrap text-[calc(12px*var(--font-scale))] text-link disabled:opacity-60"
              >
                {isAdmin ? "Remover Admin" : "Tornar Admin"} ▾
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmingRemove(true)}
              disabled={isPending}
              className="whitespace-nowrap text-[calc(12px*var(--font-scale))] text-error disabled:opacity-60"
            >
              Remover membro
            </button>
          </div>
        )}
      </div>

      {confirmingRemove && (
        <div className="mt-2.5 flex flex-col gap-2 rounded-[12px] border border-border bg-background p-3">
          <p className="text-[calc(12px*var(--font-scale))] text-text-secondary">
            Apagar os comentários e destaques de <span className="font-semibold">{member.name}</span> também, ou
            manter (aparece como &quot;{member.name} (deletado)&quot;)?
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <button
              type="button"
              onClick={() => handleRemove(true)}
              disabled={isPending}
              className="text-[calc(12px*var(--font-scale))] font-semibold text-error disabled:opacity-60"
            >
              Apagar tudo
            </button>
            <button
              type="button"
              onClick={() => handleRemove(false)}
              disabled={isPending}
              className="text-[calc(12px*var(--font-scale))] font-semibold text-ink disabled:opacity-60"
            >
              Manter comentários/destaques
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRemove(false)}
              disabled={isPending}
              className="text-[calc(12px*var(--font-scale))] font-semibold text-text-muted disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

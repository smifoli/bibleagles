"use client";

import { useState, useTransition } from "react";
import { updateMemberRole } from "@/lib/admin-actions";
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

  return (
    <div className={`flex items-center gap-[11px] py-2.5 ${isFirst ? "" : "border-t border-border"}`}>
      <div
        className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
        style={{ backgroundColor: avatarColor.bg, color: avatarColor.text }}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{member.name}</div>
        <div className="truncate text-[11px] text-text-muted">{member.email}</div>
        {error ? <div className="mt-0.5 text-[11px] text-error">{error}</div> : null}
      </div>
      <span
        className={
          isAdmin
            ? "shrink-0 whitespace-nowrap rounded-full bg-[rgba(44,34,24,0.1)] px-2.5 py-1 text-[10px] font-semibold text-ink"
            : "shrink-0 whitespace-nowrap rounded-full bg-[#ece3d6] px-2.5 py-1 text-[10px] font-semibold text-text-muted"
        }
      >
        {isAdmin ? "Admin" : "Membro"}
      </span>
      {isAdmin && isSelf ? null : (
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className="shrink-0 whitespace-nowrap text-xs text-link disabled:opacity-60"
        >
          {isAdmin ? "Remover Admin" : "Tornar Admin"} ▾
        </button>
      )}
    </div>
  );
}

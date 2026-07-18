"use client";

import { useState } from "react";
import { MembersList } from "@/components/admin/MembersList";
import type { AdminMember } from "@/lib/admin-data";

type Tab = "pacotes" | "membros";

export function AdminView({ members, currentUserId }: { members: AdminMember[]; currentUserId: string }) {
  const [tab, setTab] = useState<Tab>("pacotes");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[20px] font-semibold text-text-primary">Admin</h1>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("pacotes")}
          className={
            tab === "pacotes"
              ? "rounded-full bg-ink px-5 py-2 text-xs font-semibold text-background"
              : "rounded-full border border-input-border px-5 py-2 text-xs font-semibold text-text-muted"
          }
        >
          Pacotes
        </button>
        <button
          type="button"
          onClick={() => setTab("membros")}
          className={
            tab === "membros"
              ? "rounded-full bg-ink px-5 py-2 text-xs font-semibold text-background"
              : "rounded-full border border-input-border px-5 py-2 text-xs font-semibold text-text-muted"
          }
        >
          Membros
        </button>
      </div>

      {tab === "pacotes" ? (
        // Issue #15 (painel de gerenciamento de pacotes) ainda não foi implementada —
        // este placeholder existe só pra dar forma à aba dentro do shell de #16.
        <div className="flex flex-col items-center gap-1 rounded-[18px] border border-border bg-surface px-4 py-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Em breve</p>
          <p className="text-xs text-text-muted">Gerenciamento de pacotes chega em breve.</p>
        </div>
      ) : (
        <MembersList members={members} currentUserId={currentUserId} />
      )}
    </div>
  );
}

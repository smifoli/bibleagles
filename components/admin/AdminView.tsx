"use client";

import Link from "next/link";
import { useState } from "react";
import { MembersList } from "@/components/admin/MembersList";
import type { AdminMember } from "@/lib/admin-data";

type Tab = "pacotes" | "membros";

export function AdminView({ members, currentUserId }: { members: AdminMember[]; currentUserId: string }) {
  const [tab, setTab] = useState<Tab>("pacotes");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold text-text-primary">Admin</h1>
        <Link
          href="/admin/package/new"
          className="rounded-full border border-input-border px-4 py-[9px] text-xs font-semibold text-text-secondary"
        >
          + Novo pacote
        </Link>
      </div>

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
        // Issue #15 (listar/arquivar/ativar pacotes existentes) ainda não foi
        // implementada — criar (#12/#13) já funciona via "+ Novo pacote" acima.
        <div className="flex flex-col items-center gap-1 rounded-[18px] border border-border bg-surface px-4 py-10 text-center">
          <p className="text-sm font-semibold text-text-primary">Lista de pacotes em breve</p>
          <p className="text-xs text-text-muted">Por enquanto, use "+ Novo pacote" pra criar um.</p>
        </div>
      ) : (
        <MembersList members={members} currentUserId={currentUserId} />
      )}
    </div>
  );
}

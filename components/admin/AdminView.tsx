"use client";

import Link from "next/link";
import { useState } from "react";
import { MembersList } from "@/components/admin/MembersList";
import { PackagesOverview } from "@/components/admin/PackagesOverview";
import type { AdminMember } from "@/lib/admin-data";
import type { AdminPackagesOverview } from "@/lib/admin-packages-data";

type Tab = "pacotes" | "membros";

export function AdminView({
  members,
  currentUserId,
  packages,
}: {
  members: AdminMember[];
  currentUserId: string;
  packages: AdminPackagesOverview;
}) {
  const [tab, setTab] = useState<Tab>("pacotes");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[calc(20px*var(--font-scale))] font-semibold text-text-primary">Admin</h1>
        <Link
          href="/admin/package/new"
          className="rounded-full border border-input-border px-4 py-[9px] text-[calc(12px*var(--font-scale))] font-semibold text-text-secondary"
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
              ? "rounded-full bg-ink px-5 py-2 text-[calc(12px*var(--font-scale))] font-semibold text-background"
              : "rounded-full border border-input-border px-5 py-2 text-[calc(12px*var(--font-scale))] font-semibold text-text-muted"
          }
        >
          Pacotes
        </button>
        <button
          type="button"
          onClick={() => setTab("membros")}
          className={
            tab === "membros"
              ? "rounded-full bg-ink px-5 py-2 text-[calc(12px*var(--font-scale))] font-semibold text-background"
              : "rounded-full border border-input-border px-5 py-2 text-[calc(12px*var(--font-scale))] font-semibold text-text-muted"
          }
        >
          Membros
        </button>
      </div>

      {tab === "pacotes" ? (
        <PackagesOverview overview={packages} />
      ) : (
        <MembersList members={members} currentUserId={currentUserId} />
      )}
    </div>
  );
}

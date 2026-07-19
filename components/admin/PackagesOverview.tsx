"use client";

import { useState } from "react";
import { PackageCard } from "@/components/admin/PackageCard";
import type { AdminPackagesOverview } from "@/lib/admin-packages-data";

function SectionLabel({ label, dotColor }: { label: string; dotColor?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {dotColor && <span className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: dotColor }} />}
      <span className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">{label}</span>
    </div>
  );
}

export function PackagesOverview({ overview }: { overview: AdminPackagesOverview }) {
  const [archivedOpen, setArchivedOpen] = useState(false);
  const isEmpty = overview.active.length === 0 && overview.draft.length === 0 && overview.archived.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-[18px] border border-border bg-surface px-4 py-10 text-center">
        <p className="text-[calc(14px*var(--font-scale))] font-semibold text-text-primary">Nenhum pacote ainda</p>
        <p className="text-[calc(12px*var(--font-scale))] text-text-muted">Use "+ Novo pacote" acima pra criar o primeiro.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {overview.active.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <SectionLabel label="Ativos" dotColor="#2c2218" />
          {overview.active.map((summary) => (
            <PackageCard key={summary.id} summary={summary} />
          ))}
        </div>
      )}

      {overview.draft.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <SectionLabel label="Rascunhos" dotColor="#c0ad94" />
          {overview.draft.map((summary) => (
            <PackageCard key={summary.id} summary={summary} />
          ))}
        </div>
      )}

      {overview.archived.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={() => setArchivedOpen((open) => !open)} className="flex items-center justify-between">
            <SectionLabel label={`Arquivados (${overview.archived.length})`} />
            <span className="text-[calc(12px*var(--font-scale))] text-text-muted">{archivedOpen ? "▾" : "▸"}</span>
          </button>
          {archivedOpen && overview.archived.map((summary) => <PackageCard key={summary.id} summary={summary} />)}
        </div>
      )}
    </div>
  );
}

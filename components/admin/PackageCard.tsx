"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { activatePackage, archivePackage } from "@/lib/package-admin-actions";
import type { AdminPackageSummary } from "@/lib/admin-packages-data";

const STATUS_BADGE: Record<AdminPackageSummary["status"], { label: string; className: string }> = {
  active: { label: "ATIVO", className: "bg-[rgba(44,34,24,0.1)] text-ink" },
  draft: { label: "RASCUNHO", className: "bg-[#ece3d6] text-text-muted" },
  archived: { label: "ARQUIVADO", className: "bg-[#ece3d6] text-text-muted" },
};

export function PackageCard({ summary }: { summary: AdminPackageSummary }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const badge = STATUS_BADGE[summary.status];

  function handleArchive() {
    setError(undefined);
    startTransition(async () => {
      const result = await archivePackage(summary.id);
      if (result.error) setError(result.error);
    });
  }

  function handleActivate() {
    setError(undefined);
    startTransition(async () => {
      const result = await activatePackage(summary.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{summary.title}</div>
          <div className="mt-0.5 text-[11px] text-text-muted">
            {summary.totalDays === 0
              ? "Nenhum dia configurado"
              : summary.status === "active"
                ? `Dia ${summary.currentDayNumber} de ${summary.totalDays} · iniciou ${summary.startDateLabel}`
                : `${summary.totalDays} ${summary.totalDays === 1 ? "dia" : "dias"} · iniciou ${summary.startDateLabel}`}
          </div>
        </div>
        <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {summary.status === "active" && <ProgressBar percent={summary.progressPercent} tone="light" />}

      {error && <p className="text-[11px] text-error">{error}</p>}

      <div className="flex items-center gap-2.5">
        {summary.status !== "archived" && (
          <Link
            href={`/admin/package/${summary.id}/edit`}
            className="rounded-full border border-input-border px-3.5 py-1.5 text-[11px] font-semibold text-text-secondary"
          >
            Editar
          </Link>
        )}
        {summary.status === "active" && (
          <button
            type="button"
            onClick={handleArchive}
            disabled={pending}
            className="rounded-full border border-[#e6c4be] px-3.5 py-1.5 text-[11px] font-semibold text-error disabled:opacity-60"
          >
            Arquivar
          </button>
        )}
        {summary.status === "draft" && (
          <button
            type="button"
            onClick={handleActivate}
            disabled={pending}
            className="rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-semibold text-background disabled:opacity-60"
          >
            Ativar
          </button>
        )}
      </div>
    </div>
  );
}

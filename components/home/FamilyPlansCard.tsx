"use client";

import Link from "next/link";
import { useState } from "react";
import { ReadingTimeline } from "@/components/ui/ReadingTimeline";
import type { PlanFamilyStatus } from "@/lib/home-data";

interface FamilyPlansCardProps {
  plans: PlanFamilyStatus[];
}

function PlanRow({ plan, withTopBorder }: { plan: PlanFamilyStatus; withTopBorder: boolean }) {
  return (
    <Link
      href={`/package/${plan.packageId}`}
      className={`flex items-center gap-3 py-3 transition-transform active:scale-[0.98] ${withTopBorder ? "border-t border-border" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[calc(13px*var(--font-scale))] font-semibold text-ink">{plan.packageTitle}</span>
          <span className="shrink-0 text-[calc(10px*var(--font-scale))] text-text-muted">
            Dia {plan.dayNumber} / {plan.totalDays}
          </span>
        </div>
        <div className="mt-2">
          <ReadingTimeline percent={plan.percent} members={plan.members} variant="light" />
        </div>
      </div>
    </Link>
  );
}

// Cada plano ativo entra aqui, separado em dois grupos: "ativo" é todo plano em que
// EU (usuário logado) ainda não li todos os dias — mesmo os futuros, não só os já
// vencidos; "finalizado" só quando o pacote inteiro já foi lido por mim. Não é um
// status do pacote em si (não existe botão de admin pra isso) — cada família vê os
// planos agrupados de acordo com o próprio progresso. "Finalizados" some minimizado
// por padrão (mesmo padrão do "Arquivados" no admin) — é histórico, não algo que
// precisa de atenção toda vez que a home abre.
export function FamilyPlansCard({ plans }: FamilyPlansCardProps) {
  const [finishedOpen, setFinishedOpen] = useState(false);
  const pendingPlans = plans.filter((plan) => !plan.finishedByMe);
  const finishedPlans = plans.filter((plan) => plan.finishedByMe);

  return (
    <div className="flex flex-col gap-4">
      {pendingPlans.length > 0 && (
        <div className="flex flex-col gap-1 rounded-[20px] border border-border bg-surface p-[18px]">
          <div className="mb-2 text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
            Planos ativos
          </div>
          {pendingPlans.map((plan, index) => (
            <PlanRow key={plan.packageId} plan={plan} withTopBorder={index > 0} />
          ))}
        </div>
      )}

      {finishedPlans.length > 0 && (
        <div className="flex flex-col gap-1 rounded-[20px] border border-border bg-surface p-[18px]">
          <button type="button" onClick={() => setFinishedOpen((open) => !open)} className="flex items-center justify-between py-0.5">
            <span className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
              Planos finalizados ({finishedPlans.length})
            </span>
            <span className="text-[calc(12px*var(--font-scale))] text-text-muted">{finishedOpen ? "▾" : "▸"}</span>
          </button>
          {finishedOpen &&
            finishedPlans.map((plan, index) => <PlanRow key={plan.packageId} plan={plan} withTopBorder={index > 0} />)}
        </div>
      )}
    </div>
  );
}

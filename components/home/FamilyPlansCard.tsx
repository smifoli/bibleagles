import Link from "next/link";
import { ReadingTimeline } from "@/components/ui/ReadingTimeline";
import type { PlanFamilyStatus } from "@/lib/home-data";

interface FamilyPlansCardProps {
  plans: PlanFamilyStatus[];
}

// Antes só o pacote "featured" mostrava quem da família já leu — o segundo plano
// ficava mudo sobre isso. Aqui todo pacote ativo ganha sua própria linha do tempo,
// separado da checklist de capítulos pendentes acima (que é sobre o usuário atual).
export function FamilyPlansCard({ plans }: FamilyPlansCardProps) {
  return (
    <div className="flex flex-col gap-1 rounded-[20px] border border-border bg-surface p-[18px]">
      <div className="mb-2 text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[2px] text-text-muted">
        A família nos planos
      </div>
      {plans.map((plan, index) => (
        <Link
          key={plan.packageId}
          href={`/package/${plan.packageId}`}
          className={`flex items-center gap-3 py-3 transition-transform active:scale-[0.98] ${index > 0 ? "border-t border-border" : ""}`}
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
      ))}
    </div>
  );
}

import Link from "next/link";
import type { PendingReadingItem } from "@/lib/home-data";

interface TodayReadingCardProps {
  items: PendingReadingItem[];
}

function readHref(item: PendingReadingItem): string {
  if (!item.firstPassage) return `/package/${item.packageId}`;
  return `/read/${item.firstPassage.book}/${item.firstPassage.chapter_start}?planDay=${item.planDayId}&from=${encodeURIComponent("/")}`;
}

// Unidade da checklist é o capítulo pendente, não o plano — mesmo com vários pacotes
// ativos ao mesmo tempo. Capítulos atrasados de QUALQUER plano ativo aparecem aqui um
// a um (não só como contador), na ordem em que deveriam ter sido lidos — mais atrasado
// primeiro, hoje por último — cada um com a data em que devia ter sido lido. Sem
// contador "X de Y lidos" no cabeçalho: Y cresceria sem parar num plano longo (soma
// TODOS os dias já vencidos desde o início, não só os de hoje) e vira um número sem
// sentido pra quem só quer saber "estou em dia ou não".
export function TodayReadingCard({ items }: TodayReadingCardProps) {
  const nextItem = items[0];

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-card-dark p-[18px]">
      <div>
        <div className="mb-1 text-[calc(9px*var(--font-scale))] font-semibold uppercase tracking-[1.5px] text-[#a08e78]">
          Sua leitura de hoje
        </div>
        <div className="text-[calc(17px*var(--font-scale))] font-semibold text-[#f7f1e6]">
          {items.length === 0
            ? "Você está em dia"
            : `${items.length} ${items.length === 1 ? "capítulo pendente" : "capítulos pendentes"}`}
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col">
          {items.map((item, index) => (
            <Link
              key={item.planDayId}
              href={readHref(item)}
              className={`flex items-center gap-3 py-2.5 transition-transform active:scale-[0.98] ${index > 0 ? "border-t border-[#43382a]" : ""}`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#6a5a45]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[calc(14px*var(--font-scale))] font-semibold text-[#f7f1e6]">
                  {item.chapterTitle}
                </span>
                <span className="mt-0.5 block truncate text-[calc(11px*var(--font-scale))] text-[#a08e78]">
                  {item.packageTitle} · dia {item.dayNumber} de {item.totalDays}
                  {!item.isToday && (
                    <span className="text-[#dc9552]"> · atrasado desde {item.dateLabel}</span>
                  )}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-[13px] text-[#a08e78]">
                ›
              </span>
            </Link>
          ))}
        </div>
      )}

      {nextItem ? (
        <Link
          href={readHref(nextItem)}
          className="self-end rounded-full bg-[#f3ebdc] px-[18px] py-2.5 text-[calc(12px*var(--font-scale))] font-semibold text-card-dark transition-transform active:scale-[0.96]"
        >
          Continuar em {nextItem.chapterTitle}
        </Link>
      ) : (
        <Link
          href="/history"
          className="self-end rounded-full bg-[#f3ebdc] px-[18px] py-2.5 text-[calc(12px*var(--font-scale))] font-semibold text-card-dark transition-transform active:scale-[0.96]"
        >
          Veja tudo que você já leu
        </Link>
      )}
    </div>
  );
}

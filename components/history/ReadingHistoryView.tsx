import Link from "next/link";
import type { ReadHistoryItem } from "@/lib/reading-history-data";

export function ReadingHistoryView({ items }: { items: ReadHistoryItem[] }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Voltar" className="text-[calc(18px*var(--font-scale))] text-text-muted">
          ←
        </Link>
        <div>
          <div className="text-[calc(17px*var(--font-scale))] font-semibold text-text-primary">O que você já leu</div>
          <div className="text-[calc(11px*var(--font-scale))] text-text-muted">
            {items.length} {items.length === 1 ? "capítulo" : "capítulos"}
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="text-[calc(14px*var(--font-scale))] text-text-muted">Você ainda não marcou nenhum capítulo como lido.</p>
      ) : (
        <div className="flex flex-col rounded-[18px] border border-border bg-surface px-4">
          {items.map((item, index) => (
            <Link
              key={`${item.book}-${item.chapter}`}
              href={`/read/${item.book}/${item.chapter}?from=${encodeURIComponent("/history")}`}
              className={`flex items-center justify-between gap-3 py-3 transition-transform active:scale-[0.98] ${index > 0 ? "border-t border-border" : ""}`}
            >
              <span className="text-[calc(13px*var(--font-scale))] font-semibold text-ink">{item.reference}</span>
              <span className="shrink-0 text-[calc(11px*var(--font-scale))] text-text-muted">{item.dateLabel}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

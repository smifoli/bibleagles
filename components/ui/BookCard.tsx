export interface BookCardProps {
  name: string;
  chapterCount: number;
  commentCount?: number;
  highlightCount?: number;
  onClick?: () => void;
}

// Extraído do grid de livros em components/bible-nav/BibleNavView.tsx.
export function BookCard({ name, chapterCount, commentCount = 0, highlightCount = 0, onClick }: BookCardProps) {
  const hasActivity = commentCount > 0 || highlightCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`transition-transform active:scale-[0.97] ${
        hasActivity
          ? "rounded-[14px] border border-[#b3a48c] bg-background p-[13px] text-left"
          : "rounded-[14px] border border-border bg-surface p-[13px] text-left"
      }`}
    >
      <div className="text-[calc(14px*var(--font-scale))] font-semibold text-text-primary">{name}</div>
      <div className="mt-0.5 text-[calc(11px*var(--font-scale))] text-text-muted">{chapterCount} capítulos</div>
      {hasActivity && (
        <div className="mt-[7px] text-[calc(11px*var(--font-scale))] text-[#7d6c58]">
          {[
            commentCount > 0 ? `${commentCount} ${commentCount === 1 ? "comentário" : "comentários"}` : null,
            highlightCount > 0 ? `${highlightCount} ${highlightCount === 1 ? "destaque" : "destaques"}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}
    </button>
  );
}

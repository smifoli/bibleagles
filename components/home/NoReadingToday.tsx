export function NoReadingToday() {
  return (
    <div className="rounded-[20px] border border-border bg-surface p-[18px] text-center">
      <p className="text-[calc(14px*var(--font-scale))] text-text-secondary">A mensagem ainda está no forno... volte mais tarde!</p>
    </div>
  );
}

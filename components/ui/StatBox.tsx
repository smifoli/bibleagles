export interface StatBoxProps {
  value: string | number;
  label: string;
}

export function StatBox({ value, label }: StatBoxProps) {
  return (
    <div className="flex-1 rounded-[14px] border border-border bg-background px-2.5 py-3 text-center">
      <div className="text-[calc(22px*var(--font-scale))] font-bold text-ink">{value}</div>
      <div className="mt-[3px] text-[calc(10px*var(--font-scale))] tracking-[0.5px] text-text-muted">{label}</div>
    </div>
  );
}

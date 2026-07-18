export type ProgressBarTone = "dark" | "light";

// dark = sobre fundo card-dark (pacote ativo); light = sobre fundo claro (pacote secundário, progresso de membro).
const TRACK_CLASSES: Record<ProgressBarTone, string> = {
  dark: "bg-[#43382a]",
  light: "bg-[#e8dcc6]",
};

const FILL_COLORS: Record<ProgressBarTone, string> = {
  dark: "#ece0c8",
  light: "#b3a48c",
};

export interface ProgressBarProps {
  /** 0–100; valores fora do intervalo são limitados (clamped). */
  percent: number;
  tone?: ProgressBarTone;
  /** Preenchimento ink (#2c2218) para indicar conclusão total, como em PackageStatsView. */
  complete?: boolean;
  className?: string;
}

export function ProgressBar({ percent, tone = "light", complete = false, className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={`h-[5px] rounded-full ${TRACK_CLASSES[tone]} ${className}`}>
      <div
        className="h-full rounded-full"
        style={{ width: `${clamped}%`, backgroundColor: complete ? "#2c2218" : FILL_COLORS[tone] }}
      />
    </div>
  );
}

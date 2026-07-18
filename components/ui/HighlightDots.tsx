import { HIGHLIGHT_COLOR_ORDER, HIGHLIGHT_COLORS } from "@/lib/highlight-colors";
import type { HighlightColor } from "@/types/database";

export interface HighlightDotsProps {
  selected?: HighlightColor | null;
  onSelect: (color: HighlightColor) => void;
  disabled?: boolean;
}

// Extraído do seletor de cor de destaque em components/reader/ReaderView.tsx.
export function HighlightDots({ selected = null, onSelect, disabled = false }: HighlightDotsProps) {
  return (
    <div className="flex gap-2.5">
      {HIGHLIGHT_COLOR_ORDER.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onSelect(color)}
          disabled={disabled}
          aria-label={color}
          aria-pressed={selected === color}
          className="h-6 w-6 rounded-full disabled:opacity-60"
          style={{
            backgroundColor: HIGHLIGHT_COLORS[color].bg,
            outline: selected === color ? "1.5px solid #2c2218" : undefined,
          }}
        />
      ))}
    </div>
  );
}

import type { CSSProperties } from "react";
import { HIGHLIGHT_COLORS, SAND_HIGHLIGHT } from "@/lib/highlight-colors";
import type { HighlightColor } from "@/types/database";

export type VerseBlockHighlight = HighlightColor | "sand";

export interface VerseBlockProps {
  number: number;
  text: string;
  /** Cor do destaque (mesmo sistema de lib/highlight-colors.ts), ou "sand" para o tom neutro de leitura. */
  highlighted?: VerseBlockHighlight;
  commentCount?: number;
  fontSize?: string;
  onClick?: () => void;
}

// Extraído da renderização de versículo em components/reader/ReaderView.tsx.
export function VerseBlock({ number, text, highlighted, commentCount = 0, fontSize = "16px", onClick }: VerseBlockProps) {
  const style = highlighted ? (highlighted === "sand" ? SAND_HIGHLIGHT : HIGHLIGHT_COLORS[highlighted]) : undefined;

  const contentStyle: CSSProperties = {
    fontSize,
    backgroundColor: style?.bg,
    color: style?.text ?? "#52442f",
    borderRadius: style ? "10px" : undefined,
    padding: style ? "11px 14px" : "7px 2px",
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={contentStyle}
      className={`font-serif leading-[1.8] ${onClick ? "cursor-pointer" : ""}`}
    >
      <sup className="mr-[5px] font-sans text-[calc(10px*var(--font-scale))] font-semibold" style={{ color: style?.verseNum ?? "#a3927d" }}>
        {number}
      </sup>
      {text}
      {commentCount > 0 && (
        <span className="ml-1.5 font-sans text-[calc(10px*var(--font-scale))] font-semibold" style={{ color: style ? style.verseNum : "#a3927d" }}>
          · {commentCount} {commentCount === 1 ? "comentário" : "comentários"}
        </span>
      )}
    </div>
  );
}

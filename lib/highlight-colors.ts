import type { HighlightColor } from "@/types/database";

export interface HighlightColorStyle {
  bg: string;
  text: string;
  verseNum: string;
}

// Só o amarelo tem valores exatos no design (design/index.html .verse-yellow);
// as outras 3 seguem o mesmo padrão de escurecimento aplicado à cor do dot.
export const HIGHLIGHT_COLORS: Record<HighlightColor, HighlightColorStyle> = {
  yellow: { bg: "#f1e6a0", text: "#3a2f17", verseNum: "#9a883e" },
  green: { bg: "#bcd0b3", text: "#2f3a26", verseNum: "#5e7350" },
  rose: { bg: "#e6b3a6", text: "#4a2820", verseNum: "#8a5a4d" },
  blue: { bg: "#b3c4d6", text: "#1f2c38", verseNum: "#4f6478" },
};

export const HIGHLIGHT_COLOR_ORDER: HighlightColor[] = ["yellow", "green", "rose", "blue"];

export const SAND_HIGHLIGHT: HighlightColorStyle = { bg: "#ece0cf", text: "#4a3f2c", verseNum: "#a3927d" };

import type { FontSizePreference } from "@/types/database";

export const FONT_SIZE_COOKIE = "font_size";

export const FONT_SIZE_MULTIPLIER: Record<FontSizePreference, number> = {
  normal: 1.3,
  large: 1.45,
  xlarge: 1.6,
};

export const FONT_SIZE_LABELS: Record<FontSizePreference, string> = {
  normal: "Normal",
  large: "Grande",
  xlarge: "Muito grande",
};

export const FONT_SIZE_ORDER: FontSizePreference[] = ["normal", "large", "xlarge"];

export function isFontSizePreference(value: string | undefined | null): value is FontSizePreference {
  return value === "normal" || value === "large" || value === "xlarge";
}

// Tamanho do texto bíblico no leitor — preferência de dispositivo (cookie
// direto do cliente, sem ida ao banco), separada do --font-scale do resto
// do app.
export const VERSE_FONT_SIZE_COOKIE = "bible_font_size";
export const VERSE_FONT_MIN = 14;
export const VERSE_FONT_MAX = 32;
export const VERSE_FONT_STEP = 2;
export const VERSE_FONT_DEFAULT = 16;

export function clampVerseFontSize(value: number): number {
  return Math.min(VERSE_FONT_MAX, Math.max(VERSE_FONT_MIN, value));
}

export function parseVerseFontSize(value: string | undefined | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampVerseFontSize(parsed) : VERSE_FONT_DEFAULT;
}

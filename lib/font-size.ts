import type { FontSizePreference } from "@/types/database";

export const FONT_SIZE_COOKIE = "font_size";

export const FONT_SIZE_MULTIPLIER: Record<FontSizePreference, number> = {
  normal: 1.3,
  large: 1.45,
  xlarge: 1.6,
};

export const FONT_SIZE_LABELS: Record<FontSizePreference, string> = {
  normal: "Pequeno",
  large: "Normal",
  xlarge: "Grande",
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
export const VERSE_FONT_DEFAULT = 24;

export function clampVerseFontSize(value: number): number {
  return Math.min(VERSE_FONT_MAX, Math.max(VERSE_FONT_MIN, value));
}

export function parseVerseFontSize(value: string | undefined | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clampVerseFontSize(parsed) : VERSE_FONT_DEFAULT;
}

// Tipo de letra do texto bíblico no leitor — mesma ideia do tamanho acima
// (cookie de dispositivo, não vai pro perfil/banco). As stacks referenciam as
// variáveis CSS que next/font expõe em app/layout.tsx.
export type VerseFontFamily = "spectral" | "lora" | "sans" | "arial";

export const VERSE_FONT_FAMILY_COOKIE = "bible_font_family";
export const VERSE_FONT_FAMILY_DEFAULT: VerseFontFamily = "spectral";

export const VERSE_FONT_FAMILY_OPTIONS: { key: VerseFontFamily; label: string; stack: string }[] = [
  { key: "spectral", label: "Spectral", stack: "var(--font-spectral), Georgia, serif" },
  { key: "lora", label: "Lora", stack: "var(--font-lora), Georgia, serif" },
  { key: "sans", label: "Space Grotesk", stack: "var(--font-space-grotesk), system-ui, sans-serif" },
  // Fonte de sistema (sem next/font) — já vem instalada no aparelho, sem baixar nada.
  { key: "arial", label: "Arial", stack: "Arial, Helvetica, sans-serif" },
];

export function isVerseFontFamily(value: string | undefined | null): value is VerseFontFamily {
  return value === "spectral" || value === "lora" || value === "sans" || value === "arial";
}

export function parseVerseFontFamily(value: string | undefined | null): VerseFontFamily {
  return isVerseFontFamily(value) ? value : VERSE_FONT_FAMILY_DEFAULT;
}

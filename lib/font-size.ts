import type { FontSizePreference } from "@/types/database";

export const FONT_SIZE_COOKIE = "font_size";

export const FONT_SIZE_MULTIPLIER: Record<FontSizePreference, number> = {
  normal: 1,
  large: 1.12,
  xlarge: 1.25,
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

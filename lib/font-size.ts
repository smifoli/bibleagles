import type { FontSizePreference } from "@/types/database";

export const FONT_SIZE_COOKIE = "font_size";

export const FONT_SIZE_SCALE: Record<FontSizePreference, string> = {
  normal: "100%",
  large: "112%",
  xlarge: "125%",
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

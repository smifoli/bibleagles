import type { HTMLAttributes } from "react";

export type ChipVariant = "outline" | "dark" | "muted";

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  outline: "border border-[#d4c5ac] text-ink",
  dark: "bg-ink text-background",
  muted: "border border-[#e0d3bf] text-text-muted",
};

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
}

export function Chip({ variant = "outline", className = "", ...props }: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[calc(11px*var(--font-scale))] font-semibold ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}

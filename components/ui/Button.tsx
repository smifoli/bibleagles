import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "w-full rounded-[13px] bg-ink py-[15px] text-[calc(13px*var(--font-scale))] font-semibold text-background disabled:opacity-60",
  secondary: "w-full rounded-full bg-[#efe7d8] py-2.5 text-[calc(12px*var(--font-scale))] font-semibold text-ink disabled:opacity-60",
  ghost:
    "rounded-full border border-input-border bg-transparent px-4 py-[9px] text-[calc(12px*var(--font-scale))] font-semibold text-text-secondary disabled:opacity-60",
  danger: "rounded-full bg-[#a03a2a]/[0.08] px-4 py-[9px] text-[calc(12px*var(--font-scale))] font-semibold text-error disabled:opacity-60",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`transition-transform active:scale-[0.97] ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}

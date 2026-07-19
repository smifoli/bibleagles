import type { InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
}

export function FormField({ label, name, ...inputProps }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[calc(10px*var(--font-scale))] font-semibold uppercase tracking-[1.5px] text-text-muted">
        {label}
      </span>
      <input
        id={name}
        name={name}
        className="bg-background border border-input-border rounded-[10px] px-3 py-2.5 font-sans text-[calc(13px*var(--font-scale))] text-ink focus:outline-none focus:border-ink"
        {...inputProps}
      />
    </label>
  );
}

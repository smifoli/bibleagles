import type { ReactNode } from "react";

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-[13px] bg-ink px-4 py-[15px] font-sans text-[calc(13px*var(--font-scale))] font-semibold text-background"
    >
      {children}
    </button>
  );
}

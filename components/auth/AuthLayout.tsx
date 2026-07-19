import type { ReactNode } from "react";

export function AuthLayout({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="w-8 h-8 rounded-full border border-input-border bg-[#ece3d6] flex items-center justify-center overflow-hidden shrink-0">
          <img src="/logo.svg" alt="" width={32} height={32} className="w-full h-full object-cover" />
        </div>
        <h1 className="text-[22px] font-semibold text-text-primary text-center">{title}</h1>
        <div className="w-full flex flex-col gap-4">{children}</div>
        {footer}
      </div>
    </main>
  );
}

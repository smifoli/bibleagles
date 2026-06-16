import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 px-[18px] py-5">{children}</div>
      <BottomNav />
    </div>
  );
}

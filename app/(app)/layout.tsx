import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-[18px] py-5">{children}</div>
      <BottomNav />
    </div>
  );
}

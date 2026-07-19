"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Início", match: (pathname: string) => pathname === "/" },
  { href: "/bible", label: "Bíblia", match: (pathname: string) => pathname.startsWith("/bible") || pathname.startsWith("/read/") },
  { href: "/bookmarks", label: "Destaques", match: (pathname: string) => pathname === "/bookmarks" },
  { href: "/profile", label: "Perfil", match: (pathname: string) => pathname === "/profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex justify-around border-t border-border px-0 pt-[13px] pb-[max(15px,env(safe-area-inset-bottom))]">
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);
        return (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5">
            <span className={`h-0.5 w-[18px] rounded-full ${isActive ? "bg-ink" : "bg-transparent"}`} />
            <span className={`text-[calc(11px*var(--font-scale))] font-medium ${isActive ? "text-ink" : "text-[#a3927d]"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

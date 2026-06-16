"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Início" },
  { href: "/bible", label: "Bíblia" },
  { href: "/bookmarks", label: "Marcas" },
  { href: "/profile", label: "Perfil" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex justify-around border-t border-border px-0 py-[13px] pb-[15px]">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1.5">
            <span className={`h-0.5 w-[18px] rounded-full ${isActive ? "bg-ink" : "bg-transparent"}`} />
            <span className={`text-[11px] font-medium ${isActive ? "text-ink" : "text-[#a3927d]"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

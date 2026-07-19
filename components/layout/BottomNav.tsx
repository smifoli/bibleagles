"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LAST_READ_COOKIE } from "@/lib/last-read";

const NAV_ITEMS = [
  { key: "home", href: "/", label: "Início", match: (pathname: string) => pathname === "/" },
  {
    key: "bible",
    href: "/bible",
    label: "Bíblia",
    match: (pathname: string) => pathname.startsWith("/bible") || pathname.startsWith("/read/"),
  },
  { key: "bookmarks", href: "/bookmarks", label: "Destaques", match: (pathname: string) => pathname === "/bookmarks" },
  { key: "profile", href: "/profile", label: "Perfil", match: (pathname: string) => pathname === "/profile" },
];

function readLastReadPath(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LAST_READ_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function BottomNav() {
  const pathname = usePathname();
  // Só existe no cliente (cookie) — nulo no SSR, então "Bíblia" cai no
  // fallback /bible até o primeiro render do lado do cliente resolver.
  const [lastReadPath, setLastReadPath] = useState<string | null>(null);

  useEffect(() => {
    setLastReadPath(readLastReadPath());
  }, [pathname]);

  return (
    <nav className="flex justify-around border-t border-border px-0 pt-[13px] pb-[max(15px,env(safe-area-inset-bottom))]">
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);
        // Se já estava lendo um capítulo, "Bíblia" volta pra lá em vez de
        // reiniciar na lista de livros — mas não enquanto já estiver no
        // leitor (senão clicar nela recarregaria o mesmo capítulo à toa).
        const href = item.key === "bible" && lastReadPath && !pathname.startsWith("/read/") ? lastReadPath : item.href;
        return (
          <Link key={item.key} href={href} className="flex flex-col items-center gap-1.5">
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

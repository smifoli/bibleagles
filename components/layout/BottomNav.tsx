"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

// Tocar de novo na aba já ativa nunca deveria "não fazer nada": primeiro rola
// pro topo (padrão de app com aba); só sobe de nível (leitor -> capítulos ->
// livros) numa segunda tocada, já com a tela no topo.
const SCROLL_TOP_THRESHOLD_PX = 24;

function readLastReadPath(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LAST_READ_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Um nível acima dentro da Bíblia: leitor -> grade de capítulos -> lista de livros -> null (já no topo). */
function bibleParentHref(pathname: string): string | null {
  const readMatch = pathname.match(/^\/read\/([^/]+)\/[^/]+/);
  if (readMatch) {
    const version = new URLSearchParams(window.location.search).get("version");
    return `/bible/${readMatch[1]}${version ? `?version=${version}` : ""}`;
  }
  if (/^\/bible\/[^/]+/.test(pathname)) return "/bible";
  return null;
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  // Só existe no cliente (cookie) — nulo no SSR, então "Bíblia" cai no
  // fallback /bible até o primeiro render do lado do cliente resolver.
  const [lastReadPath, setLastReadPath] = useState<string | null>(null);

  useEffect(() => {
    setLastReadPath(readLastReadPath());
  }, [pathname]);

  const inBibleSection = pathname.startsWith("/bible") || pathname.startsWith("/read/");

  // Dentro da Bíblia (leitor ou grade de capítulos), "Bíblia" nunca recarrega a
  // mesma tela: primeiro toque rola pro topo se a página estiver rolada; já no
  // topo, sobe um nível na hierarquia. Fora da Bíblia, o comportamento de sempre
  // (retomar o último capítulo lido) continua valendo — só a navegação por
  // dentro dela é que virou progressiva.
  function handleBibleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!inBibleSection) return;
    event.preventDefault();

    if (window.scrollY > SCROLL_TOP_THRESHOLD_PX) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const parentHref = bibleParentHref(pathname);
    if (parentHref) router.push(parentHref);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-border bg-background px-0 pt-[13px] pb-[max(15px,env(safe-area-inset-bottom))]">
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);
        // Se já estava lendo um capítulo, "Bíblia" volta pra lá em vez de
        // reiniciar na lista de livros — mas não enquanto já estiver dentro
        // da Bíblia (senão clicar nela recarregaria a mesma tela à toa).
        const href = item.key === "bible" && lastReadPath && !inBibleSection ? lastReadPath : item.href;
        return (
          <Link
            key={item.key}
            href={href}
            onClick={item.key === "bible" ? handleBibleClick : undefined}
            className="flex flex-col items-center gap-1.5 transition-transform active:scale-90"
          >
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

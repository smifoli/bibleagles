import Link from "next/link";

export interface NavItem {
  key: string;
  label: string;
  href: string;
}

export interface NavBarProps {
  items: NavItem[];
  activeItem: string;
}

// Versão genérica/reutilizável de components/layout/BottomNav.tsx — recebe os itens e o item
// ativo via props, em vez de resolver a rota ativa internamente com usePathname.
export function NavBar({ items, activeItem }: NavBarProps) {
  return (
    <nav className="flex justify-around border-t border-border px-0 py-[13px] pb-[15px]">
      {items.map((item) => {
        const isActive = item.key === activeItem;
        return (
          <Link key={item.key} href={item.href} className="flex flex-col items-center gap-1.5">
            <span className={`h-0.5 w-[18px] rounded-full ${isActive ? "bg-ink" : "bg-transparent"}`} />
            <span className={`text-[calc(11px*var(--font-scale))] font-medium ${isActive ? "text-ink" : "text-[#a3927d]"}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

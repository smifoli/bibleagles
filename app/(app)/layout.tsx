import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { BottomNav } from "@/components/layout/BottomNav";
import { FONT_SIZE_COOKIE, FONT_SIZE_MULTIPLIER, isFontSizePreference } from "@/lib/font-size";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const fontSizeCookie = cookieStore.get(FONT_SIZE_COOKIE)?.value;
  const fontSize = isFontSizePreference(fontSizeCookie) ? fontSizeCookie : "normal";
  const multiplier = FONT_SIZE_MULTIPLIER[fontSize];

  return (
    // `zoom` no <html> (app/layout.tsx) amplia tudo, mas 100dvh continua
    // sendo calculado contra a viewport real (não a ampliada) — sem essa
    // compensação, o conteúdo fica maior que a caixa e empurra o BottomNav
    // pra fora da tela visível. Dividindo pelo mesmo fator, a altura
    // renderizada volta a bater com 100dvh depois do zoom.
    <div className="flex flex-col overflow-hidden" style={{ height: `calc(100dvh / ${multiplier})` }}>
      <div className="flex-1 overflow-y-auto px-[18px] py-5">{children}</div>
      <BottomNav />
    </div>
  );
}

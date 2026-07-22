import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";

// Toda página aqui embaixo lê dados por usuário/família via Supabase — sem
// isso, o fetch cache do Next pode servir uma resposta antiga (ex.: foto de
// perfil, comentário, destaque) mesmo depois de um revalidatePath, porque
// usar cookies()/headers() só tira a rota do Full Route Cache, não desliga
// o cache dos fetches individuais.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  // O conteúdo rola no documento (não numa div interna com overflow-y-auto) de
  // propósito: o gesto do iOS de tocar a barra de status pra rolar ao topo só
  // funciona quando quem rola é a janela — não afeta um container aninhado. O
  // BottomNav vira `fixed` (ver components/layout/BottomNav.tsx) pra continuar
  // fixo na tela, e o padding-bottom aqui evita que o conteúdo fique embaixo dele.
  return (
    <>
      <div className="px-[18px] pb-[calc(56px+max(15px,env(safe-area-inset-bottom)))] pt-5">{children}</div>
      <BottomNav />
    </>
  );
}

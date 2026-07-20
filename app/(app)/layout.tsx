import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";

// Toda página aqui embaixo lê dados por usuário/família via Supabase — sem
// isso, o fetch cache do Next pode servir uma resposta antiga (ex.: foto de
// perfil, comentário, destaque) mesmo depois de um revalidatePath, porque
// usar cookies()/headers() só tira a rota do Full Route Cache, não desliga
// o cache dos fetches individuais.
export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-[18px] py-5">{children}</div>
      <BottomNav />
    </div>
  );
}

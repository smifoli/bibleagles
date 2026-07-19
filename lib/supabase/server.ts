import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            );
          } catch {
            // Server Component — cookies só podem ser definidos em Route Handlers ou Server Actions
          }
        },
      },
    }
  );
}

/**
 * Lê o usuário autenticado a partir da sessão local (cookies), sem round-trip
 * de rede. O middleware já roda `auth.getUser()` (que valida contra o servidor
 * de Auth da Supabase) em toda request antes de chegar aqui — repetir esse
 * round-trip em cada page/action dobra a latência de rede sem ganho de
 * segurança, já que o JWT é assinado e não pode ser forjado localmente.
 */
export async function getUser(supabase: SupabaseServerClient): Promise<{ data: { user: User | null } }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return { data: { user: session?.user ?? null } };
}

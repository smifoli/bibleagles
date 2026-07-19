import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente com a service_role key — ignora RLS e dá acesso à Admin API de
 * auth (banir/apagar usuários). Só pode ser usado dentro de Server Actions
 * já protegidas por checagem de admin; nunca deve chegar no cliente.
 */
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

import type { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AdminMember {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
}

export async function getAdminMembers(supabase: SupabaseServerClient): Promise<AdminMember[]> {
  const { data } = await supabase
    .from("users")
    .select("id, name, email, avatar_url, role")
    .order("name", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
  }));
}

import { redirect } from "next/navigation";
import { AdminView } from "@/components/admin/AdminView";
import { getAdminMembers } from "@/lib/admin-data";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const members = await getAdminMembers(supabase);

  return <AdminView members={members} currentUserId={user.id} />;
}

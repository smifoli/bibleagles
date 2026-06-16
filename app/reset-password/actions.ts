"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { translateAuthError } from "@/lib/auth-errors";

export async function updatePassword(formData: FormData) {
  const password = formData.get("password")?.toString() ?? "";

  if (password.length < 8) {
    redirect(`/reset-password?error=${encodeURIComponent("A senha precisa ter pelo menos 8 caracteres.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(translateAuthError(error.message))}`);
  }

  redirect("/");
}

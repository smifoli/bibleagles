"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { translateAuthError } from "@/lib/auth-errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(formData: FormData) {
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!name) {
    redirect(`/register?error=${encodeURIComponent("Informe seu nome.")}`);
  }
  if (!EMAIL_PATTERN.test(email)) {
    redirect(`/register?error=${encodeURIComponent("Informe um e-mail válido.")}`);
  }
  if (password.length < 8) {
    redirect(`/register?error=${encodeURIComponent("A senha precisa ter pelo menos 8 caracteres.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(translateAuthError(error.message))}`);
  }

  redirect("/");
}

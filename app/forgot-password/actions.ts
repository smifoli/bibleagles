"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email")?.toString().trim() ?? "";

  if (!EMAIL_PATTERN.test(email)) {
    redirect(`/forgot-password?error=${encodeURIComponent("Informe um e-mail válido.")}`);
  }

  // Sem custom SMTP (free tier), a Supabase ignora qualquer redirectTo
  // customizado e sempre redireciona pra Site URL do projeto com ?code= — o
  // middleware trata a troca desse code por sessão nessa rota base.
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email);

  // Sempre mostra sucesso, mesmo se o e-mail não existir, para não revelar quais
  // e-mails estão cadastrados (evita enumeração de contas).
  redirect("/forgot-password?sent=1");
}

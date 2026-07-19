import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormError } from "@/components/auth/FormError";
import { createClient, getUser } from "@/lib/supabase/server";
import { updatePassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await getUser(supabase);

  if (!user) {
    return (
      <AuthLayout
        title="Link inválido"
        footer={
          <Link href="/forgot-password" className="text-[13px] text-link">
            Solicitar novo link
          </Link>
        }
      >
        <p className="text-sm text-text-secondary text-center">
          Esse link de redefinição de senha é inválido ou já expirou.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Nova senha" footer={null}>
      <form action={updatePassword} className="flex flex-col gap-4">
        <FormField
          label="Nova senha"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FormError message={searchParams.error} />
        <SubmitButton>Salvar nova senha</SubmitButton>
      </form>
    </AuthLayout>
  );
}

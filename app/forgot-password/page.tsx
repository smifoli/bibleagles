import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormError } from "@/components/auth/FormError";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; sent?: string };
}) {
  const backToLogin = (
    <Link href="/login" className="text-[13px] text-link">
      Voltar para Entrar
    </Link>
  );

  if (searchParams.sent) {
    return (
      <AuthLayout title="Verifique seu e-mail" footer={backToLogin}>
        <p className="text-sm text-text-secondary text-center">
          Se esse e-mail estiver cadastrado, enviamos um link para redefinir sua senha.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Esqueci a senha" footer={backToLogin}>
      <form action={requestPasswordReset} className="flex flex-col gap-4">
        <FormField label="E-mail" name="email" type="email" autoComplete="email" required />
        <FormError message={searchParams.error} />
        <SubmitButton>Enviar link</SubmitButton>
      </form>
    </AuthLayout>
  );
}

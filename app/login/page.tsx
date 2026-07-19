import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormError } from "@/components/auth/FormError";
import { login } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <AuthLayout
      title="Entrar"
      footer={
        <div className="flex flex-col items-center gap-2">
          <Link href="/forgot-password" className="text-[13px] text-link">
            Esqueci minha senha
          </Link>
          <Link href="/register" className="text-[13px] text-link">
            Não tenho conta? Criar conta
          </Link>
        </div>
      }
    >
      <form action={login} className="flex flex-col gap-4">
        <FormField label="E-mail" name="email" type="email" autoComplete="email" required />
        <FormField
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <FormError message={searchParams.error} />
        <SubmitButton>Entrar</SubmitButton>
      </form>
    </AuthLayout>
  );
}

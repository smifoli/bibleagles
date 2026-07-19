import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormError } from "@/components/auth/FormError";
import { register } from "./actions";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <AuthLayout
      title="Criar conta"
      footer={
        <Link href="/login" className="text-[calc(13px*var(--font-scale))] text-link">
          Já tenho conta? Entrar
        </Link>
      }
    >
      <form action={register} className="flex flex-col gap-4">
        <FormField label="Nome" name="name" type="text" autoComplete="name" required />
        <FormField label="E-mail" name="email" type="email" autoComplete="email" required />
        <FormField
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <FormError message={searchParams.error} />
        <SubmitButton>Criar conta</SubmitButton>
      </form>
    </AuthLayout>
  );
}

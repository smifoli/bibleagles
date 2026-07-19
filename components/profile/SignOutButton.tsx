import { signOutAction } from "@/lib/profile-actions";

export function SignOutButton() {
  return (
    <form action={signOutAction} className="flex justify-center">
      <button type="submit" className="rounded-full bg-error/[0.08] px-4 py-[9px] text-[calc(12px*var(--font-scale))] font-semibold text-error">
        Sair da conta
      </button>
    </form>
  );
}

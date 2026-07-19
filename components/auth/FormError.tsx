export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[calc(12px*var(--font-scale))] text-error">{message}</p>;
}

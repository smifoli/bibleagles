export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
          Você está offline
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Não foi possível carregar esta página. Verifique sua conexão e tente novamente.
        </p>
        <p className="mt-6 text-sm text-text-muted font-serif italic">
          "Aqueles que esperam no Senhor renovam as suas forças." — Is 40:31
        </p>
      </div>
    </main>
  );
}

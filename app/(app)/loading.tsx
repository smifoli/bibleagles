// Um único loading.tsx pro grupo (app) inteiro: como nenhuma rota abaixo tem
// layout.tsx próprio, esse boundary de Suspense cobre page.tsx de todas elas
// (home, bíblia, leitor, destaques, perfil, pacotes, admin, família) — troca
// a tela em branco durante a navegação por esse spinner enquanto o Server
// Component busca os dados no Supabase.
export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-text-secondary"
        role="status"
        aria-label="Carregando"
      />
    </div>
  );
}

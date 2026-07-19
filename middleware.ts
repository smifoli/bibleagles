import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface Jwk {
  kty: string;
  key_ops: string[];
  [key: string]: unknown;
}

// O projeto usa chaves de assinatura JWT assimétricas (ES256) — cacheamos o
// JWKS aqui (nível de módulo, sobrevive entre invocações da mesma instância
// Edge) pra que getClaims() valide o token localmente via WebCrypto, sem
// round-trip de rede pro servidor de Auth em cada request. TTL de 10min
// espelha o cache interno do próprio auth-js (JWKS_TTL).
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 10 * 60 * 1000;

async function getCachedJwks(supabaseUrl: string): Promise<Jwk[] | null> {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    if (!res.ok) return jwksCache?.keys ?? null;
    const data = (await res.json()) as { keys: Jwk[] };
    jwksCache = { keys: data.keys, fetchedAt: now };
    return data.keys;
  } catch {
    // Falha na busca do JWKS (rede instável) — usa o cache anterior se
    // existir; getClaims() cai pra validação via getUser() se não houver
    // chave nenhuma disponível.
    return jwksCache?.keys ?? null;
  }
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // O link de recuperação de senha sempre cai na URL base do projeto com ?code=
  // (a Supabase ignora qualquer path/query customizado em redirect_to nesse
  // tier) — só um Route Handler ou o middleware pode definir cookies, então a
  // troca do code por sessão precisa acontecer aqui antes de qualquer outra coisa.
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const url = request.nextUrl.clone();
    url.search = "";
    if (error) {
      url.pathname = "/forgot-password";
      url.searchParams.set("error", "Link inválido ou expirado. Solicite novamente.");
    } else {
      url.pathname = "/reset-password";
    }
    // exchangeCodeForSession grava os cookies de sessão em supabaseResponse (via
    // setAll acima) — precisam ser copiados pra resposta de redirect, já que ela
    // é um objeto novo.
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  const jwks = await getCachedJwks(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const { data: claimsData } = await supabase.auth.getClaims(undefined, jwks ? { jwks: { keys: jwks } } : undefined);
  const user = claimsData?.claims ?? null;

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password";
  const isPublicRoute = isAuthRoute || pathname === "/reset-password";

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|workbox-|fallback-|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

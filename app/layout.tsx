import type { Metadata, Viewport } from "next";
import { Lora, Space_Grotesk, Spectral } from "next/font/google";
import { cookies } from "next/headers";
import { FONT_SIZE_COOKIE, FONT_SIZE_MULTIPLIER, isFontSizePreference } from "@/lib/font-size";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

// Segunda opção de fonte pro texto bíblico (ver VERSE_FONT_FAMILY_OPTIONS em
// lib/font-size.ts) — serifa com um caráter mais moderno que a Spectral, pra
// quem prefere. A terceira opção (sem serifa) reaproveita a Space Grotesk
// acima, sem custo extra de fonte.
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BiblEagles",
  description: "Leitura bíblica em família",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BiblEagles",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f5efe4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // Sem isso, o teclado virtual só encolhe a "visual viewport" (resizes-visual,
  // padrão) — a layout viewport, onde o BottomNav `fixed` (bottom: 0) se ancora,
  // não muda de tamanho, e é isso que faz elementos fixos "flutuarem"/pularem de
  // posição quando o teclado abre (bug clássico de iOS/Android). resizes-content
  // encolhe a própria layout viewport junto com o teclado, então o BottomNav
  // continua colado no fundo do que está visível, sem pulo.
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const fontSizeCookie = cookieStore.get(FONT_SIZE_COOKIE)?.value;
  const fontSize = isFontSizePreference(fontSizeCookie) ? fontSizeCookie : "normal";

  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${spectral.variable} ${lora.variable}`}
      // A maioria do texto do app usa tamanhos fixos em px (text-[calc(13px*var(--font-scale))] etc,
      // não rem), então cada um desses foi reescrito pra
      // text-[calc(Npx*var(--font-scale))] — essa variável é o único lugar
      // que muda com a preferência. Só escala fonte, nada de bordas/ícones.
      style={{ "--font-scale": FONT_SIZE_MULTIPLIER[fontSize] } as React.CSSProperties}
    >
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}

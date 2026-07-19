import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Spectral } from "next/font/google";
import { cookies } from "next/headers";
import { FONT_SIZE_COOKIE, FONT_SIZE_SCALE, isFontSizePreference } from "@/lib/font-size";
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
      className={`${spaceGrotesk.variable} ${spectral.variable}`}
      style={{ fontSize: FONT_SIZE_SCALE[fontSize] }}
    >
      <body>{children}</body>
    </html>
  );
}

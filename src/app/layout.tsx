import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";
// CSS de MapLibre cargado globalmente. Es pequeño (~40 KB) y así está
// siempre disponible cuando un componente con dynamic import lo necesita
// (evita carrera donde el canvas se crea antes de que llegue el CSS).
import "maplibre-gl/dist/maplibre-gl.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PermutaES — Permutas de plaza para funcionarios públicos en España",
    template: "%s | PermutaES",
  },
  description:
    "Plataforma nacional gratuita para que funcionarios públicos españoles encuentren cadenas de permuta compatibles. Detección automática de permutas directas, a 3 y a 4. Cubre profesorado, sanidad, AGE, autonómicos, local, habilitados nacionales y policía local.",
  keywords: [
    "permuta funcionario",
    "permuta funcionarios",
    "permuta plaza",
    "permutas docentes",
    "permutas sanidad",
    "permutas AGE",
    "intercambio plaza funcionario",
    "cadena de permutas",
    "permuta España",
  ],
  authors: [{ name: "PermutaES" }],
  creator: "PermutaES",
  metadataBase: new URL("https://permutaes.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PermutaES — Permutas de plaza para funcionarios públicos en España",
    description:
      "Plataforma nacional gratuita para que funcionarios públicos españoles encuentren cadenas de permuta compatibles.",
    url: "https://permutaes.vercel.app",
    siteName: "PermutaES",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PermutaES — Permutas de plaza para funcionarios públicos en España",
    description:
      "Plataforma nacional gratuita para que funcionarios públicos españoles encuentren cadenas de permuta compatibles.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header />
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}

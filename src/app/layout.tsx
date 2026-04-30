import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

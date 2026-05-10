import type { Metadata } from "next";
import { DM_Sans, Sora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DemoBanner } from "@/components/DemoBanner";
import { modoDemoActivo } from "@/lib/demo";
import { SITE_URL } from "@/lib/site-url";
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
    default: "PermutaES — Bolsa de permutas para funcionarios públicos en España",
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
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PermutaES — Bolsa de permutas para funcionarios públicos en España",
    description:
      "Plataforma nacional gratuita para que funcionarios públicos españoles encuentren cadenas de permuta compatibles.",
    url: SITE_URL,
    siteName: "PermutaES",
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PermutaES — Bolsa de permutas para funcionarios públicos en España",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const demoActivo = await modoDemoActivo();

  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${sora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Skip-link de accesibilidad (WCAG 2.4.1). Invisible hasta que
            el usuario tabula; aparece flotando arriba a la izquierda y
            le permite saltar el header e ir al contenido principal sin
            recorrer todos los enlaces de navegacion. */}
        <a
          href="#contenido-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-card focus:outline-none focus:ring-2 focus:ring-brand-light"
        >
          Saltar al contenido principal
        </a>
        <DemoBanner activo={demoActivo} />
        <Header />
        <div id="contenido-principal" className="flex flex-1 flex-col">
          {children}
        </div>
        <Footer />
        {/* Vercel Web Analytics. Sin cookies, RGPD-friendly. Solo
            cuenta visitas, paginas mas vistas y referrers (de donde
            llega la gente). Util para medir la efectividad de la
            difusion en foros / sindicatos / redes. */}
        <Analytics />
      </body>
    </html>
  );
}

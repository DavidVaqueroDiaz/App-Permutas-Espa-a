import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Headers de seguridad globales. Mitigan varias clases de ataque:
 *   - HSTS: fuerza HTTPS durante 2 anos.
 *   - X-Frame-Options: previene que la web se embeba en un iframe
 *     ajeno (clickjacking).
 *   - X-Content-Type-Options: bloquea MIME sniffing.
 *   - Referrer-Policy: limita la info que enviamos en el Referer al
 *     navegar a otro dominio.
 *   - Permissions-Policy: deniega APIs sensibles que no usamos.
 *   - X-DNS-Prefetch-Control: deja que el navegador haga DNS prefetch.
 *
 * NOTA: NO ponemos Content-Security-Policy aqui porque MapLibre
 * carga estilos inline + workers, y Next.js usa inline scripts para
 * hidratar. Una CSP estricta requiere nonces o trabajar con cada
 * runtime y el riesgo de romper la app es alto. Lo dejamos como
 * mejora pendiente para una sesion dedicada.
 */
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  // Quita el header X-Powered-By: Next.js (information disclosure).
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Solo aplicamos withSentryConfig si hay DSN. En local, sin DSN, el
// build de Next va por el camino normal. En produccion (Vercel), si la
// env var esta puesta, Sentry sube los sourcemaps y configura el tunel.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Org y project se leen de SENTRY_ORG / SENTRY_PROJECT en build.
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Silencia los logs del plugin de Webpack en build (mas limpio).
      silent: !process.env.CI,
      // Tunel para sortear adblockers que bloquean *.sentry.io.
      // Las requests salen como /monitoring desde nuestro propio dominio.
      tunnelRoute: "/monitoring",
      // Ocultar los sourcemaps publicos: se suben a Sentry pero no se
      // sirven con el bundle del navegador (no exponemos codigo).
      sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
      // Si la subida de sourcemaps falla (auth), no rompemos el build.
      errorHandler: () => undefined,
      // Subir sourcemaps requiere SENTRY_AUTH_TOKEN en CI.
      disableLogger: true,
    })
  : nextConfig;

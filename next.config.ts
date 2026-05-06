import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
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

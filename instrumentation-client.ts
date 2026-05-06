/**
 * Instrumentation client de Sentry para Next.js 16.
 *
 * Captura errores no manejados en el navegador y los reporta a Sentry.
 * Si NEXT_PUBLIC_SENTRY_DSN no esta configurado, Sentry no se inicializa
 * y la app sigue funcionando.
 */
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Tracear navegaciones para ver de que pagina venia el error.
    tracesSampleRate: 0.1,
    // Replays solo si hay error (cae barato y ayuda a diagnosticar).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // No enviamos PII por defecto (cabeceras, IP, etc.). Si necesitamos
    // mas contexto en un caso concreto, lo activamos puntualmente.
    sendDefaultPii: false,
    // Solo enviar a Sentry desde produccion.
    enabled: process.env.NODE_ENV === "production",
    environment: process.env.NODE_ENV,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,    // mensajes/datos sensibles no se ven en replays
        blockAllMedia: true,
      }),
    ],
  });
}

// Hook que Next 16 expone para capturar transiciones de ruta.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

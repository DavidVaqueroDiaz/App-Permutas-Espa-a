/**
 * Instrumentation hook de Next.js. Se ejecuta una sola vez al arrancar
 * el server. Lo usamos para inicializar Sentry segun el runtime
 * (nodejs vs edge).
 *
 * Si NEXT_PUBLIC_SENTRY_DSN no esta definido, Sentry no se inicializa
 * y la app sigue funcionando como siempre. Esto permite desarrollar
 * en local sin tener cuenta de Sentry.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Sample rate alto para errores; mas bajo para traces (perf).
      // En alfa no necesitamos perf APM, solo errores.
      tracesSampleRate: 0.1,
      // Solo enviar a Sentry desde produccion. En local los errores
      // los vemos por consola.
      enabled: process.env.NODE_ENV === "production",
      environment: process.env.NODE_ENV,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      enabled: process.env.NODE_ENV === "production",
      environment: process.env.NODE_ENV,
    });
  }
}

// Exporta el hook que Next 16 usa para capturar errores en server actions
// y route handlers automaticamente.
export const onRequestError = Sentry.captureRequestError;

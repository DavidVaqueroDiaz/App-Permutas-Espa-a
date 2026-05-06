"use client";

/**
 * Boundary global de errores para Next.js App Router.
 *
 * Lo usa Next cuando la app explota arriba del todo (un layout raiz
 * que tira o un error no capturado en cliente). Aqui:
 *
 *   1. Reportamos el error a Sentry (si esta configurado).
 *   2. Mostramos una pantalla simple en lugar de la default fea.
 */
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          padding: "48px 24px",
          fontFamily: "'DM Sans', Arial, sans-serif",
          background: "#f8fafb",
          color: "#1f2937",
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "#0f6e56",
            }}
          >
            PermutaES
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#0d4a3a",
              margin: "8px 0 16px 0",
            }}
          >
            Algo ha fallado
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: "#374151" }}>
            Hemos recibido el aviso del error y lo estamos revisando. Puedes
            intentarlo de nuevo en un momento.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#94a3b8",
                fontFamily: "monospace",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#0d4a3a",
                color: "#fff",
                border: 0,
                padding: "10px 18px",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
            <a
              href="/"
              style={{
                background: "#fff",
                border: "1px solid #cbd5e1",
                color: "#1f2937",
                padding: "10px 18px",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Volver al inicio
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

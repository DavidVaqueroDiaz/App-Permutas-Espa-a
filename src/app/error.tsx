"use client";

/**
 * Boundary de error a nivel del layout raiz. Atrapa cualquier error no
 * capturado de los segmentos hijos (incluida la home, auto-permutas,
 * anuncios, etc.). Si el fallo es tan grave que rompe el propio layout
 * raiz, en su lugar se renderiza `global-error.tsx`.
 *
 * Reemplaza la pantalla por defecto de Next.js (en ingles, fondo oscuro)
 * por una con el branding de PermutaES y boton de reintentar.
 */
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalSegmentError({
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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-20">
      <div className="rounded-xl2 border-2 border-red-200 bg-red-50/50 p-6 shadow-card md:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
          Error inesperado
        </p>
        <h1 className="mt-1 font-head text-3xl font-semibold tracking-tight text-red-900 sm:text-4xl">
          Algo ha fallado
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-700">
          Hemos recibido el aviso del error y lo revisaremos cuanto antes.
          Puedes intentarlo de nuevo o volver a la home.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-slate-500">
            Referencia: {error.digest}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver a la home
          </Link>
        </div>
      </div>
    </main>
  );
}

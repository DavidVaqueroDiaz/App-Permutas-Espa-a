"use client";

import { useState, useTransition } from "react";
import { iniciarConversacionDesdeAnuncio } from "@/app/mensajes/actions";

/**
 * Botón "Contactar" en la página pública de detalle de anuncio.
 * Reusa la server action `iniciarConversacionDesdeAnuncio` que ya
 * valida (taxonomía profesional compartida) y crea/recupera la
 * conversación 1-on-1.
 */
export function BotonContactarAnuncio({
  anuncioId,
  alias,
}: {
  anuncioId: string;
  alias: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function abrir() {
    setError(null);
    startTransition(async () => {
      const r = await iniciarConversacionDesdeAnuncio(anuncioId);
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      window.location.href = `/mensajes/${r.conversacion_id}`;
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={abrir}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Abriendo…" : `Contactar con ${alias} →`}
      </button>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">
        Se abrirá una conversación 1-on-1. Tu identidad real solo se
        comparte si tú decides darla en el chat.
      </p>
    </div>
  );
}

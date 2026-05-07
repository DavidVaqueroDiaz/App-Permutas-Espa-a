"use client";

import { useState } from "react";

export type AtajoLegible =
  | { tipo: "ccaa"; label: string }
  | { tipo: "provincia"; label: string }
  | { tipo: "municipio"; label: string };

const VISIBLES_POR_DEFECTO = 6;

/**
 * Muestra los chips de atajos (CCAA / provincia / municipio individual)
 * que el usuario configuro en su anuncio. Si hay mas de N chips,
 * pinta los primeros N y un boton "+M mas" que al pulsarlo expande
 * la lista completa. Util porque algunos anuncios tienen 200+
 * municipios y antes pintaba 7-10 sin contexto de cuantos faltaban.
 */
export function ChipsAtajos({ atajos }: { atajos: AtajoLegible[] }) {
  const [expandido, setExpandido] = useState(false);

  if (atajos.length === 0) return null;

  const total = atajos.length;
  const mostrar = expandido ? atajos : atajos.slice(0, VISIBLES_POR_DEFECTO);
  const ocultos = total - mostrar.length;

  return (
    <ul className="mt-1 flex flex-wrap gap-1">
      {mostrar.map((at, i) => (
        <li
          key={`${at.tipo}-${i}`}
          className={
            at.tipo === "ccaa"
              ? "rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
              : at.tipo === "provincia"
                ? "rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800"
                : "rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700"
          }
        >
          {at.tipo === "ccaa"
            ? `Toda ${at.label}`
            : at.tipo === "provincia"
              ? `Toda ${at.label}`
              : at.label}
        </li>
      ))}

      {ocultos > 0 && !expandido && (
        <li>
          <button
            type="button"
            onClick={() => setExpandido(true)}
            className="rounded-full border border-brand-mint bg-white px-2 py-0.5 text-xs font-medium text-brand-text hover:bg-brand-bg"
          >
            +{ocultos} más
          </button>
        </li>
      )}
      {expandido && total > VISIBLES_POR_DEFECTO && (
        <li>
          <button
            type="button"
            onClick={() => setExpandido(false)}
            className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            ↑ ocultar
          </button>
        </li>
      )}
    </ul>
  );
}

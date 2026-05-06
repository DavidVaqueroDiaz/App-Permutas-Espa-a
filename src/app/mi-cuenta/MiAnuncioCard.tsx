"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  eliminarAnuncio,
  marcarPermutaConseguida,
} from "@/app/anuncios/[id]/editar/actions";

export type AnuncioCardData = {
  id: string;
  estado: string;
  creado_el: string;
  caduca_el: string;
  cuerpo_label: string;
  especialidad_label: string | null;
  municipio_nombre: string;
  total_plazas: number;
};

/**
 * Tarjeta de un anuncio propio del usuario en /mi-cuenta.
 * Soporta eliminar con confirmación y muestra aviso si el anuncio
 * caduca en los próximos 30 días o si hay cadenas detectadas que lo
 * incluyen (`cadenasCount` > 0).
 */
export function MiAnuncioCard({
  anuncio,
  cadenasCount,
}: {
  anuncio: AnuncioCardData;
  cadenasCount: number;
}) {
  const router = useRouter();
  const [borrando, startBorrar] = useTransition();
  const [permutando, startPermutar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ahora = Date.now();
  const caduca = new Date(anuncio.caduca_el).getTime();
  const diasACaducar = Math.floor((caduca - ahora) / 86_400_000);
  const caducaPronto = diasACaducar >= 0 && diasACaducar <= 30;
  const yaCaducado = diasACaducar < 0;

  function pedirBorrar() {
    if (
      !confirm(
        "¿Eliminar este anuncio?\n\n" +
          "Dejará de aparecer en /auto-permutas y en /anuncios. Esta acción no se puede deshacer.",
      )
    )
      return;
    setError(null);
    startBorrar(async () => {
      const r = await eliminarAnuncio(anuncio.id);
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      router.refresh();
    });
  }

  function pedirMarcarPermutado() {
    if (
      !confirm(
        "🎉 ¿Confirmas que has conseguido la permuta?\n\n" +
          "Tu anuncio se marcará como cerrado y dejará de aparecer en " +
          "cadenas y búsquedas.\n\n" +
          "IMPORTANTE: avisa también a la(s) otra(s) persona(s) de la " +
          "cadena para que también lo cierren — si no, seguirán viendo " +
          "cadenas falsas en sus paneles.\n\n" +
          "Esta acción no se puede deshacer.",
      )
    )
      return;
    setError(null);
    startPermutar(async () => {
      const r = await marcarPermutaConseguida(anuncio.id);
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      router.push("/mi-cuenta?permutado=1");
      router.refresh();
    });
  }

  const estaPermutado = anuncio.estado === "permutado";

  return (
    <li
      className={
        "rounded-xl2 border p-4 shadow-card " +
        (estaPermutado
          ? "border-brand-mint/60 bg-brand-bg/40"
          : "border-slate-200 bg-white")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{anuncio.cuerpo_label}</p>
          {anuncio.especialidad_label && (
            <p className="text-sm text-slate-600">{anuncio.especialidad_label}</p>
          )}
          <p className="mt-2 text-sm text-slate-700">
            Estás en <strong>{anuncio.municipio_nombre}</strong> · aceptarías
            irte a{" "}
            <strong>
              {anuncio.total_plazas}{" "}
              {anuncio.total_plazas === 1 ? "municipio" : "municipios"}
            </strong>
          </p>
        </div>
        <span
          className={
            estaPermutado
              ? "rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-white"
              : anuncio.estado === "activo"
                ? "rounded-full bg-brand-bg px-2 py-0.5 text-xs text-brand-text"
                : "rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700"
          }
        >
          {estaPermutado ? "🎉 permuta cerrada" : anuncio.estado}
        </span>
      </div>

      {estaPermutado && (
        <div className="mt-3 rounded-md border border-brand-mint/40 bg-white p-2.5 text-xs text-brand-text">
          ¡Enhorabuena! Este anuncio está marcado como cerrado y ya no aparece
          en cadenas ni búsquedas. Recuerda: la otra persona de la cadena
          también debe cerrar el suyo.
        </div>
      )}

      {/* Aviso destacado: hay cadenas para este anuncio */}
      {anuncio.estado === "activo" && cadenasCount > 0 && (
        <a
          href="/auto-permutas"
          className="mt-3 block rounded-md border border-brand bg-brand-bg p-2 text-xs text-brand-text hover:bg-brand-bg/70"
        >
          🎉 <strong>{cadenasCount}</strong>{" "}
          {cadenasCount === 1 ? "cadena posible incluye" : "cadenas posibles incluyen"}{" "}
          este anuncio. Pulsa para verlas →
        </a>
      )}

      {/* Aviso de caducidad */}
      {anuncio.estado === "activo" && (caducaPronto || yaCaducado) && (
        <div className="mt-3 rounded-md border border-warn-text/30 bg-warn-bg p-2 text-xs text-warn-text">
          {yaCaducado ? (
            <>
              ⏰ Tu anuncio <strong>caducó hace {Math.abs(diasACaducar)} días</strong>.
              Edítalo para renovarlo.
            </>
          ) : (
            <>
              ⏰ Tu anuncio caduca en <strong>{diasACaducar} días</strong>.
              Edítalo y guarda para renovarlo otros 6 meses.
            </>
          )}
        </div>
      )}

      {/* CTA destacado: marcar permuta conseguida (solo si activo) */}
      {anuncio.estado === "activo" && (
        <button
          type="button"
          onClick={pedirMarcarPermutado}
          disabled={permutando}
          className="mt-3 w-full rounded-md border border-brand bg-brand-bg px-3 py-2 text-sm font-medium text-brand-text transition hover:bg-brand-bg/70 disabled:opacity-50"
        >
          {permutando ? "Cerrando…" : "🎉 He conseguido la permuta"}
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Publicado el {new Date(anuncio.creado_el).toLocaleDateString("es-ES")}
          {!estaPermutado &&
            ` · Caduca el ${new Date(anuncio.caduca_el).toLocaleDateString("es-ES")}`}
        </p>
        {!estaPermutado && (
          <div className="flex items-center gap-2">
            <a
              href={`/anuncios/${anuncio.id}/editar`}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Editar
            </a>
            <button
              type="button"
              onClick={pedirBorrar}
              disabled={borrando}
              className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {borrando ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </li>
  );
}

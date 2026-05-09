"use client";

import { useState, useTransition } from "react";
import {
  reportarAnuncio,
  type MotivoReporte,
} from "./reportar-actions";

const MOTIVOS: { valor: MotivoReporte; etiqueta: string; descripcion: string }[] = [
  {
    valor: "spam",
    etiqueta: "Spam o publicidad",
    descripcion: "El anuncio promociona algo ajeno a una permuta real.",
  },
  {
    valor: "datos_falsos",
    etiqueta: "Datos falsos",
    descripcion:
      "Sospecho que la persona no tiene plaza en el municipio que dice, o ha mentido en años de servicio, etc.",
  },
  {
    valor: "suplantacion",
    etiqueta: "Suplantación de identidad",
    descripcion: "Creo que se hace pasar por otra persona.",
  },
  {
    valor: "lenguaje_inapropiado",
    etiqueta: "Lenguaje inapropiado",
    descripcion: "Ofensas, insultos o contenido fuera de lugar en observaciones.",
  },
  {
    valor: "duplicado",
    etiqueta: "Anuncio duplicado",
    descripcion: "La misma persona ha publicado el mismo anuncio varias veces.",
  },
  {
    valor: "otro",
    etiqueta: "Otro motivo",
    descripcion: "Cuéntanoslo en el comentario.",
  },
];

/**
 * Boton "Reportar" + dialogo en linea con motivos predefinidos. Se muestra
 * en la pagina publica del anuncio. Solo visible para usuarios autenticados
 * que no son el propio dueno.
 */
export function BotonReportar({ anuncioId }: { anuncioId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoReporte>("spam");
  const [comentario, setComentario] = useState("");
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "err"; texto: string } | null>(
    null,
  );

  function enviar() {
    setMensaje(null);
    startTransition(async () => {
      const r = await reportarAnuncio({
        anuncioId,
        motivo,
        comentario,
      });
      if (r.ok) {
        setMensaje({
          tipo: "ok",
          texto:
            "Gracias. Lo revisaremos cuanto antes. Si confirmamos el reporte, eliminaremos el anuncio.",
        });
        setComentario("");
      } else {
        setMensaje({ tipo: "err", texto: r.mensaje });
      }
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs font-medium text-slate-500 hover:text-red-700"
      >
        Reportar este anuncio
      </button>
    );
  }

  return (
    <div className="rounded-xl2 border border-red-200 bg-red-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-red-900">Reportar anuncio</h3>
          <p className="mt-0.5 text-xs text-red-800/80">
            Si crees que este anuncio incumple las normas, dinos por qué.
            Lo revisará un administrador.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setMensaje(null);
          }}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </button>
      </div>

      <fieldset className="mt-3 space-y-2">
        {MOTIVOS.map((m) => (
          <label
            key={m.valor}
            className={
              "flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm transition " +
              (motivo === m.valor
                ? "border-red-300 bg-white"
                : "border-transparent hover:bg-white")
            }
          >
            <input
              type="radio"
              name="motivo"
              value={m.valor}
              checked={motivo === m.valor}
              onChange={() => setMotivo(m.valor)}
              className="mt-0.5"
            />
            <span>
              <strong className="text-red-900">{m.etiqueta}</strong>
              <span className="block text-xs text-slate-600">{m.descripcion}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="mt-3 block">
        <span className="text-xs font-medium text-slate-700">
          Comentario (opcional, máx. 500)
        </span>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Detalla por qué crees que este anuncio incumple las normas."
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-1 focus:ring-red-300"
        />
      </label>

      {mensaje && (
        <p
          className={
            "mt-3 rounded-md p-2 text-xs " +
            (mensaje.tipo === "ok"
              ? "bg-brand-bg text-brand-text"
              : "bg-red-100 text-red-800")
          }
        >
          {mensaje.texto}
        </p>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setAbierto(false);
            setMensaje(null);
          }}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={enviar}
          disabled={pendiente || mensaje?.tipo === "ok"}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pendiente ? "Enviando…" : "Enviar reporte"}
        </button>
      </div>
    </div>
  );
}

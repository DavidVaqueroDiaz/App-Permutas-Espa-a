"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolverReporteAdmin } from "./actions";

export type ReporteAdminRow = {
  reporte_id: string;
  motivo: string;
  comentario: string | null;
  creado_el: string;
  reportador_alias: string;
  anuncio_id: string;
  anuncio_estado: string;
  anuncio_observaciones: string | null;
  anuncio_alias: string;
  anuncio_municipio: string | null;
  anuncio_cuerpo: string | null;
};

const MOTIVO_LABEL: Record<string, string> = {
  spam: "Spam o publicidad",
  datos_falsos: "Datos falsos",
  suplantacion: "Suplantación",
  lenguaje_inapropiado: "Lenguaje inapropiado",
  duplicado: "Duplicado",
  otro: "Otro",
};

export function TablaReportes({ reportes }: { reportes: ReporteAdminRow[] }) {
  if (reportes.length === 0) {
    return (
      <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
        No hay reportes pendientes.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {reportes.map((r) => (
        <ReporteCard key={r.reporte_id} reporte={r} />
      ))}
    </ul>
  );
}

function ReporteCard({ reporte }: { reporte: ReporteAdminRow }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function resolver(accion: "eliminar" | "ignorar") {
    const confirmacion =
      accion === "eliminar"
        ? "¿Eliminar el anuncio reportado? Se cerrarán también todos los demás reportes pendientes contra él."
        : "¿Ignorar este reporte? El anuncio sigue activo.";
    if (!confirm(confirmacion)) return;
    setError(null);
    startTransition(async () => {
      const r = await resolverReporteAdmin(reporte.reporte_id, accion);
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-xl2 border border-red-200 bg-red-50/30 p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-red-700">
            {MOTIVO_LABEL[reporte.motivo] ?? reporte.motivo}
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">
            <a
              href={`/anuncios/${reporte.anuncio_id}`}
              target="_blank"
              rel="noopener"
              className="hover:underline"
            >
              {reporte.anuncio_cuerpo ?? "Anuncio sin cuerpo"} ·{" "}
              {reporte.anuncio_municipio ?? "—"}
            </a>
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Anuncio de <strong>{reporte.anuncio_alias}</strong> ·
            estado actual: <strong>{reporte.anuncio_estado}</strong>
          </p>
        </div>
        <p className="text-xs text-slate-500">
          Reportado por <strong>{reporte.reportador_alias}</strong>
          <br />
          el {new Date(reporte.creado_el).toLocaleString("es-ES")}
        </p>
      </div>

      {reporte.comentario && (
        <blockquote className="mt-3 border-l-3 border-red-300 bg-white/70 p-2 text-sm italic text-slate-700">
          “{reporte.comentario}”
        </blockquote>
      )}

      {reporte.anuncio_observaciones && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
            Ver observaciones del anuncio
          </summary>
          <p className="mt-1 whitespace-pre-line rounded-md bg-white p-2 text-slate-700">
            {reporte.anuncio_observaciones}
          </p>
        </details>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-100 p-2 text-xs text-red-800">{error}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => resolver("eliminar")}
          disabled={pendiente}
          className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pendiente ? "Procesando…" : "Eliminar anuncio"}
        </button>
        <button
          type="button"
          onClick={() => resolver("ignorar")}
          disabled={pendiente}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Ignorar reporte
        </button>
        <a
          href={`/anuncios/${reporte.anuncio_id}`}
          target="_blank"
          rel="noopener"
          className="text-xs font-medium text-brand-text hover:underline"
        >
          Ver anuncio →
        </a>
      </div>
    </li>
  );
}

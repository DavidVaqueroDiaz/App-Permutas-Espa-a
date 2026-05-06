"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { eliminarAnuncioAdmin } from "./actions";

export type AnuncioAdminRow = {
  id: string;
  sector_codigo: string;
  ccaa_codigo: string;
  estado: string;
  creado_el: string;
  cuerpo_label: string;
  especialidad_label: string | null;
  municipio_label: string;
  alias: string;
  /** True si es una cuenta sintética importada de PermutaDoc. */
  es_test: boolean;
};

type Props = {
  anuncios: AnuncioAdminRow[];
  sectores: { codigo: string; nombre: string }[];
  qInicial: string;
  sectorInicial: string;
};

export function TablaAnuncios({ anuncios, sectores, qInicial, sectorInicial }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(qInicial);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(qInicial);
  }, [qInicial]);

  function navegarA(parche: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(parche)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/admin?${qs}` : "/admin");
    });
  }

  function onCambioTexto(v: string) {
    setQ(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navegarA({ q: v.trim() });
    }, 350);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl2 border border-slate-200 bg-white p-3 shadow-card">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="adm-q" className="block text-xs font-medium text-slate-700">
            Buscar (alias o observaciones)
          </label>
          <input
            id="adm-q"
            type="search"
            value={q}
            onChange={(e) => onCambioTexto(e.target.value)}
            placeholder="Ej: vaquero, vigo, ..."
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="adm-sector" className="block text-xs font-medium text-slate-700">
            Sector
          </label>
          <select
            id="adm-sector"
            value={sectorInicial}
            onChange={(e) => navegarA({ sector: e.target.value })}
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Todos</option>
            {sectores.map((s) => (
              <option key={s.codigo} value={s.codigo}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
        {(qInicial || sectorInicial) && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              navegarA({ q: "", sector: "" });
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Limpiar
          </button>
        )}
      </div>

      {anuncios.length === 0 ? (
        <p className="rounded-xl2 border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-card">
          No hay anuncios con esos filtros.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-slate-200 bg-white shadow-card">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-left text-[10.5px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Alias</th>
                <th className="px-3 py-2">Cuerpo · Especialidad</th>
                <th className="px-3 py-2">Plaza actual</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Publicado</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {anuncios.map((a) => (
                <FilaAnuncio key={a.id} anuncio={a} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilaAnuncio({ anuncio }: { anuncio: AnuncioAdminRow }) {
  const [borrando, startBorrar] = useTransition();
  const [borrado, setBorrado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pedirBorrar() {
    if (
      !confirm(
        `¿Borrar el anuncio de "${anuncio.alias}" (${anuncio.cuerpo_label})?\n\n` +
          "Esta acción es irreversible. También se borrarán las plazas deseadas y atajos asociados.",
      )
    )
      return;
    setError(null);
    startBorrar(async () => {
      const r = await eliminarAnuncioAdmin(anuncio.id);
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      setBorrado(true);
    });
  }

  if (borrado) {
    return (
      <tr className="bg-brand-bg/40 text-slate-500 line-through">
        <td className="px-3 py-2" colSpan={6}>
          Anuncio de {anuncio.alias} borrado.
        </td>
      </tr>
    );
  }

  return (
    <tr className={anuncio.es_test ? "bg-amber-50/30" : ""}>
      <td className="px-3 py-2 align-top">
        <div className="font-medium text-slate-900">{anuncio.alias}</div>
        {anuncio.es_test && (
          <div className="mt-0.5 inline-flex items-center rounded-full bg-warn-bg px-1.5 py-0.5 text-[10px] text-warn-text">
            test
          </div>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        <div>{anuncio.cuerpo_label}</div>
        {anuncio.especialidad_label && (
          <div className="text-slate-500">{anuncio.especialidad_label}</div>
        )}
      </td>
      <td className="px-3 py-2 align-top">{anuncio.municipio_label}</td>
      <td className="px-3 py-2 align-top">
        <span
          className={
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] " +
            (anuncio.estado === "activo"
              ? "bg-brand-bg text-brand-text"
              : "bg-slate-100 text-slate-600")
          }
        >
          {anuncio.estado}
        </span>
      </td>
      <td className="px-3 py-2 align-top text-slate-500">
        {new Date(anuncio.creado_el).toLocaleDateString("es-ES")}
      </td>
      <td className="px-3 py-2 align-top text-right">
        <a
          href={`/anuncios/${anuncio.id}/editar`}
          className="mr-2 inline-flex items-center text-[11px] text-brand-text hover:text-brand"
        >
          Editar →
        </a>
        <button
          type="button"
          onClick={pedirBorrar}
          disabled={borrando}
          className="inline-flex items-center rounded-md border border-red-300 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {borrando ? "Borrando…" : "Borrar"}
        </button>
        {error && (
          <p className="mt-1 text-[10.5px] text-red-700">{error}</p>
        )}
      </td>
    </tr>
  );
}

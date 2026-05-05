"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

type Opcion = { value: string; label: string };
type CuerpoOpcion = Opcion & { sector: string };
type EspecialidadOpcion = Opcion & { cuerpo: string };

type Props = {
  sectores: Opcion[];
  ccaas: Opcion[];
  cuerpos: CuerpoOpcion[];
  especialidades: EspecialidadOpcion[];
};

export function Filtros({ sectores, ccaas, cuerpos, especialidades }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const sectorActual = params.get("sector") ?? "";
  const ccaaActual = params.get("ccaa") ?? "";
  const cuerpoActual = params.get("cuerpo") ?? "";
  const especialidadActual = params.get("especialidad") ?? "";
  const qActual = params.get("q") ?? "";

  // Filtrado en cascada en el cliente para que el desplegable solo
  // muestre opciones coherentes con la jerarquía (sector → cuerpo →
  // especialidad).
  const cuerposVisibles = useMemo(() => {
    if (!sectorActual) return cuerpos;
    return cuerpos.filter((c) => c.sector === sectorActual);
  }, [cuerpos, sectorActual]);

  const especialidadesVisibles = useMemo(() => {
    if (!cuerpoActual) return [];
    return especialidades.filter((e) => e.cuerpo === cuerpoActual);
  }, [especialidades, cuerpoActual]);

  // Texto local con debounce para no recargar a cada tecla.
  const [qLocal, setQLocal] = useState(qActual);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQLocal(qActual);
  }, [qActual]);

  function navegarA(parche: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(parche)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/anuncios?${qs}` : "/anuncios");
    });
  }

  function onCambioTexto(v: string) {
    setQLocal(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navegarA({ q: v.trim() });
    }, 350);
  }

  /**
   * Al cambiar de sector se reinician cuerpo y especialidad para que
   * no queden opciones inconsistentes (p.ej. "Maestros" filtrando un
   * sector AGE).
   */
  function onCambioSector(v: string) {
    navegarA({ sector: v, cuerpo: "", especialidad: "" });
  }

  function onCambioCuerpo(v: string) {
    navegarA({ cuerpo: v, especialidad: "" });
  }

  const hayFiltros =
    sectorActual || ccaaActual || cuerpoActual || especialidadActual || qActual;

  return (
    <div className="space-y-3 rounded-xl2 border border-slate-200 bg-white shadow-card p-4">
      <div>
        <label htmlFor="filtro-q" className="block text-xs font-medium text-slate-700">
          Buscar por ubicación, cuerpo o especialidad
        </label>
        <input
          id="filtro-q"
          type="search"
          value={qLocal}
          onChange={(e) => onCambioTexto(e.target.value)}
          placeholder="Ej: Vigo, Maestros, Inglés..."
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label htmlFor="filtro-sector" className="block text-xs font-medium text-slate-700">
            Sector
          </label>
          <select
            id="filtro-sector"
            value={sectorActual}
            onChange={(e) => onCambioSector(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Todos los sectores</option>
            {sectores.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label htmlFor="filtro-ccaa" className="block text-xs font-medium text-slate-700">
            Comunidad Autónoma
          </label>
          <select
            id="filtro-ccaa"
            value={ccaaActual}
            onChange={(e) => navegarA({ ccaa: e.target.value })}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">Todas las CCAA</option>
            {ccaas.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cuerpo + Especialidad: en cascada. Solo se muestran cuando
          tiene sentido (con sector elegido para cuerpo, con cuerpo
          elegido para especialidad). */}
      {sectorActual && cuerposVisibles.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="filtro-cuerpo" className="block text-xs font-medium text-slate-700">
              Cuerpo
            </label>
            <select
              id="filtro-cuerpo"
              value={cuerpoActual}
              onChange={(e) => onCambioCuerpo(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">Todos los cuerpos del sector</option>
              {cuerposVisibles.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {cuerpoActual && especialidadesVisibles.length > 0 && (
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="filtro-especialidad" className="block text-xs font-medium text-slate-700">
                Especialidad
              </label>
              <select
                id="filtro-especialidad"
                value={especialidadActual}
                onChange={(e) => navegarA({ especialidad: e.target.value })}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
              >
                <option value="">Todas las especialidades del cuerpo</option>
                {especialidadesVisibles.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {hayFiltros && (
        <div>
          <button
            type="button"
            onClick={() => {
              setQLocal("");
              navegarA({
                sector: "",
                ccaa: "",
                cuerpo: "",
                especialidad: "",
                q: "",
              });
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Quitar todos los filtros
          </button>
        </div>
      )}
    </div>
  );
}

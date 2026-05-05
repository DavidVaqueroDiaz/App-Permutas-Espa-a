"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  buscarMunicipiosEnCcaa,
  sugerenciasBusqueda,
  type Sugerencias,
  type SugerenciaMunicipio,
} from "./actions";

type Opcion = { value: string; label: string };
type CuerpoOpcion = Opcion & { sector: string };
type EspecialidadOpcion = Opcion & { cuerpo: string };

type Props = {
  sectores: Opcion[];
  ccaas: Opcion[];
  cuerpos: CuerpoOpcion[];
  especialidades: EspecialidadOpcion[];
  municipioFiltroNombre: string | null;
};

const SUG_VACIAS: Sugerencias = { municipios: [], cuerpos: [], especialidades: [] };

export function Filtros({
  sectores,
  ccaas,
  cuerpos,
  especialidades,
  municipioFiltroNombre,
}: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const sectorActual = params.get("sector") ?? "";
  const ccaaActual = params.get("ccaa") ?? "";
  const cuerpoActual = params.get("cuerpo") ?? "";
  const especialidadActual = params.get("especialidad") ?? "";
  const municipioActual = params.get("municipio") ?? "";
  const qActual = params.get("q") ?? "";

  // Cascada de visibilidad para los selectores dependientes.
  const cuerposVisibles = useMemo(() => {
    if (!sectorActual) return cuerpos;
    return cuerpos.filter((c) => c.sector === sectorActual);
  }, [cuerpos, sectorActual]);
  const especialidadesVisibles = useMemo(() => {
    if (!cuerpoActual) return [];
    return especialidades.filter((e) => e.cuerpo === cuerpoActual);
  }, [especialidades, cuerpoActual]);

  // ─── Buscador inteligente: query local + sugerencias en dropdown ───
  const [qLocal, setQLocal] = useState(qActual);
  const [sugerencias, setSugerencias] = useState<Sugerencias>(SUG_VACIAS);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchVersion = useRef(0); // evita race conditions de fetch

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
    setMostrarSugerencias(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const version = ++fetchVersion.current;
      const resp = v.trim().length >= 2
        ? await sugerenciasBusqueda(v)
        : SUG_VACIAS;
      // Si ha llegado otra petición posterior, ignoramos esta.
      if (version === fetchVersion.current) {
        setSugerencias(resp);
      }
      // El filtro libre de texto se aplica también, pero solo cuando
      // hay 2+ caracteres o se vacía. No interrumpe la lectura del
      // dropdown.
      navegarA({ q: v.trim() });
    }, 300);
  }

  function aplicarSugerenciaMunicipio(m: SugerenciaMunicipio) {
    setQLocal("");
    setMostrarSugerencias(false);
    setSugerencias(SUG_VACIAS);
    // Si el municipio está en una CCAA distinta a la filtrada,
    // ajustamos también el filtro de CCAA. Limpiar q.
    navegarA({ q: "", ccaa: m.ccaa_codigo, municipio: m.codigo_ine });
  }

  function aplicarSugerenciaCuerpo(c: { id: string; sector_codigo: string }) {
    setQLocal("");
    setMostrarSugerencias(false);
    setSugerencias(SUG_VACIAS);
    navegarA({ q: "", sector: c.sector_codigo, cuerpo: c.id, especialidad: "" });
  }

  function aplicarSugerenciaEspecialidad(e: { id: string; cuerpo_id: string }) {
    setQLocal("");
    setMostrarSugerencias(false);
    setSugerencias(SUG_VACIAS);
    // Localizamos el cuerpo y sector correspondiente para encadenar
    // los filtros completos.
    const cuerpo = cuerpos.find((c) => c.value === e.cuerpo_id);
    const sector = cuerpo?.sector ?? "";
    navegarA({
      q: "",
      sector,
      cuerpo: e.cuerpo_id,
      especialidad: e.id,
    });
  }

  // ─── Cambio de selectores ─────────────────────────────────────────
  function onCambioSector(v: string) {
    navegarA({ sector: v, cuerpo: "", especialidad: "" });
  }
  function onCambioCuerpo(v: string) {
    navegarA({ cuerpo: v, especialidad: "" });
  }
  function onCambioCcaa(v: string) {
    // Si cambia la CCAA, el municipio elegido (que está dentro de la
    // anterior) ya no es válido — lo limpiamos.
    navegarA({ ccaa: v, municipio: "" });
  }

  // ─── Buscador de municipios dentro de la CCAA ─────────────────────
  // Solo visible cuando el usuario ya ha elegido CCAA. Permite afinar
  // a un municipio concreto sin tener que escribir en el buscador
  // global de arriba.
  const [muniQuery, setMuniQuery] = useState("");
  const [muniSugs, setMuniSugs] = useState<SugerenciaMunicipio[]>([]);
  const [mostrarMuniSugs, setMostrarMuniSugs] = useState(false);
  const muniDebRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const muniVersion = useRef(0);

  function onCambioMuniQuery(v: string) {
    setMuniQuery(v);
    setMostrarMuniSugs(true);
    if (muniDebRef.current) clearTimeout(muniDebRef.current);
    muniDebRef.current = setTimeout(async () => {
      const version = ++muniVersion.current;
      const resp = v.trim().length >= 1 && ccaaActual
        ? await buscarMunicipiosEnCcaa(v, ccaaActual)
        : [];
      if (version === muniVersion.current) {
        setMuniSugs(resp);
      }
    }, 250);
  }

  function aplicarMunicipio(m: SugerenciaMunicipio) {
    setMuniQuery("");
    setMostrarMuniSugs(false);
    setMuniSugs([]);
    navegarA({ municipio: m.codigo_ine });
  }

  const hayFiltros =
    sectorActual ||
    ccaaActual ||
    cuerpoActual ||
    especialidadActual ||
    municipioActual ||
    qActual;

  const haySugerencias =
    sugerencias.municipios.length > 0 ||
    sugerencias.cuerpos.length > 0 ||
    sugerencias.especialidades.length > 0;

  return (
    <div className="space-y-3 rounded-xl2 border border-slate-200 bg-white shadow-card p-4">
      {/* Buscador inteligente con dropdown de sugerencias */}
      <div className="relative">
        <label htmlFor="filtro-q" className="block text-xs font-medium text-slate-700">
          Buscar por ubicación, cuerpo o especialidad
        </label>
        <input
          id="filtro-q"
          type="search"
          autoComplete="off"
          value={qLocal}
          onChange={(e) => onCambioTexto(e.target.value)}
          onFocus={() => qLocal.trim().length >= 2 && setMostrarSugerencias(true)}
          onBlur={() => setTimeout(() => setMostrarSugerencias(false), 150)}
          placeholder="Ej: Vigo, Maestros, Inglés..."
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-light focus:outline-none focus:ring-2 focus:ring-brand-light/20"
        />
        {mostrarSugerencias && haySugerencias && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-96 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {sugerencias.municipios.length > 0 && (
              <div className="border-b border-slate-100">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Municipios
                </p>
                {sugerencias.municipios.map((m) => (
                  <button
                    key={m.codigo_ine}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => aplicarSugerenciaMunicipio(m)}
                    className="flex w-full justify-between px-3 py-1.5 text-left text-xs hover:bg-brand-bg"
                  >
                    <span>📍 {m.nombre}</span>
                    <span className="text-slate-500">{m.provincia_nombre}</span>
                  </button>
                ))}
              </div>
            )}
            {sugerencias.cuerpos.length > 0 && (
              <div className="border-b border-slate-100">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Cuerpos
                </p>
                {sugerencias.cuerpos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => aplicarSugerenciaCuerpo(c)}
                    className="flex w-full px-3 py-1.5 text-left text-xs hover:bg-brand-bg"
                  >
                    <span>👥 {c.codigo_oficial ? `${c.codigo_oficial} — ` : ""}{c.denominacion}</span>
                  </button>
                ))}
              </div>
            )}
            {sugerencias.especialidades.length > 0 && (
              <div>
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Especialidades
                </p>
                {sugerencias.especialidades.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => aplicarSugerenciaEspecialidad(e)}
                    className="flex w-full px-3 py-1.5 text-left text-xs hover:bg-brand-bg"
                  >
                    <span>🎯 {e.codigo_oficial ? `${e.codigo_oficial} — ` : ""}{e.denominacion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="mt-1 text-[10.5px] text-slate-500">
          Pulsa una sugerencia para aplicar el filtro automáticamente.
        </p>
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
            onChange={(e) => onCambioCcaa(e.target.value)}
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

      {/* Filtro municipio: solo aparece cuando hay CCAA seleccionada */}
      {ccaaActual && (
        <div className="relative">
          <label htmlFor="filtro-muni" className="block text-xs font-medium text-slate-700">
            Municipio (dentro de la CCAA elegida)
          </label>
          {municipioActual && municipioFiltroNombre ? (
            <div className="mt-1 flex items-center justify-between rounded-md border border-brand-mint bg-brand-bg px-3 py-1.5">
              <span className="text-xs font-medium text-brand-text">
                📍 {municipioFiltroNombre}
              </span>
              <button
                type="button"
                onClick={() => navegarA({ municipio: "" })}
                className="text-xs text-brand hover:text-brand-dark"
                aria-label="Quitar filtro de municipio"
              >
                Quitar ×
              </button>
            </div>
          ) : (
            <>
              <input
                id="filtro-muni"
                type="search"
                autoComplete="off"
                value={muniQuery}
                onChange={(e) => onCambioMuniQuery(e.target.value)}
                onFocus={() => muniQuery.length >= 1 && setMostrarMuniSugs(true)}
                onBlur={() => setTimeout(() => setMostrarMuniSugs(false), 150)}
                placeholder="Empieza a escribir un municipio..."
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-light focus:outline-none focus:ring-2 focus:ring-brand-light/20"
              />
              {mostrarMuniSugs && muniSugs.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {muniSugs.map((m) => (
                    <button
                      key={m.codigo_ine}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => aplicarMunicipio(m)}
                      className="flex w-full justify-between px-3 py-1.5 text-left text-xs hover:bg-brand-bg"
                    >
                      <span>{m.nombre}</span>
                      <span className="text-slate-500">{m.provincia_nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

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
              setMuniQuery("");
              navegarA({
                sector: "",
                ccaa: "",
                cuerpo: "",
                especialidad: "",
                municipio: "",
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

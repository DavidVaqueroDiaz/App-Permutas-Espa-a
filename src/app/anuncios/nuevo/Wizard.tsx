"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  type AtajoState,
  type CcaaRow,
  type CuerpoRow,
  type EspecialidadRow,
  type ProvinciaRow,
  type SectorRow,
  type WizardState,
  INITIAL_STATE,
  TOTAL_PASOS,
} from "./types";
import {
  buscarMunicipios,
  crearAnuncioYRedirigir,
  expandirAtajos,
  type MunicipioBusqueda,
} from "./actions";

/** Sectores REALMENTE activos en Fase 1. */
const SECTORES_ACTIVOS = new Set<string>(["docente_loe"]);
const STORAGE_KEY = "permutaes:wizard:nuevo-anuncio";
const ANO_ACTUAL = new Date().getFullYear();

type Props = {
  sectores: SectorRow[];
  cuerpos: CuerpoRow[];
  especialidades: EspecialidadRow[];
  ccaa: CcaaRow[];
  provincias: ProvinciaRow[];
};

export function Wizard({ sectores, cuerpos, especialidades, ccaa, provincias }: Props) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [hidratado, setHidratado] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);
  const [publicando, startPublicar] = useTransition();

  // Cargar de localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...INITIAL_STATE, ...JSON.parse(raw) });
    } catch {/* ignore */}
    setHidratado(true);
  }, []);

  // Guardar en localStorage
  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {/* ignore */}
  }, [state, hidratado]);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }
  function ir(paso: number) {
    setState((prev) => ({ ...prev, paso: Math.max(1, Math.min(TOTAL_PASOS, paso)) }));
  }
  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {/* ignore */}
    setState(INITIAL_STATE);
  }

  const cuerposDelSector = useMemo(
    () => state.sector_codigo
      ? cuerpos.filter((c) => c.sector_codigo === state.sector_codigo)
      : [],
    [cuerpos, state.sector_codigo],
  );
  const especialidadesDelCuerpo = useMemo(
    () => state.cuerpo_id ? especialidades.filter((e) => e.cuerpo_id === state.cuerpo_id) : [],
    [especialidades, state.cuerpo_id],
  );
  const cuerpoSinEspecialidades =
    state.cuerpo_id !== null && especialidadesDelCuerpo.length === 0;

  const cuerpoElegido = useMemo(
    () => cuerpos.find((c) => c.id === state.cuerpo_id) ?? null,
    [cuerpos, state.cuerpo_id],
  );
  const especialidadElegida = useMemo(
    () => especialidades.find((e) => e.id === state.especialidad_id) ?? null,
    [especialidades, state.especialidad_id],
  );

  if (!hidratado) {
    return <div className="text-sm text-slate-500">Cargando wizard…</div>;
  }

  return (
    <div className="space-y-6">
      <ProgressBar paso={state.paso} />

      {state.paso === 1 && (
        <Paso1Sector
          sectores={sectores}
          valor={state.sector_codigo}
          onChange={(v) => {
            update("sector_codigo", v);
            update("cuerpo_id", null);
            update("especialidad_id", null);
          }}
          onSiguiente={() => ir(2)}
        />
      )}
      {state.paso === 2 && (
        <Paso2Cuerpo
          cuerpos={cuerposDelSector}
          valor={state.cuerpo_id}
          onChange={(v) => { update("cuerpo_id", v); update("especialidad_id", null); }}
          onAtras={() => ir(1)}
          onSiguiente={() => ir(cuerpoSinEspecialidades ? 4 : 3)}
        />
      )}
      {state.paso === 3 && (
        <Paso3Especialidad
          especialidades={especialidadesDelCuerpo}
          valor={state.especialidad_id}
          onChange={(v) => update("especialidad_id", v)}
          onAtras={() => ir(2)}
          onSiguiente={() => ir(4)}
        />
      )}
      {state.paso === 4 && (
        <Paso4PlazaActual
          codigo={state.municipio_actual_codigo}
          nombre={state.municipio_actual_nombre}
          onChange={(codigo, nombre) => {
            update("municipio_actual_codigo", codigo);
            update("municipio_actual_nombre", nombre);
          }}
          onAtras={() => ir(cuerpoSinEspecialidades ? 2 : 3)}
          onSiguiente={() => ir(5)}
        />
      )}
      {state.paso === 5 && (
        <Paso5PlazasDeseadas
          ccaa={ccaa}
          provincias={provincias}
          municipioActual={state.municipio_actual_codigo}
          plazas={state.plazas_deseadas}
          atajos={state.atajos}
          plazasNombres={state.plazas_individuales_nombres}
          onChange={(plazas, atajos, nombres) => {
            update("plazas_deseadas", plazas);
            update("atajos", atajos);
            update("plazas_individuales_nombres", nombres);
          }}
          onAtras={() => ir(4)}
          onSiguiente={() => ir(6)}
        />
      )}
      {state.paso === 6 && (
        <Paso6DatosLegales
          fecha={state.fecha_toma_posesion_definitiva}
          anyos={state.anyos_servicio_totales}
          haPermutado={state.ha_permutado_antes}
          fechaPermuta={state.permuta_anterior_fecha}
          onChange={(parche) => setState((prev) => ({ ...prev, ...parche }))}
          onAtras={() => ir(5)}
          onSiguiente={() => ir(7)}
        />
      )}
      {state.paso === 7 && (
        <Paso7Observaciones
          valor={state.observaciones}
          onChange={(v) => update("observaciones", v)}
          onAtras={() => ir(6)}
          onSiguiente={() => ir(8)}
        />
      )}
      {state.paso === 8 && (
        <Paso8Confirmacion
          state={state}
          cuerpoElegido={cuerpoElegido}
          especialidadElegida={especialidadElegida}
          ccaa={ccaa}
          provincias={provincias}
          publicando={publicando}
          error={errorPublicar}
          onAtras={() => ir(7)}
          onPublicar={() => {
            setErrorPublicar(null);
            startPublicar(async () => {
              const r = await crearAnuncioYRedirigir({
                cuerpo_id: state.cuerpo_id!,
                especialidad_id: state.especialidad_id,
                municipio_actual_codigo: state.municipio_actual_codigo!,
                fecha_toma_posesion_definitiva: state.fecha_toma_posesion_definitiva!,
                anyos_servicio_totales: state.anyos_servicio_totales!,
                permuta_anterior_fecha: state.ha_permutado_antes
                  ? state.permuta_anterior_fecha
                  : null,
                observaciones: state.observaciones,
                plazas_deseadas: state.plazas_deseadas,
                atajos: state.atajos,
              });
              // Si redirige, no llegamos aquí. Si vuelve con error, mostramos.
              if (r && !r.ok) {
                setErrorPublicar(r.mensaje);
              } else {
                reset();
              }
            });
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Paso 1 — Sector
// ----------------------------------------------------------------------
function Paso1Sector({
  sectores, valor, onChange, onSiguiente,
}: {
  sectores: SectorRow[]; valor: string | null;
  onChange: (v: string) => void; onSiguiente: () => void;
}) {
  return (
    <PasoLayout titulo="¿En qué sector trabajas como funcionario?">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Solo el sector "Profesorado no universitario" está activo en esta versión inicial. El resto se irá activando progresivamente.
      </p>
      <ul className="space-y-2">
        {sectores.map((s) => {
          const activo = SECTORES_ACTIVOS.has(s.codigo);
          const seleccionado = valor === s.codigo;
          return (
            <li key={s.codigo}>
              <button
                type="button"
                disabled={!activo}
                onClick={() => activo && onChange(s.codigo)}
                className={[
                  "w-full rounded-lg border px-4 py-3 text-left transition",
                  seleccionado
                    ? "border-slate-900 bg-slate-50 dark:border-slate-100 dark:bg-slate-800"
                    : "border-slate-200 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600",
                  !activo && "opacity-50 cursor-not-allowed",
                ].filter(Boolean).join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-900 dark:text-slate-100">{s.nombre}</span>
                  {!activo && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      Próximamente
                    </span>
                  )}
                </div>
                {s.descripcion && (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{s.descripcion}</p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <NavBotones atras={null} siguienteHabilitado={!!valor} onSiguiente={onSiguiente} />
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Paso 2 — Cuerpo
// ----------------------------------------------------------------------
function Paso2Cuerpo({
  cuerpos, valor, onChange, onAtras, onSiguiente,
}: {
  cuerpos: CuerpoRow[]; valor: string | null;
  onChange: (v: string) => void; onAtras: () => void; onSiguiente: () => void;
}) {
  const ordenados = useMemo(
    () => [...cuerpos].sort((a, b) => (a.codigo_oficial ?? "").localeCompare(b.codigo_oficial ?? "")),
    [cuerpos],
  );
  return (
    <PasoLayout titulo="¿A qué cuerpo perteneces?">
      <select
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value="">— Selecciona tu cuerpo —</option>
        {ordenados.map((c) => (
          <option key={c.id} value={c.id}>
            {c.codigo_oficial ? `${c.codigo_oficial} · ` : ""}{c.denominacion}{c.subgrupo ? ` · ${c.subgrupo}` : ""}
          </option>
        ))}
      </select>
      <NavBotones atras={onAtras} siguienteHabilitado={!!valor} onSiguiente={onSiguiente} />
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Paso 3 — Especialidad
// ----------------------------------------------------------------------
function Paso3Especialidad({
  especialidades, valor, onChange, onAtras, onSiguiente,
}: {
  especialidades: EspecialidadRow[]; valor: string | null;
  onChange: (v: string) => void; onAtras: () => void; onSiguiente: () => void;
}) {
  const ordenadas = useMemo(
    () => [...especialidades].sort((a, b) => (a.codigo_oficial ?? "").localeCompare(b.codigo_oficial ?? "")),
    [especialidades],
  );
  return (
    <PasoLayout titulo="¿Qué especialidad?">
      <select
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value="">— Selecciona la especialidad —</option>
        {ordenadas.map((e) => (
          <option key={e.id} value={e.id}>
            {e.codigo_oficial ? `${e.codigo_oficial} · ` : ""}{e.denominacion}
          </option>
        ))}
      </select>
      <NavBotones atras={onAtras} siguienteHabilitado={!!valor} onSiguiente={onSiguiente} />
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Paso 4 — Plaza actual (autocompletado de municipios)
// ----------------------------------------------------------------------
function Paso4PlazaActual({
  codigo, nombre, onChange, onAtras, onSiguiente,
}: {
  codigo: string | null; nombre: string | null;
  onChange: (codigo: string | null, nombre: string | null) => void;
  onAtras: () => void; onSiguiente: () => void;
}) {
  return (
    <PasoLayout titulo="¿Dónde está tu plaza actualmente?">
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
        Empieza a escribir el nombre del municipio donde tienes destino definitivo.
      </p>
      <MunicipioAutocomplete
        seleccionado={codigo && nombre ? { codigo_ine: codigo, nombre, provincia_codigo: "", provincia_nombre: "" } : null}
        onSeleccionar={(m) => onChange(m.codigo_ine, m.nombre)}
        onLimpiar={() => onChange(null, null)}
      />
      <NavBotones atras={onAtras} siguienteHabilitado={!!codigo} onSiguiente={onSiguiente} />
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Paso 5 — Plazas deseadas
// ----------------------------------------------------------------------
function Paso5PlazasDeseadas({
  ccaa, provincias, municipioActual, plazas, atajos, plazasNombres,
  onChange, onAtras, onSiguiente,
}: {
  ccaa: CcaaRow[]; provincias: ProvinciaRow[];
  municipioActual: string | null;
  plazas: string[]; atajos: AtajoState[];
  plazasNombres: Record<string, string>;
  onChange: (plazas: string[], atajos: AtajoState[], nombres: Record<string, string>) => void;
  onAtras: () => void; onSiguiente: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);

  // Selectores rápidos
  const [ccaaSeleccionada, setCcaaSeleccionada] = useState("");
  const [provinciaSeleccionada, setProvinciaSeleccionada] = useState("");

  const ccaaUsadas = new Set(atajos.filter((a) => a.tipo === "ccaa").map((a) => a.valor));
  const provinciasUsadas = new Set(atajos.filter((a) => a.tipo === "provincia").map((a) => a.valor));

  const provinciasDisponibles = useMemo(
    () => provincias.filter((p) => !provinciasUsadas.has(p.codigo_ine)),
    [provincias, provinciasUsadas],
  );

  async function añadirAtajoCcaa() {
    if (!ccaaSeleccionada || ccaaUsadas.has(ccaaSeleccionada)) return;
    setAplicando(true);
    setError(null);
    try {
      const nuevoAtajos: AtajoState[] = [...atajos, { tipo: "ccaa", valor: ccaaSeleccionada }];
      const expandidos = await expandirAtajos(nuevoAtajos);
      const setUnion = new Set([...plazas, ...expandidos]);
      if (municipioActual) setUnion.delete(municipioActual);
      onChange(Array.from(setUnion), nuevoAtajos, plazasNombres);
      setCcaaSeleccionada("");
    } finally {
      setAplicando(false);
    }
  }

  async function añadirAtajoProvincia() {
    if (!provinciaSeleccionada || provinciasUsadas.has(provinciaSeleccionada)) return;
    setAplicando(true);
    setError(null);
    try {
      const nuevoAtajos: AtajoState[] = [...atajos, { tipo: "provincia", valor: provinciaSeleccionada }];
      const expandidos = await expandirAtajos(nuevoAtajos);
      const setUnion = new Set([...plazas, ...expandidos]);
      if (municipioActual) setUnion.delete(municipioActual);
      onChange(Array.from(setUnion), nuevoAtajos, plazasNombres);
      setProvinciaSeleccionada("");
    } finally {
      setAplicando(false);
    }
  }

  function añadirMunicipioIndividual(m: MunicipioBusqueda) {
    if (m.codigo_ine === municipioActual) {
      setError("No puedes añadir tu municipio actual a las plazas deseadas.");
      return;
    }
    if (plazas.includes(m.codigo_ine)) return;
    setError(null);
    onChange(
      [...plazas, m.codigo_ine],
      [...atajos, { tipo: "municipio_individual", valor: m.codigo_ine }],
      { ...plazasNombres, [m.codigo_ine]: `${m.nombre} (${m.provincia_nombre})` },
    );
  }

  async function quitarAtajoCcaa(codigoCcaa: string) {
    setAplicando(true);
    try {
      const nuevoAtajos = atajos.filter((a) => !(a.tipo === "ccaa" && a.valor === codigoCcaa));
      const expandidos = await expandirAtajos(nuevoAtajos);
      // Mantenemos solo lo que provenga de los atajos restantes + municipios individuales del state.
      const indivCodes = atajos
        .filter((a) => a.tipo === "municipio_individual")
        .map((a) => a.valor);
      const setUnion = new Set([...expandidos, ...indivCodes]);
      if (municipioActual) setUnion.delete(municipioActual);
      onChange(Array.from(setUnion), nuevoAtajos, plazasNombres);
    } finally {
      setAplicando(false);
    }
  }

  async function quitarAtajoProvincia(codigoProv: string) {
    setAplicando(true);
    try {
      const nuevoAtajos = atajos.filter((a) => !(a.tipo === "provincia" && a.valor === codigoProv));
      const expandidos = await expandirAtajos(nuevoAtajos);
      const indivCodes = atajos
        .filter((a) => a.tipo === "municipio_individual")
        .map((a) => a.valor);
      const setUnion = new Set([...expandidos, ...indivCodes]);
      if (municipioActual) setUnion.delete(municipioActual);
      onChange(Array.from(setUnion), nuevoAtajos, plazasNombres);
    } finally {
      setAplicando(false);
    }
  }

  function quitarMunicipioIndividual(codigo: string) {
    const nuevoAtajos = atajos.filter(
      (a) => !(a.tipo === "municipio_individual" && a.valor === codigo),
    );
    const nuevasPlazas = plazas.filter((c) => c !== codigo);
    const nuevosNombres = { ...plazasNombres };
    delete nuevosNombres[codigo];
    onChange(nuevasPlazas, nuevoAtajos, nuevosNombres);
  }

  const atajosCcaa = atajos.filter((a) => a.tipo === "ccaa");
  const atajosProvincia = atajos.filter((a) => a.tipo === "provincia");
  const municipiosIndividuales = atajos.filter((a) => a.tipo === "municipio_individual");

  return (
    <PasoLayout titulo="¿A qué municipios aceptarías irte?">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Puedes combinar tres formas: añadir toda una CCAA, toda una provincia o municipios sueltos.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
          {error}
        </div>
      )}

      {/* Selector CCAA completa */}
      <div className="mb-3 flex gap-2">
        <select
          value={ccaaSeleccionada}
          onChange={(e) => setCcaaSeleccionada(e.target.value)}
          disabled={aplicando}
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">Toda una Comunidad Autónoma…</option>
          {ccaa.filter((c) => !ccaaUsadas.has(c.codigo_ine)).map((c) => (
            <option key={c.codigo_ine} value={c.codigo_ine}>{c.nombre}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={!ccaaSeleccionada || aplicando}
          onClick={añadirAtajoCcaa}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          Añadir
        </button>
      </div>

      {/* Selector provincia completa */}
      <div className="mb-3 flex gap-2">
        <select
          value={provinciaSeleccionada}
          onChange={(e) => setProvinciaSeleccionada(e.target.value)}
          disabled={aplicando}
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="">Toda una provincia…</option>
          {provinciasDisponibles.map((p) => (
            <option key={p.codigo_ine} value={p.codigo_ine}>{p.nombre}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={!provinciaSeleccionada || aplicando}
          onClick={añadirAtajoProvincia}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          Añadir
        </button>
      </div>

      {/* Buscador de municipios sueltos */}
      <div className="mb-4">
        <p className="mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">O añade municipios sueltos</p>
        <MunicipioAutocomplete
          seleccionado={null}
          onSeleccionar={añadirMunicipioIndividual}
          onLimpiar={() => undefined}
          placeholder="Escribe un municipio…"
          autoLimpiar
        />
      </div>

      {/* Resumen de seleccionados */}
      <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
        <p className="mb-2 font-medium text-slate-900 dark:text-slate-100">
          {plazas.length} {plazas.length === 1 ? "municipio seleccionado" : "municipios seleccionados"}
        </p>

        {atajosCcaa.length === 0 && atajosProvincia.length === 0 && municipiosIndividuales.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Aún no has añadido nada.</p>
        )}

        {atajosCcaa.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Comunidades enteras:</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {atajosCcaa.map((a) => {
                const c = ccaa.find((x) => x.codigo_ine === a.valor);
                return (
                  <Chip key={a.valor} label={`${c?.nombre ?? a.valor}`} onQuitar={() => quitarAtajoCcaa(a.valor)} />
                );
              })}
            </div>
          </div>
        )}

        {atajosProvincia.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Provincias enteras:</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {atajosProvincia.map((a) => {
                const p = provincias.find((x) => x.codigo_ine === a.valor);
                return (
                  <Chip key={a.valor} label={p?.nombre ?? a.valor} onQuitar={() => quitarAtajoProvincia(a.valor)} />
                );
              })}
            </div>
          </div>
        )}

        {municipiosIndividuales.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Municipios sueltos:</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {municipiosIndividuales.map((a) => (
                <Chip
                  key={a.valor}
                  label={plazasNombres[a.valor] ?? a.valor}
                  onQuitar={() => quitarMunicipioIndividual(a.valor)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <NavBotones atras={onAtras} siguienteHabilitado={plazas.length > 0 && !aplicando} onSiguiente={onSiguiente} />
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Paso 6 — Datos legales personales
// ----------------------------------------------------------------------
function Paso6DatosLegales({
  fecha, anyos, haPermutado, fechaPermuta, onChange, onAtras, onSiguiente,
}: {
  fecha: string | null; anyos: number | null;
  haPermutado: boolean; fechaPermuta: string | null;
  onChange: (parche: Partial<WizardState>) => void;
  onAtras: () => void; onSiguiente: () => void;
}) {
  const valido =
    !!fecha
    && typeof anyos === "number" && anyos >= 0 && anyos <= 50
    && (!haPermutado || !!fechaPermuta);

  return (
    <PasoLayout titulo="Datos para validar reglas legales">
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Esta información NO se muestra públicamente. Solo se usa para que la app respete las reglas legales de las permutas (≥2 años en destino, diferencia máxima de antigüedad, ≥10 años hasta jubilación, carencia de 10 años desde la última permuta).
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            Fecha de toma de posesión definitiva en tu plaza actual
          </label>
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={fecha ?? ""}
            onChange={(e) => onChange({ fecha_toma_posesion_definitiva: e.target.value || null })}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            Años totales de servicio como funcionario (en cualquier destino)
          </label>
          <input
            type="number"
            min={0}
            max={50}
            value={anyos ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ anyos_servicio_totales: v === "" ? null : Number.parseInt(v, 10) });
            }}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/50">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={haPermutado}
              onChange={(e) => onChange({
                ha_permutado_antes: e.target.checked,
                permuta_anterior_fecha: e.target.checked ? fechaPermuta : null,
              })}
            />
            <span className="text-slate-900 dark:text-slate-100">Ya he permutado antes en mi carrera</span>
          </label>
          {haPermutado && (
            <div className="mt-3">
              <label className="block text-xs text-slate-700 dark:text-slate-300">
                Fecha de la última permuta
              </label>
              <input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={fechaPermuta ?? ""}
                onChange={(e) => onChange({ permuta_anterior_fecha: e.target.value || null })}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                La regla legal exige al menos 10 años desde la permuta anterior.
              </p>
            </div>
          )}
        </div>
      </div>

      <NavBotones atras={onAtras} siguienteHabilitado={valido} onSiguiente={onSiguiente} />
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Paso 7 — Observaciones
// ----------------------------------------------------------------------
function Paso7Observaciones({
  valor, onChange, onAtras, onSiguiente,
}: {
  valor: string; onChange: (v: string) => void;
  onAtras: () => void; onSiguiente: () => void;
}) {
  const restantes = 500 - valor.length;
  return (
    <PasoLayout titulo="Observaciones (opcional)">
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
        Texto libre que SOLO verá la otra parte cuando haya un match. No se usa para emparejar — solo para que ambos os entendáis. Máximo 500 caracteres.
      </p>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
        No incluyas datos sensibles (motivos de salud, situaciones personales delicadas, datos económicos) ni datos de contacto.
      </div>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value.slice(0, 500))}
        rows={5}
        placeholder="Por ejemplo: prefiero centros públicos, busco acercarme a familia en X, etc."
        className="mt-3 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">{restantes} caracteres restantes</p>
      <NavBotones atras={onAtras} siguienteHabilitado={true} onSiguiente={onSiguiente} />
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Paso 8 — Confirmación
// ----------------------------------------------------------------------
function Paso8Confirmacion({
  state, cuerpoElegido, especialidadElegida, ccaa, provincias,
  publicando, error, onAtras, onPublicar,
}: {
  state: WizardState;
  cuerpoElegido: CuerpoRow | null;
  especialidadElegida: EspecialidadRow | null;
  ccaa: CcaaRow[]; provincias: ProvinciaRow[];
  publicando: boolean; error: string | null;
  onAtras: () => void; onPublicar: () => void;
}) {
  const atajosCcaa = state.atajos.filter((a) => a.tipo === "ccaa");
  const atajosProv = state.atajos.filter((a) => a.tipo === "provincia");
  const atajosIndiv = state.atajos.filter((a) => a.tipo === "municipio_individual");

  return (
    <PasoLayout titulo="Revisa antes de publicar">
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <Resumen titulo="Sector y cuerpo">
        <p>{cuerpoElegido?.codigo_oficial} · {cuerpoElegido?.denominacion}</p>
        {especialidadElegida && (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Especialidad: {especialidadElegida.codigo_oficial ? `${especialidadElegida.codigo_oficial} · ` : ""}{especialidadElegida.denominacion}
          </p>
        )}
      </Resumen>

      <Resumen titulo="Plaza actual">
        <p>{state.municipio_actual_nombre ?? state.municipio_actual_codigo}</p>
      </Resumen>

      <Resumen titulo={`Plazas deseadas (${state.plazas_deseadas.length} municipios)`}>
        {atajosCcaa.length > 0 && (
          <p className="text-sm">
            <span className="font-medium">CCAA enteras: </span>
            {atajosCcaa.map((a) => ccaa.find((c) => c.codigo_ine === a.valor)?.nombre).filter(Boolean).join(", ")}
          </p>
        )}
        {atajosProv.length > 0 && (
          <p className="text-sm">
            <span className="font-medium">Provincias enteras: </span>
            {atajosProv.map((a) => provincias.find((p) => p.codigo_ine === a.valor)?.nombre).filter(Boolean).join(", ")}
          </p>
        )}
        {atajosIndiv.length > 0 && (
          <p className="text-sm">
            <span className="font-medium">Municipios sueltos: </span>
            {atajosIndiv.map((a) => state.plazas_individuales_nombres[a.valor] ?? a.valor).join(", ")}
          </p>
        )}
      </Resumen>

      <Resumen titulo="Datos legales">
        <p className="text-sm">Toma de posesión definitiva: {state.fecha_toma_posesion_definitiva}</p>
        <p className="text-sm">Años de servicio totales: {state.anyos_servicio_totales}</p>
        <p className="text-sm">
          Permuta anterior: {state.ha_permutado_antes ? `Sí (${state.permuta_anterior_fecha})` : "No"}
        </p>
      </Resumen>

      {state.observaciones && (
        <Resumen titulo="Observaciones">
          <p className="whitespace-pre-wrap text-sm">{state.observaciones}</p>
        </Resumen>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onAtras}
          disabled={publicando}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ← Atrás
        </button>
        <button
          type="button"
          onClick={onPublicar}
          disabled={publicando}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {publicando ? "Publicando…" : "Publicar anuncio"}
        </button>
      </div>
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Componentes auxiliares
// ----------------------------------------------------------------------

function MunicipioAutocomplete({
  seleccionado, onSeleccionar, onLimpiar, placeholder, autoLimpiar,
}: {
  seleccionado: MunicipioBusqueda | null;
  onSeleccionar: (m: MunicipioBusqueda) => void;
  onLimpiar: () => void;
  placeholder?: string;
  autoLimpiar?: boolean;
}) {
  const [query, setQuery] = useState(seleccionado?.nombre ?? "");
  const [resultados, setResultados] = useState<MunicipioBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2 || (seleccionado && query === seleccionado.nombre)) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      const r = await buscarMunicipios(query, 20);
      setResultados(r);
      setBuscando(false);
      setAbierto(true);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, seleccionado]);

  if (seleccionado && !autoLimpiar) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <span className="text-sm text-slate-900 dark:text-slate-100">{seleccionado.nombre}</span>
        <button
          type="button"
          onClick={() => { setQuery(""); onLimpiar(); }}
          className="text-xs text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder ?? "Empieza a escribir…"}
        onChange={(e) => { setQuery(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      {abierto && (resultados.length > 0 || buscando) && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {buscando && <li className="px-3 py-2 text-sm text-slate-500">Buscando…</li>}
          {resultados.map((m) => (
            <li key={m.codigo_ine}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSeleccionar(m);
                  if (autoLimpiar) {
                    setQuery("");
                    setResultados([]);
                  } else {
                    setQuery(m.nombre);
                  }
                  setAbierto(false);
                }}
                className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="text-slate-900 dark:text-slate-100">{m.nombre}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{m.provincia_nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ label, onQuitar }: { label: string; onQuitar: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-800 dark:bg-slate-800 dark:text-slate-200">
      {label}
      <button
        type="button"
        onClick={onQuitar}
        className="ml-0.5 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700"
        aria-label="Quitar"
      >
        ×
      </button>
    </span>
  );
}

function Resumen({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titulo}</h3>
      <div className="mt-1 text-slate-700 dark:text-slate-300">{children}</div>
    </div>
  );
}

function ProgressBar({ paso }: { paso: number }) {
  const pct = Math.round(((paso - 1) / (TOTAL_PASOS - 1)) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Paso {paso} de {TOTAL_PASOS}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-1.5 rounded-full bg-slate-900 transition-all dark:bg-slate-100" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PasoLayout({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function NavBotones({
  atras, siguienteHabilitado, onSiguiente,
}: {
  atras: (() => void) | null;
  siguienteHabilitado: boolean;
  onSiguiente: () => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {atras ? (
        <button
          type="button"
          onClick={atras}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          ← Atrás
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onSiguiente}
        disabled={!siguienteHabilitado}
        className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        Siguiente →
      </button>
    </div>
  );
}

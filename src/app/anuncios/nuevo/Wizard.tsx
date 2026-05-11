"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  type AtajoState,
  type CcaaRow,
  type CuerpoRow,
  type EspecialidadRow,
  type ProvinciaRow,
  type SectorRow,
  type ServicioSaludRow,
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

// Carga perezosa de MapLibre GL — pesa ~700 KB gzip y solo se necesita
// cuando el usuario abre el selector visual. SSR off porque depende
// del DOM (window, canvas).
const MapaSelectorMunicipios = dynamic(
  () => import("@/components/MapaSelectorMunicipios").then((m) => m.MapaSelectorMunicipios),
  { ssr: false },
);

/** Sectores REALMENTE activos (todos los previstos). */
const SECTORES_ACTIVOS = new Set<string>([
  "docente_loe",
  "sanitario_sns",
  "funcionario_age",
  "funcionario_ccaa",
  "funcionario_local",
  "habilitado_nacional",
  "policia_local",
  "policia_nacional",
  "guardia_civil",
]);
const STORAGE_KEY = "permutaes:wizard:nuevo-anuncio";
const ANO_ACTUAL = new Date().getFullYear();

type Props = {
  sectores: SectorRow[];
  cuerpos: CuerpoRow[];
  especialidades: EspecialidadRow[];
  ccaa: CcaaRow[];
  provincias: ProvinciaRow[];
  serviciosSalud: ServicioSaludRow[];
};

export function Wizard({
  sectores,
  cuerpos,
  especialidades,
  ccaa,
  provincias,
  serviciosSalud,
}: Props) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [hidratado, setHidratado] = useState(false);
  const [borradorDetectado, setBorradorDetectado] = useState(false);
  const [errorPublicar, setErrorPublicar] = useState<string | null>(null);
  const [publicando, startPublicar] = useTransition();
  // Modal de confirmacion para "Empezar desde cero" (sustituye al
  // confirm() nativo del navegador, que se ve mal).
  const [confirmandoReset, setConfirmandoReset] = useState(false);
  // Toast tras "Guardar y salir" para que el usuario sepa que el
  // borrador queda persistido en su navegador.
  const [toastGuardado, setToastGuardado] = useState(false);

  // Cargar de localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parseado = { ...INITIAL_STATE, ...JSON.parse(raw) } as WizardState;
        setState(parseado);
        // Hay un borrador "no trivial" si tiene algo elegido más allá de
        // estar en paso 1 con todo vacío.
        const tieneContenido =
          parseado.paso > 1 ||
          parseado.sector_codigo !== null ||
          parseado.cuerpo_id !== null ||
          parseado.municipio_actual_codigo !== null ||
          parseado.plazas_deseadas.length > 0;
        if (tieneContenido) setBorradorDetectado(true);
      }
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
    setBorradorDetectado(false);
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
      {borradorDetectado && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Tienes un borrador a medio rellenar.</p>
          <p className="mt-1">
            Detectamos un anuncio en progreso de antes (paso {state.paso} de {TOTAL_PASOS}).
            ¿Quieres seguir con él o empezar uno nuevo desde cero?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setBorradorDetectado(false)}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
            >
              Continuar el borrador
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-amber-700 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              Empezar desde cero
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end justify-between gap-3">
        <div className="flex-1">
          <ProgressBar paso={state.paso} />
        </div>
        {(state.paso > 1 || state.sector_codigo) && (
          <div className="flex items-center gap-3">
            <a
              href="/mi-cuenta"
              onClick={() => {
                // No hace falta hacer nada: el state ya se guarda en
                // localStorage automaticamente en cada cambio. Solo
                // dejamos un toast para el siguiente render por si
                // vuelve aqui rapido.
                setToastGuardado(true);
                setTimeout(() => setToastGuardado(false), 4000);
              }}
              className="text-xs text-brand-text hover:text-brand"
              title="Tu progreso queda guardado en este navegador. Vuelve cuando quieras."
            >
              Guardar y salir
            </a>
            <button
              type="button"
              onClick={() => setConfirmandoReset(true)}
              className="text-xs text-slate-500 underline hover:text-slate-700"
            >
              Empezar desde cero
            </button>
          </div>
        )}
      </div>

      {/* Toast: confirma al usuario que su borrador esta guardado. */}
      {toastGuardado && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-card-hover">
          Borrador guardado en este navegador. Vuelve cuando quieras.
        </div>
      )}

      {/* Modal de confirmacion para "Empezar desde cero" — sustituye
          al confirm() nativo del navegador (feo y no responsive). */}
      {confirmandoReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmandoReset(false);
          }}
        >
          <div className="w-full max-w-md rounded-xl2 border border-slate-200 bg-white p-5 shadow-card-hover">
            <h3 className="font-head text-lg font-semibold text-slate-900">
              ¿Empezar desde cero?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Vas a perder todos los datos del borrador actual (paso{" "}
              {state.paso} de {TOTAL_PASOS}). Esta acción no se puede
              deshacer.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoReset(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setConfirmandoReset(false);
                }}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Sí, empezar de cero
              </button>
            </div>
          </div>
        </div>
      )}

      {state.paso === 1 && (
        <Paso1Sector
          sectores={sectores}
          valor={state.sector_codigo}
          onChange={(v) => {
            update("sector_codigo", v);
            update("cuerpo_id", null);
            update("especialidad_id", null);
            // El servicio de salud solo aplica a SNS — al cambiar
            // de sector lo reseteamos siempre.
            update("servicio_salud_codigo", null);
          }}
          onSiguiente={() => ir(2)}
        />
      )}
      {state.paso === 2 && (
        <Paso2Cuerpo
          cuerpos={cuerposDelSector}
          valor={state.cuerpo_id}
          servicios={serviciosSalud}
          servicioElegido={state.servicio_salud_codigo}
          esSns={state.sector_codigo === "sanitario_sns"}
          onChange={(v) => { update("cuerpo_id", v); update("especialidad_id", null); }}
          onChangeServicio={(v) => update("servicio_salud_codigo", v)}
          onAtras={() => {
            // Al volver al paso 1, limpiamos el servicio de salud para que
            // no quede colgado si el usuario cambia de sector.
            update("servicio_salud_codigo", null);
            ir(1);
          }}
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
          onIrAPaso={(p) => ir(p)}
          onAtras={() => ir(7)}
          onPublicar={() => {
            setErrorPublicar(null);
            // Limpiamos localStorage AHORA, asumiendo éxito. Si la
            // publicación fallase, lo restauramos abajo. Esto evita que
            // el wizard quede con datos del anuncio recién publicado y
            // confunda al usuario al crear el siguiente.
            const respaldo =
              typeof localStorage !== "undefined"
                ? localStorage.getItem(STORAGE_KEY)
                : null;
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {/* ignore */}

            startPublicar(async () => {
              try {
                const r = await crearAnuncioYRedirigir({
                  cuerpo_id: state.cuerpo_id!,
                  especialidad_id: state.especialidad_id,
                  servicio_salud_codigo: state.servicio_salud_codigo,
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
                if (r && !r.ok) {
                  // Falló: restaurar el progreso para no perder los datos.
                  if (respaldo) {
                    try {
                      localStorage.setItem(STORAGE_KEY, respaldo);
                    } catch {/* ignore */}
                  }
                  setErrorPublicar(r.mensaje);
                }
              } catch {
                // El redirect lanza throw NEXT_REDIRECT; lo dejamos pasar.
                // localStorage ya está limpio.
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
      <p className="mb-4 text-sm text-slate-600">
        Elige el sector al que perteneces. Las reglas legales de la
        permuta (geográficas y de cuerpo) se aplican según el sector.
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
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:border-slate-400",
                  !activo && "opacity-50 cursor-not-allowed",
                ].filter(Boolean).join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-900">{s.nombre}</span>
                  {!activo && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      Próximamente
                    </span>
                  )}
                </div>
                {s.descripcion && (
                  <p className="mt-1 text-xs text-slate-500">{s.descripcion}</p>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {valor === "policia_local" && (
        <div className="mt-4 rounded-md border border-warn-text/30 bg-warn-bg p-3 text-xs text-warn-text">
          <strong>Atención:</strong> la permuta de Policía Local solo está
          regulada en <strong>Andalucía, Aragón, Illes Balears, Comunitat
          Valenciana y Galicia</strong>. Si tu plaza actual está fuera de
          estas CCAA, tu administración no podrá tramitarla aunque encuentres
          una persona compatible.
        </div>
      )}
      {(valor === "funcionario_ccaa" || valor === "sanitario_sns") && (
        <div className="mt-4 rounded-md border border-warn-text/30 bg-warn-bg p-3 text-xs text-warn-text">
          <strong>Atención:</strong>{" "}
          {valor === "funcionario_ccaa"
            ? "los funcionarios autonómicos solo permutan dentro de la misma CCAA."
            : "el personal estatutario del SNS solo permuta dentro del mismo Servicio de Salud (SAS, SERGAS, etc.)."}
        </div>
      )}

      <NavBotones atras={null} siguienteHabilitado={!!valor} onSiguiente={onSiguiente} />
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Paso 2 — Cuerpo (+ Servicio de Salud si SNS)
// ----------------------------------------------------------------------
function Paso2Cuerpo({
  cuerpos,
  valor,
  servicios,
  servicioElegido,
  esSns,
  onChange,
  onChangeServicio,
  onAtras,
  onSiguiente,
}: {
  cuerpos: CuerpoRow[];
  valor: string | null;
  servicios: ServicioSaludRow[];
  servicioElegido: string | null;
  esSns: boolean;
  onChange: (v: string) => void;
  onChangeServicio: (v: string | null) => void;
  onAtras: () => void;
  onSiguiente: () => void;
}) {
  const ordenados = useMemo(
    () => [...cuerpos].sort((a, b) => (a.codigo_oficial ?? "").localeCompare(b.codigo_oficial ?? "")),
    [cuerpos],
  );
  const ordenServicios = useMemo(
    () => [...servicios].sort((a, b) => a.nombre_corto.localeCompare(b.nombre_corto, "es")),
    [servicios],
  );

  const habilitado = !!valor && (!esSns || !!servicioElegido);

  return (
    <PasoLayout titulo={esSns ? "¿En qué categoría y servicio trabajas?" : "¿A qué cuerpo perteneces?"}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {esSns ? "Categoría profesional" : "Cuerpo"}
      </label>
      <select
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
      >
        <option value="">
          — Selecciona tu {esSns ? "categoría" : "cuerpo"} —
        </option>
        {ordenados.map((c) => (
          <option key={c.id} value={c.id}>
            {c.codigo_oficial ? `${c.codigo_oficial} · ` : ""}{c.denominacion}{c.subgrupo ? ` · ${c.subgrupo}` : ""}
          </option>
        ))}
      </select>

      {esSns && (
        <div className="mt-5">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Servicio de Salud (organismo empleador)
          </label>
          <select
            value={servicioElegido ?? ""}
            onChange={(e) => onChangeServicio(e.target.value || null)}
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
          >
            <option value="">— Selecciona tu Servicio de Salud —</option>
            {ordenServicios.map((s) => (
              <option key={s.codigo} value={s.codigo}>
                {s.nombre_corto} · {s.nombre_oficial}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500">
            En sanidad las permutas son siempre <strong>dentro del mismo
            Servicio de Salud</strong>. Solo cruzaremos tu anuncio con otros
            del mismo organismo.
          </p>
        </div>
      )}

      <NavBotones atras={onAtras} siguienteHabilitado={habilitado} onSiguiente={onSiguiente} />
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
        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
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
      <p className="mb-3 text-sm text-slate-600">
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

  // Mapa visual
  const [mapaAbierto, setMapaAbierto] = useState(false);

  // CCAA inicial del mapa: si tu municipio actual está en una CCAA,
  // arrancamos por esa para que veas la zona conocida.
  const ccaaInicialMapa = useMemo(() => {
    if (!municipioActual) return undefined;
    const provCod = municipioActual.slice(0, 2);
    return provincias.find((p) => p.codigo_ine === provCod)?.ccaa_codigo;
  }, [municipioActual, provincias]);

  // Set de plazas para el componente del mapa.
  const seleccionadosSet = useMemo(() => new Set(plazas), [plazas]);
  const excluidosSet = useMemo(
    () => (municipioActual ? new Set([municipioActual]) : new Set<string>()),
    [municipioActual],
  );

  function provinciaPorCodigo(codigoMuni: string): string {
    const provCod = codigoMuni.slice(0, 2);
    return provincias.find((p) => p.codigo_ine === provCod)?.nombre ?? "";
  }

  /**
   * Toggle desde el mapa visual. Cuando se añade, registramos un
   * `municipio_individual` en `atajos` igual que con el autocompletado
   * por nombre. El nombre completo lo construimos con el nombre del
   * GeoJSON + el de la provincia desde el state actual del wizard.
   */
  function onToggleMapa(codigoIne: string, isAdding: boolean, nombre: string) {
    if (codigoIne === municipioActual) return;
    if (isAdding) {
      if (plazas.includes(codigoIne)) return;
      const provNombre = provinciaPorCodigo(codigoIne);
      const etiqueta = provNombre ? `${nombre} (${provNombre})` : nombre;
      onChange(
        [...plazas, codigoIne],
        [...atajos, { tipo: "municipio_individual", valor: codigoIne }],
        { ...plazasNombres, [codigoIne]: etiqueta },
      );
    } else {
      // Quitar — solo si está como municipio individual; si vino de un
      // atajo de provincia/CCAA, lo dejamos (el usuario puede quitar el
      // atajo entero desde la lista de chips si quiere).
      const fueIndividual = atajos.some(
        (a) => a.tipo === "municipio_individual" && a.valor === codigoIne,
      );
      if (!fueIndividual) return;
      const nuevoAtajos = atajos.filter(
        (a) => !(a.tipo === "municipio_individual" && a.valor === codigoIne),
      );
      const nuevasPlazas = plazas.filter((c) => c !== codigoIne);
      const nuevosNombres = { ...plazasNombres };
      delete nuevosNombres[codigoIne];
      onChange(nuevasPlazas, nuevoAtajos, nuevosNombres);
    }
  }

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
      <p className="mb-4 text-sm text-slate-600">
        La forma más sencilla es seleccionar los municipios directamente
        en el mapa. También puedes añadir CCAA o provincias enteras, o
        municipios sueltos por nombre.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      )}

      {/* Boton MAPA prominente arriba: es la opcion mas visual y la que
          mejor funciona para indicar comarcas o zonas concretas. Lo
          ponemos primero para que no se pierda. */}
      <button
        type="button"
        onClick={() => setMapaAbierto(true)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
      >
        <BotonMapaIconoWizard />
        Seleccionar en el mapa
      </button>

      <div className="mb-3 text-center text-[11px] uppercase tracking-wide text-slate-400">
        — o añadir por listas —
      </div>

      {/* Selector CCAA completa */}
      <div className="mb-3 flex gap-2">
        <select
          value={ccaaSeleccionada}
          onChange={(e) => setCcaaSeleccionada(e.target.value)}
          disabled={aplicando}
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
          className="rounded-md bg-brand px-3 py-2 text-sm text-white disabled:opacity-50"
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
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
          className="rounded-md bg-brand px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          Añadir
        </button>
      </div>

      {/* Buscador de municipios sueltos */}
      <div className="mb-4">
        <p className="mb-1 text-xs font-medium text-slate-700">O añade municipios sueltos</p>
        <MunicipioAutocomplete
          seleccionado={null}
          onSeleccionar={añadirMunicipioIndividual}
          onLimpiar={() => undefined}
          placeholder="Escribe un municipio…"
          autoLimpiar
        />
      </div>

      {/* Resumen de seleccionados */}
      <div className="mb-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="mb-2 font-medium text-slate-900">
          {plazas.length} {plazas.length === 1 ? "municipio seleccionado" : "municipios seleccionados"}
        </p>

        {atajosCcaa.length === 0 && atajosProvincia.length === 0 && municipiosIndividuales.length === 0 && (
          <p className="text-xs text-slate-500">Aún no has añadido nada.</p>
        )}

        {atajosCcaa.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-medium text-slate-600">Comunidades enteras:</p>
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
            <p className="text-xs font-medium text-slate-600">Provincias enteras:</p>
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
            <p className="text-xs font-medium text-slate-600">Municipios sueltos:</p>
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

      {/* Modal con el mapa visual */}
      {mapaAbierto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm">
          <div className="m-2 flex flex-1 flex-col overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-card md:m-6 md:max-w-6xl md:self-center md:w-full">
            <MapaSelectorMunicipios
              mode="multi"
              ccaaOpciones={ccaa.map((c) => ({ codigo_ine: c.codigo_ine, nombre: c.nombre }))}
              ccaaInicial={ccaaInicialMapa}
              seleccionados={seleccionadosSet}
              excluidos={excluidosSet}
              onToggle={onToggleMapa}
              onCerrar={() => setMapaAbierto(false)}
            />
          </div>
        </div>
      )}
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Paso 6 — Datos legales personales
// ----------------------------------------------------------------------
//
// Helpers de conversion ano <-> fecha. El esquema de la BD guarda los
// campos como DATE (YYYY-MM-DD) por compatibilidad, pero la UI solo
// pide el ano. Convertimos ano -> "YYYY-01-01" al guardar y extraemos
// el ano al cargar.
function fechaAYano(s: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{4})/.exec(s);
  return m ? Number.parseInt(m[1], 10) : null;
}

function yanoAFecha(y: number | null): string | null {
  if (y === null) return null;
  if (y < 1900 || y > 2100) return null;
  return `${y}-01-01`;
}

function Paso6DatosLegales({
  fecha, anyos, haPermutado, fechaPermuta, onChange, onAtras, onSiguiente,
}: {
  fecha: string | null; anyos: number | null;
  haPermutado: boolean; fechaPermuta: string | null;
  onChange: (parche: Partial<WizardState>) => void;
  onAtras: () => void; onSiguiente: () => void;
}) {
  const yanoActual = new Date().getFullYear();
  // Lista de anos disponibles: del actual hacia atras hasta 1970.
  // Orden DESCENDENTE para que los anos recientes (los mas comunes)
  // queden arriba del desplegable.
  const anosDisponibles: number[] = [];
  for (let y = yanoActual; y >= 1970; y--) anosDisponibles.push(y);

  const valido =
    !!fecha
    && typeof anyos === "number" && anyos >= 0 && anyos <= 50
    && (!haPermutado || !!fechaPermuta);

  return (
    <PasoLayout titulo="Datos para validar reglas legales">
      <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p>
          <strong>Importante:</strong> las reglas legales de la permuta
          dependen de la <strong>comunidad autónoma</strong> y del{" "}
          <strong>servicio o función</strong> que desempeñas. Infórmate
          bien de cuáles son las que se aplican en tu caso (sindicato,
          BOE/DOG/BOJA correspondiente, recursos humanos de tu
          administración).
        </p>
        <p className="mt-2">
          Esta información <strong>NO se muestra públicamente</strong>.
          Solo se usa internamente para emparejarte con personas con las
          que la permuta es viable.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-900">
            Año de toma de posesión definitiva en tu plaza actual
          </label>
          <select
            value={fechaAYano(fecha) ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                onChange({ fecha_toma_posesion_definitiva: null });
              } else {
                const y = Number.parseInt(v, 10);
                onChange({
                  fecha_toma_posesion_definitiva: Number.isNaN(y) ? null : yanoAFecha(y),
                });
              }
            }}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
          >
            <option value="">Selecciona un año…</option>
            {anosDisponibles.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-900">
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
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
          />
        </div>

        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={haPermutado}
              onChange={(e) => onChange({
                ha_permutado_antes: e.target.checked,
                permuta_anterior_fecha: e.target.checked ? fechaPermuta : null,
              })}
            />
            <span className="text-slate-900">Ya he permutado antes en mi carrera</span>
          </label>
          {haPermutado && (
            <div className="mt-3">
              <label className="block text-xs text-slate-700">
                Año de la última permuta
              </label>
              <select
                value={fechaAYano(fechaPermuta) ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    onChange({ permuta_anterior_fecha: null });
                  } else {
                    const y = Number.parseInt(v, 10);
                    onChange({
                      permuta_anterior_fecha: Number.isNaN(y) ? null : yanoAFecha(y),
                    });
                  }
                }}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              >
                <option value="">Selecciona un año…</option>
                {anosDisponibles.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
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
      <p className="mb-3 text-sm text-slate-600">
        Texto libre que SOLO verá la otra parte cuando haya un match. No se usa para emparejar — solo para que ambos os entendáis. Máximo 500 caracteres.
      </p>
      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        No incluyas datos sensibles (motivos de salud, situaciones personales delicadas, datos económicos) ni datos de contacto.
      </div>
      <textarea
        value={valor}
        onChange={(e) => onChange(e.target.value.slice(0, 500))}
        rows={5}
        placeholder="Por ejemplo: prefiero centros públicos, busco acercarme a familia en X, etc."
        className="mt-3 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
      />
      <p className="mt-1 text-right text-xs text-slate-500">{restantes} caracteres restantes</p>
      <NavBotones atras={onAtras} siguienteHabilitado={true} onSiguiente={onSiguiente} />
    </PasoLayout>
  );
}

// ----------------------------------------------------------------------
// Paso 8 — Confirmación
// ----------------------------------------------------------------------
function Paso8Confirmacion({
  state, cuerpoElegido, especialidadElegida, ccaa, provincias,
  publicando, error, onIrAPaso, onAtras, onPublicar,
}: {
  state: WizardState;
  cuerpoElegido: CuerpoRow | null;
  especialidadElegida: EspecialidadRow | null;
  ccaa: CcaaRow[]; provincias: ProvinciaRow[];
  publicando: boolean; error: string | null;
  /** Salto directo a un paso concreto desde el resumen, para editar
   *  esa seccion sin tener que ir hacia atras paso por paso. */
  onIrAPaso: (paso: number) => void;
  onAtras: () => void; onPublicar: () => void;
}) {
  const atajosCcaa = state.atajos.filter((a) => a.tipo === "ccaa");
  const atajosProv = state.atajos.filter((a) => a.tipo === "provincia");
  const atajosIndiv = state.atajos.filter((a) => a.tipo === "municipio_individual");

  return (
    <PasoLayout titulo="Revisa antes de publicar">
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Resumen titulo="Sector y cuerpo" onEditar={() => onIrAPaso(2)}>
        <p>{cuerpoElegido?.codigo_oficial} · {cuerpoElegido?.denominacion}</p>
        {especialidadElegida && (
          <p className="text-sm text-slate-600">
            Especialidad: {especialidadElegida.codigo_oficial ? `${especialidadElegida.codigo_oficial} · ` : ""}{especialidadElegida.denominacion}
          </p>
        )}
      </Resumen>

      <Resumen titulo="Plaza actual" onEditar={() => onIrAPaso(4)}>
        <p>{state.municipio_actual_nombre ?? state.municipio_actual_codigo}</p>
      </Resumen>

      <Resumen
        titulo={`Plazas deseadas (${state.plazas_deseadas.length} municipios)`}
        onEditar={() => onIrAPaso(5)}
      >
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

      <Resumen titulo="Datos legales" onEditar={() => onIrAPaso(6)}>
        <p className="text-sm">Año de toma de posesión definitiva: {fechaAYano(state.fecha_toma_posesion_definitiva)}</p>
        <p className="text-sm">Años de servicio totales: {state.anyos_servicio_totales}</p>
        <p className="text-sm">
          Permuta anterior: {state.ha_permutado_antes ? `Sí (${fechaAYano(state.permuta_anterior_fecha)})` : "No"}
        </p>
      </Resumen>

      {state.observaciones ? (
        <Resumen titulo="Observaciones" onEditar={() => onIrAPaso(7)}>
          <p className="whitespace-pre-wrap text-sm">{state.observaciones}</p>
        </Resumen>
      ) : (
        <Resumen titulo="Observaciones" onEditar={() => onIrAPaso(7)}>
          <p className="text-sm italic text-slate-500">(sin observaciones)</p>
        </Resumen>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onAtras}
          disabled={publicando}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          ← Atrás
        </button>
        <button
          type="button"
          onClick={onPublicar}
          disabled={publicando}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
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
      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
        <span className="text-sm text-slate-900">{seleccionado.nombre}</span>
        <button
          type="button"
          onClick={() => { setQuery(""); onLimpiar(); }}
          className="text-xs text-slate-500 underline hover:text-slate-700"
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
        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
      />
      {abierto && (resultados.length > 0 || buscando) && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
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
                className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-slate-100"
              >
                <span className="text-slate-900">{m.nombre}</span>
                <span className="text-xs text-slate-500">{m.provincia_nombre}</span>
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
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-800">
      {label}
      <button
        type="button"
        onClick={onQuitar}
        className="ml-0.5 rounded-full hover:bg-slate-300"
        aria-label="Quitar"
      >
        ×
      </button>
    </span>
  );
}

function Resumen({
  titulo,
  children,
  onEditar,
}: {
  titulo: string;
  children: React.ReactNode;
  /** Si se pasa, muestra un boton "Editar" en la cabecera que salta
   *  al paso correspondiente del wizard. */
  onEditar?: () => void;
}) {
  return (
    <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
        {onEditar && (
          <button
            type="button"
            onClick={onEditar}
            className="text-xs font-medium text-brand-text hover:text-brand"
          >
            Editar
          </button>
        )}
      </div>
      <div className="mt-1 text-slate-700">{children}</div>
    </div>
  );
}

function ProgressBar({ paso }: { paso: number }) {
  // Antes empezaba en 0% en el paso 1, lo que era desmotivador
  // psicologicamente ("aun no he hecho nada"). Ahora empezamos en
  // paso/total = 12% para que el primer paso ya muestre progreso.
  const pct = Math.round((paso / TOTAL_PASOS) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500">
        <span>Paso {paso} de {TOTAL_PASOS}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200">
        <div className="h-1.5 rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Icono de mapa SVG inline (estilo bandera plegada). Se usa en los
 * botones "Seleccionar en el mapa" para sustituir el emoji 🗺.
 */
function BotonMapaIconoWizard() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4 L4 6 V20 L9 18 L15 20 L20 18 V4 L15 6 Z" />
      <path d="M9 4 V18" />
      <path d="M15 6 V20" />
    </svg>
  );
}

function PasoLayout({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl2 border border-slate-200 bg-white shadow-card p-6">
      <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
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
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
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
        className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
      >
        Siguiente →
      </button>
    </div>
  );
}

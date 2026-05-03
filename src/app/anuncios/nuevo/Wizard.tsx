"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type CuerpoRow,
  type EspecialidadRow,
  type SectorRow,
  type WizardState,
  INITIAL_STATE,
  TOTAL_PASOS,
} from "./types";

/**
 * Sectores que están REALMENTE activos en Fase 1.
 * El resto se muestra deshabilitado con etiqueta "Próximamente".
 */
const SECTORES_ACTIVOS = new Set<string>(["docente_loe"]);

const STORAGE_KEY = "permutaes:wizard:nuevo-anuncio";

type Props = {
  sectores: SectorRow[];
  cuerpos: CuerpoRow[];
  especialidades: EspecialidadRow[];
};

export function Wizard({ sectores, cuerpos, especialidades }: Props) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [hidratado, setHidratado] = useState(false);

  // Cargar estado guardado en localStorage al montar.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setState({ ...INITIAL_STATE, ...JSON.parse(raw) });
      }
    } catch {
      /* ignore */
    }
    setHidratado(true);
  }, []);

  // Guardar en localStorage en cada cambio (después de hidratado).
  useEffect(() => {
    if (!hidratado) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hidratado]);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function ir(paso: number) {
    setState((prev) => ({ ...prev, paso: Math.max(1, Math.min(TOTAL_PASOS, paso)) }));
  }

  // Cuerpos visibles según el sector elegido.
  const cuerposDelSector = useMemo(
    () =>
      state.sector_codigo
        ? cuerpos.filter((c) => c.sector_codigo === state.sector_codigo)
        : [],
    [cuerpos, state.sector_codigo],
  );

  // Especialidades visibles según el cuerpo elegido.
  const especialidadesDelCuerpo = useMemo(
    () =>
      state.cuerpo_id
        ? especialidades.filter((e) => e.cuerpo_id === state.cuerpo_id)
        : [],
    [especialidades, state.cuerpo_id],
  );

  // Si el cuerpo elegido no tiene especialidades, podemos saltar el paso 3.
  const cuerpoSinEspecialidades = state.cuerpo_id !== null && especialidadesDelCuerpo.length === 0;

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
          onChange={(v) => {
            update("cuerpo_id", v);
            update("especialidad_id", null);
          }}
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

      {state.paso >= 4 && (
        <PendientePaso
          paso={state.paso}
          onAtras={() => ir(state.paso - 1)}
        />
      )}
    </div>
  );

  function Paso1Sector({
    sectores,
    valor,
    onChange,
    onSiguiente,
  }: {
    sectores: SectorRow[];
    valor: string | null;
    onChange: (v: string) => void;
    onSiguiente: () => void;
  }) {
    return (
      <PasoLayout titulo="¿En qué sector trabajas como funcionario?">
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
          Solo el sector "Profesorado no universitario" está activo en esta versión inicial. Estamos cargando el resto progresivamente.
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
                  ]
                    .filter(Boolean)
                    .join(" ")}
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

        <NavBotones
          atras={null}
          siguienteHabilitado={!!valor}
          onSiguiente={onSiguiente}
        />
      </PasoLayout>
    );
  }

  function Paso2Cuerpo({
    cuerpos,
    valor,
    onChange,
    onAtras,
    onSiguiente,
  }: {
    cuerpos: CuerpoRow[];
    valor: string | null;
    onChange: (v: string) => void;
    onAtras: () => void;
    onSiguiente: () => void;
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
              {c.codigo_oficial ? `${c.codigo_oficial} · ` : ""}
              {c.denominacion}
              {c.subgrupo ? ` · ${c.subgrupo}` : ""}
            </option>
          ))}
        </select>

        <NavBotones
          atras={onAtras}
          siguienteHabilitado={!!valor}
          onSiguiente={onSiguiente}
        />
      </PasoLayout>
    );
  }

  function Paso3Especialidad({
    especialidades,
    valor,
    onChange,
    onAtras,
    onSiguiente,
  }: {
    especialidades: EspecialidadRow[];
    valor: string | null;
    onChange: (v: string) => void;
    onAtras: () => void;
    onSiguiente: () => void;
  }) {
    const ordenadas = useMemo(
      () =>
        [...especialidades].sort((a, b) =>
          (a.codigo_oficial ?? "").localeCompare(b.codigo_oficial ?? ""),
        ),
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
              {e.codigo_oficial ? `${e.codigo_oficial} · ` : ""}
              {e.denominacion}
            </option>
          ))}
        </select>

        <NavBotones
          atras={onAtras}
          siguienteHabilitado={!!valor}
          onSiguiente={onSiguiente}
        />
      </PasoLayout>
    );
  }

  function PendientePaso({
    paso,
    onAtras,
  }: {
    paso: number;
    onAtras: () => void;
  }) {
    return (
      <PasoLayout titulo={`Paso ${paso} de ${TOTAL_PASOS}`}>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
          Este paso se construirá en la próxima sesión: plaza actual, plazas deseadas en mapa, datos legales, observaciones y confirmación.
        </div>
        <NavBotones atras={onAtras} siguienteHabilitado={false} onSiguiente={() => undefined} />
      </PasoLayout>
    );
  }
}

// ----------------------------------------------------------------------
// Utilidades visuales
// ----------------------------------------------------------------------

function ProgressBar({ paso }: { paso: number }) {
  const pct = Math.round(((paso - 1) / (TOTAL_PASOS - 1)) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Paso {paso} de {TOTAL_PASOS}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-1.5 rounded-full bg-slate-900 dark:bg-slate-100 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PasoLayout({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{titulo}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function NavBotones({
  atras,
  siguienteHabilitado,
  onSiguiente,
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

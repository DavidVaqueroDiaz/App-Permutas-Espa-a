"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  buscarMunicipios,
  expandirAtajos,
  type MunicipioBusqueda,
} from "@/app/anuncios/nuevo/actions";
import {
  buscarCadenasDesdePerfil,
  type DetalleCadena,
  type ParticipanteCadena,
} from "./actions";
import type {
  CcaaRow,
  CuerpoRow,
  EspecialidadRow,
  ProvinciaRow,
  SectorRow,
} from "@/app/anuncios/nuevo/types";

type Props = {
  sectores: SectorRow[];
  cuerpos: CuerpoRow[];
  especialidades: EspecialidadRow[];
  ccaa: CcaaRow[];
  provincias: ProvinciaRow[];
};

type TipoTab = "todas" | "directas" | "tres" | "cuatro";

export function Buscador({
  sectores,
  cuerpos,
  especialidades,
  ccaa,
  provincias,
}: Props) {
  // Solo activos en Fase 1.
  const sectoresActivos = useMemo(
    () => sectores.filter((s) => s.codigo === "docente_loe"),
    [sectores],
  );

  const [sectorCodigo, setSectorCodigo] = useState<string>(
    sectoresActivos[0]?.codigo ?? "",
  );

  const cuerposDelSector = useMemo(
    () => cuerpos.filter((c) => c.sector_codigo === sectorCodigo),
    [cuerpos, sectorCodigo],
  );

  const [cuerpoId, setCuerpoId] = useState<string>("");
  const especialidadesDelCuerpo = useMemo(
    () => especialidades.filter((e) => e.cuerpo_id === cuerpoId),
    [especialidades, cuerpoId],
  );

  const [especialidadId, setEspecialidadId] = useState<string>("");

  // Plaza actual (un único municipio)
  const [muniActual, setMuniActual] = useState<MunicipioBusqueda | null>(null);

  // Plazas deseadas
  const [provDeseadaSel, setProvDeseadaSel] = useState<string>("");
  const [ccaaDeseadaSel, setCcaaDeseadaSel] = useState<string>("");
  const [plazasDeseadas, setPlazasDeseadas] = useState<string[]>([]);
  const [atajosUsados, setAtajosUsados] = useState<
    Array<{ tipo: "ccaa" | "provincia" | "municipio_individual"; valor: string; label: string }>
  >([]);
  const [aplicandoAtajo, setAplicandoAtajo] = useState(false);

  // Resultados
  const [resultados, setResultados] = useState<DetalleCadena[] | null>(null);
  const [totalAnalizados, setTotalAnalizados] = useState(0);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [buscando, startBuscar] = useTransition();
  const [tab, setTab] = useState<TipoTab>("todas");

  function añadirCcaaDeseada() {
    if (!ccaaDeseadaSel) return;
    if (atajosUsados.some((a) => a.tipo === "ccaa" && a.valor === ccaaDeseadaSel)) return;
    setAplicandoAtajo(true);
    const cc = ccaa.find((c) => c.codigo_ine === ccaaDeseadaSel);
    expandirAtajos([{ tipo: "ccaa", valor: ccaaDeseadaSel }]).then((codigos) => {
      const indiv = atajosUsados
        .filter((a) => a.tipo === "municipio_individual")
        .map((a) => a.valor);
      const otros = atajosUsados
        .filter((a) => a.tipo !== "municipio_individual" && a.tipo !== "ccaa");
      const todasCcaa = [
        ...atajosUsados.filter((a) => a.tipo === "ccaa"),
        { tipo: "ccaa" as const, valor: ccaaDeseadaSel, label: cc?.nombre ?? ccaaDeseadaSel },
      ];
      // Re-expandir todo
      Promise.all([
        ...todasCcaa.map((a) => expandirAtajos([{ tipo: "ccaa", valor: a.valor }])),
        ...otros.map((a) => expandirAtajos([{ tipo: "provincia", valor: a.valor }])),
      ])
        .then((listas) => {
          const set = new Set<string>([...listas.flat(), ...indiv]);
          if (muniActual) set.delete(muniActual.codigo_ine);
          setPlazasDeseadas(Array.from(set));
          setAtajosUsados([...todasCcaa, ...otros, ...atajosUsados.filter((a) => a.tipo === "municipio_individual")]);
          setCcaaDeseadaSel("");
        })
        .finally(() => setAplicandoAtajo(false));
      // Suprimir variable no usada
      void codigos;
    });
  }

  function añadirProvDeseada() {
    if (!provDeseadaSel) return;
    if (atajosUsados.some((a) => a.tipo === "provincia" && a.valor === provDeseadaSel)) return;
    setAplicandoAtajo(true);
    const pr = provincias.find((p) => p.codigo_ine === provDeseadaSel);
    const nuevoAtajos = [
      ...atajosUsados,
      { tipo: "provincia" as const, valor: provDeseadaSel, label: pr?.nombre ?? provDeseadaSel },
    ];
    Promise.all(
      nuevoAtajos
        .filter((a) => a.tipo !== "municipio_individual")
        .map((a) =>
          expandirAtajos([
            { tipo: a.tipo as "ccaa" | "provincia", valor: a.valor },
          ]),
        ),
    )
      .then((listas) => {
        const indiv = nuevoAtajos
          .filter((a) => a.tipo === "municipio_individual")
          .map((a) => a.valor);
        const set = new Set<string>([...listas.flat(), ...indiv]);
        if (muniActual) set.delete(muniActual.codigo_ine);
        setPlazasDeseadas(Array.from(set));
        setAtajosUsados(nuevoAtajos);
        setProvDeseadaSel("");
      })
      .finally(() => setAplicandoAtajo(false));
  }

  function añadirMuniIndiv(m: MunicipioBusqueda) {
    if (muniActual && m.codigo_ine === muniActual.codigo_ine) return;
    if (atajosUsados.some((a) => a.tipo === "municipio_individual" && a.valor === m.codigo_ine)) return;
    setAtajosUsados([
      ...atajosUsados,
      {
        tipo: "municipio_individual",
        valor: m.codigo_ine,
        label: `${m.nombre} (${m.provincia_nombre})`,
      },
    ]);
    setPlazasDeseadas(
      Array.from(new Set([...plazasDeseadas, m.codigo_ine])).filter(
        (c) => c !== muniActual?.codigo_ine,
      ),
    );
  }

  async function quitarAtajo(idx: number) {
    setAplicandoAtajo(true);
    try {
      const nuevoAtajos = atajosUsados.filter((_, i) => i !== idx);
      const expansiones = await Promise.all(
        nuevoAtajos
          .filter((a) => a.tipo !== "municipio_individual")
          .map((a) => expandirAtajos([{ tipo: a.tipo as "ccaa" | "provincia", valor: a.valor }])),
      );
      const indiv = nuevoAtajos
        .filter((a) => a.tipo === "municipio_individual")
        .map((a) => a.valor);
      const set = new Set<string>([...expansiones.flat(), ...indiv]);
      if (muniActual) set.delete(muniActual.codigo_ine);
      setAtajosUsados(nuevoAtajos);
      setPlazasDeseadas(Array.from(set));
    } finally {
      setAplicandoAtajo(false);
    }
  }

  function buscar() {
    if (!cuerpoId || !muniActual) {
      setErrorBusqueda("Faltan datos: cuerpo y municipio actual.");
      return;
    }
    if (plazasDeseadas.length === 0) {
      setErrorBusqueda("Indica al menos una zona deseada.");
      return;
    }
    setErrorBusqueda(null);
    startBuscar(async () => {
      const r = await buscarCadenasDesdePerfil({
        cuerpo_id: cuerpoId,
        especialidad_id: especialidadId || null,
        municipio_actual_codigo: muniActual.codigo_ine,
        plazas_deseadas: plazasDeseadas,
        // Defaults razonables para que pase las reglas legales.
        ano_nacimiento: 1985,
        anyos_servicio_totales: 10,
        fecha_toma_posesion_definitiva: "2018-09-01",
        permuta_anterior_fecha: null,
      });
      if (!r.ok) {
        setErrorBusqueda(r.mensaje);
        setResultados(null);
        return;
      }
      setResultados(r.cadenas);
      setTotalAnalizados(r.totalAnunciosAnalizados);
      setTab("todas");
    });
  }

  const cadenasFiltradas = useMemo(() => {
    if (!resultados) return [];
    if (tab === "todas") return resultados;
    if (tab === "directas") return resultados.filter((c) => c.longitud === 2);
    if (tab === "tres") return resultados.filter((c) => c.longitud === 3);
    return resultados.filter((c) => c.longitud === 4);
  }, [resultados, tab]);

  const conteos = useMemo(() => {
    if (!resultados) return { todas: 0, directas: 0, tres: 0, cuatro: 0 };
    return {
      todas: resultados.length,
      directas: resultados.filter((c) => c.longitud === 2).length,
      tres: resultados.filter((c) => c.longitud === 3).length,
      cuatro: resultados.filter((c) => c.longitud === 4).length,
    };
  }, [resultados]);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Columna izquierda: perfil */}
      <aside className="self-start rounded-lg border border-slate-200 bg-white p-5 lg:sticky lg:top-20 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Tu perfil
        </h2>

        <div className="mt-3 space-y-4">
          <Field label="Sector">
            <select
              value={sectorCodigo}
              onChange={(e) => {
                setSectorCodigo(e.target.value);
                setCuerpoId("");
                setEspecialidadId("");
              }}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {sectoresActivos.map((s) => (
                <option key={s.codigo} value={s.codigo}>
                  {s.nombre}
                </option>
              ))}
            </select>
            {sectoresActivos.length < sectores.length && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Otros sectores próximamente.
              </p>
            )}
          </Field>

          <Field label="Cuerpo">
            <select
              value={cuerpoId}
              onChange={(e) => {
                setCuerpoId(e.target.value);
                setEspecialidadId("");
              }}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="">— Selecciona cuerpo —</option>
              {cuerposDelSector
                .slice()
                .sort((a, b) => (a.codigo_oficial ?? "").localeCompare(b.codigo_oficial ?? ""))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo_oficial ? `${c.codigo_oficial} — ` : ""}
                    {c.denominacion}
                  </option>
                ))}
            </select>
          </Field>

          {cuerpoId && especialidadesDelCuerpo.length > 0 && (
            <Field label="Especialidad">
              <select
                value={especialidadId}
                onChange={(e) => setEspecialidadId(e.target.value)}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">— Selecciona especialidad —</option>
                {especialidadesDelCuerpo
                  .slice()
                  .sort((a, b) => (a.codigo_oficial ?? "").localeCompare(b.codigo_oficial ?? ""))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.codigo_oficial ? `${e.codigo_oficial} — ` : ""}
                      {e.denominacion}
                    </option>
                  ))}
              </select>
            </Field>
          )}

          <Field label="Tu plaza actual">
            <Autocomplete
              seleccionado={muniActual}
              onSeleccionar={(m) => setMuniActual(m)}
              onLimpiar={() => setMuniActual(null)}
              placeholder="Empieza a escribir..."
            />
            {muniActual && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Provincia: {muniActual.provincia_nombre}
              </p>
            )}
          </Field>
        </div>

        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Destino deseado
        </h2>

        <div className="mt-3 space-y-3">
          <Field label="Toda una CCAA">
            <div className="flex gap-2">
              <select
                value={ccaaDeseadaSel}
                onChange={(e) => setCcaaDeseadaSel(e.target.value)}
                disabled={aplicandoAtajo}
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">—</option>
                {ccaa
                  .filter((c) => !atajosUsados.some((a) => a.tipo === "ccaa" && a.valor === c.codigo_ine))
                  .map((c) => (
                    <option key={c.codigo_ine} value={c.codigo_ine}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!ccaaDeseadaSel || aplicandoAtajo}
                onClick={añadirCcaaDeseada}
                className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
              >
                +
              </button>
            </div>
          </Field>

          <Field label="Toda una provincia">
            <div className="flex gap-2">
              <select
                value={provDeseadaSel}
                onChange={(e) => setProvDeseadaSel(e.target.value)}
                disabled={aplicandoAtajo}
                className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="">—</option>
                {provincias
                  .filter((p) => !atajosUsados.some((a) => a.tipo === "provincia" && a.valor === p.codigo_ine))
                  .map((p) => (
                    <option key={p.codigo_ine} value={p.codigo_ine}>
                      {p.nombre}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!provDeseadaSel || aplicandoAtajo}
                onClick={añadirProvDeseada}
                className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
              >
                +
              </button>
            </div>
          </Field>

          <Field label="Municipio suelto">
            <Autocomplete
              seleccionado={null}
              onSeleccionar={(m) => añadirMuniIndiv(m)}
              onLimpiar={() => undefined}
              placeholder="Buscar municipio..."
              autoLimpiar
            />
          </Field>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-800 dark:bg-slate-900/50">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              {plazasDeseadas.length}{" "}
              {plazasDeseadas.length === 1 ? "municipio aceptado" : "municipios aceptados"}
            </p>
            {atajosUsados.length === 0 ? (
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Aún no has añadido nada.
              </p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-1">
                {atajosUsados.map((a, i) => (
                  <li
                    key={`${a.tipo}-${a.valor}-${i}`}
                    className={
                      a.tipo === "ccaa"
                        ? "rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200"
                        : a.tipo === "provincia"
                          ? "rounded-full bg-sky-100 px-2 py-0.5 text-[10px] text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
                          : "rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }
                  >
                    {a.tipo === "ccaa" ? `Toda ${a.label}` : a.tipo === "provincia" ? `Toda ${a.label}` : a.label}
                    <button
                      type="button"
                      onClick={() => quitarAtajo(i)}
                      className="ml-1"
                      aria-label="Quitar"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {errorBusqueda && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
            {errorBusqueda}
          </div>
        )}

        <button
          type="button"
          onClick={buscar}
          disabled={buscando}
          className="mt-5 w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 dark:bg-emerald-600"
        >
          {buscando ? "Buscando..." : "Buscar permutas"}
        </button>
      </aside>

      {/* Columna derecha: resultados */}
      <section>
        {resultados === null ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <p>
              Rellena tu perfil a la izquierda y pulsa <strong>Buscar permutas</strong> para ver las cadenas posibles.
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              No necesitas estar registrado para buscar. Solo para añadir tu propio anuncio.
            </p>
          </div>
        ) : (
          <>
            <header className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  {resultados.length}{" "}
                  {resultados.length === 1 ? "cadena detectada" : "cadenas detectadas"}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {totalAnalizados} anuncios analizados
                </p>
              </div>
            </header>

            <div className="mb-4 flex flex-wrap gap-2">
              <Tab activa={tab === "todas"} onClick={() => setTab("todas")} label={`Todas (${conteos.todas})`} />
              <Tab activa={tab === "directas"} onClick={() => setTab("directas")} label={`Directas (${conteos.directas})`} />
              <Tab activa={tab === "tres"} onClick={() => setTab("tres")} label={`Cadenas a 3 (${conteos.tres})`} />
              <Tab activa={tab === "cuatro"} onClick={() => setTab("cuatro")} label={`Cadenas a 4 (${conteos.cuatro})`} />
            </div>

            {cadenasFiltradas.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                No hay cadenas en esta categoría.
              </div>
            ) : (
              <ul className="space-y-4">
                {cadenasFiltradas.map((c) => (
                  <CadenaCard key={c.huella} cadena={c} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}

// ----------------------------------------------------------------------
// Subcomponentes
// ----------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Tab({
  activa,
  onClick,
  label,
}: {
  activa: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-3 py-1.5 text-sm font-medium transition " +
        (activa
          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700")
      }
    >
      {label}
    </button>
  );
}

function inicialesMunicipio(nombre: string): string {
  const palabras = nombre.split(/\s+/).filter(Boolean);
  if (palabras.length === 1) return palabras[0].slice(0, 1).toUpperCase();
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
}

function CadenaCard({ cadena }: { cadena: DetalleCadena }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
            {cadena.longitud === 2
              ? "Permuta directa"
              : `${cadena.participantes.length} personas`}
          </span>
        </div>
      </div>

      {/* Visualización gráfica de la cadena */}
      <div className="mb-4 flex items-center justify-start gap-2 overflow-x-auto py-2">
        {cadena.participantes.map((p, i) => {
          const ultimo = i === cadena.participantes.length - 1;
          return (
            <div key={p.anuncio_id} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className={
                    "flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shadow-sm " +
                    (p.es_perfil_busqueda
                      ? "bg-emerald-700 text-white ring-2 ring-emerald-300 dark:bg-emerald-600 dark:ring-emerald-400"
                      : "bg-slate-700 text-white dark:bg-slate-600")
                  }
                  title={p.municipio_actual_nombre}
                >
                  {inicialesMunicipio(p.municipio_actual_nombre)}
                </div>
                <span className="mt-1 max-w-[80px] truncate text-center text-[10px] text-slate-700 dark:text-slate-300">
                  {p.municipio_actual_nombre}
                </span>
              </div>
              {!ultimo && (
                <span className="text-2xl text-slate-400 dark:text-slate-500">→</span>
              )}
              {ultimo && cadena.participantes.length > 1 && (
                <span className="text-2xl text-slate-400 dark:text-slate-500">↺</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Lista detallada de participantes */}
      <ul className="space-y-2">
        {cadena.participantes.map((p) => (
          <ParticipanteFila key={p.anuncio_id} p={p} />
        ))}
      </ul>

      {/* Barra de compatibilidad */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Compatibilidad</span>
          <span>{cadena.compatibilidad}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className="h-1.5 rounded-full bg-emerald-600"
            style={{ width: `${cadena.compatibilidad}%` }}
          />
        </div>
      </div>
    </li>
  );
}

function ParticipanteFila({ p }: { p: ParticipanteCadena }) {
  return (
    <li
      className={
        "rounded-md border p-3 text-sm " +
        (p.es_perfil_busqueda
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
          : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50")
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {p.es_perfil_busqueda ? "TÚ" : p.alias_publico}
          </span>
          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
            {p.municipio_actual_nombre}
            {p.provincia_nombre && ` · ${p.provincia_nombre}`}
          </span>
        </div>
        {!p.es_perfil_busqueda && p.contacto_disponible && (
          <button
            type="button"
            disabled
            className="rounded-md bg-emerald-700 px-3 py-1 text-xs font-medium text-white opacity-70"
            title="La mensajería interna llegará en próximos bloques."
          >
            Contactar
          </button>
        )}
        {!p.es_perfil_busqueda && !p.contacto_disponible && (
          <a
            href="/registro"
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Regístrate para contactar
          </a>
        )}
      </div>
      {p.observaciones && (
        <p className="mt-2 text-xs italic text-slate-600 dark:text-slate-400">
          “{p.observaciones}”
        </p>
      )}
    </li>
  );
}

function Autocomplete({
  seleccionado,
  onSeleccionar,
  onLimpiar,
  placeholder,
  autoLimpiar,
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
      const r = await buscarMunicipios(query, 10);
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
      <div className="flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
        <span className="text-sm text-slate-900 dark:text-slate-100">{seleccionado.nombre}</span>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            onLimpiar();
          }}
          className="text-xs text-slate-500 underline dark:text-slate-400"
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
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
      {abierto && (resultados.length > 0 || buscando) && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {buscando && <li className="px-3 py-1.5 text-xs text-slate-500">Buscando...</li>}
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
                className="flex w-full justify-between px-3 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>{m.nombre}</span>
                <span className="text-slate-500">{m.provincia_nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

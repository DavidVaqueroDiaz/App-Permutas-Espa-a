"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import {
  buscarCadenasDesdePerfil,
  type DetalleCadena,
  type ParticipanteCadena,
} from "./actions";
import { iniciarConversacionDesdeAnuncio } from "@/app/mensajes/actions";
import type {
  CuerpoRow,
  EspecialidadRow,
  SectorRow,
  ServicioSaludRow,
} from "@/app/anuncios/nuevo/types";

// Carga perezosa del mapa: pesa ~700 KB gzip y solo se necesita cuando
// el usuario abre el modal de selección visual.
const MapaSelectorMunicipios = dynamic(
  () =>
    import("@/components/MapaSelectorMunicipios").then(
      (m) => m.MapaSelectorMunicipios,
    ),
  { ssr: false },
);

type MunicipioLocal = {
  codigo_ine: string;
  nombre: string;
  provincia_nombre: string;
};

type CcaaLocal = { codigo_ine: string; nombre: string };
type ProvinciaLocal = { codigo_ine: string; ccaa_codigo: string };

type Props = {
  sectores: SectorRow[];
  cuerpos: CuerpoRow[];
  especialidades: EspecialidadRow[];
  serviciosSalud: ServicioSaludRow[];
  municipios: MunicipioLocal[];
  ccaa: CcaaLocal[];
  provincias: ProvinciaLocal[];
};

// Normaliza para búsqueda por nombre: lowercase, sin tildes, sin signos.
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Quita artículos antepuestos ("A Coruña") o pospuestos ("Coruña, A").
 * IMPORTANTE: la cadena ya debe estar normalizada — la coma se ha
 * convertido en espacio.
 */
function quitarArticulo(s: string): string {
  return s
    .replace(/^(a|o|as|os|el|la|los|las)\s+/, "")
    .replace(/\s+(a|o|as|os|el|la|los|las)$/, "");
}

/**
 * Clave canónica para comparar nombres de municipio sin importar el
 * orden del artículo: "A Coruña", "Coruña, A" y "coruña" → "coruna".
 */
function clave(s: string): string {
  return quitarArticulo(normalizar(s));
}

type TipoTab = "todas" | "directas" | "tres" | "cuatro";

export function Buscador({
  sectores,
  cuerpos,
  especialidades,
  serviciosSalud,
  municipios,
  ccaa,
  provincias,
}: Props) {
  // Índice rápido para reconstruir un MunicipioLocal a partir de un
  // codigo_ine cuando el usuario selecciona uno desde el mapa.
  const muniPorCodigo = useMemo(
    () => new Map(municipios.map((m) => [m.codigo_ine, m])),
    [municipios],
  );

  // Mapping provincia → CCAA para arrancar el mapa en una CCAA tiene
  // sentido (la del muni actual del usuario, si lo tiene seleccionado).
  const ccaaDeProv = useMemo(
    () => new Map(provincias.map((p) => [p.codigo_ine, p.ccaa_codigo])),
    [provincias],
  );
  const sectoresActivos = useMemo(
    () => sectores.filter((s) =>
      s.codigo === "docente_loe" ||
      s.codigo === "sanitario_sns" ||
      s.codigo === "funcionario_age" ||
      s.codigo === "funcionario_ccaa" ||
      s.codigo === "funcionario_local" ||
      s.codigo === "habilitado_nacional" ||
      s.codigo === "policia_local"
    ),
    [sectores],
  );

  const [sectorCodigo, setSectorCodigo] = useState<string>(
    sectoresActivos[0]?.codigo ?? "",
  );
  const esSns = sectorCodigo === "sanitario_sns";
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
  // Solo aplica a SNS. La regla SNS exige mismo Servicio de Salud para
  // que dos anuncios puedan permutar.
  const [servicioSaludCodigo, setServicioSaludCodigo] = useState<string>("");

  // Plaza actual: un solo municipio.
  const [muniActual, setMuniActual] = useState<MunicipioLocal | null>(null);

  // Localidades objetivo: lista. La búsqueda devuelve cualquier cadena
  // que toque un municipio dentro del radio de cualquiera de estas.
  const [munisObjetivo, setMunisObjetivo] = useState<MunicipioLocal[]>([]);

  // Modal del mapa visual: indica qué campo está seleccionando el
  // usuario ("actual" o "objetivo") o null si está cerrado.
  const [mapaPara, setMapaPara] = useState<null | "actual" | "objetivo">(null);

  /**
   * Toggle desde el mapa visual. Para "actual" siempre seleccionamos
   * uno (single mode). Para "objetivo" hacemos toggle (multi mode).
   * Resolvemos a un MunicipioLocal completo (con provincia) usando el
   * índice precargado.
   */
  function onMapaToggle(codigoIne: string, isAdding: boolean, nombre: string) {
    const m: MunicipioLocal = muniPorCodigo.get(codigoIne) ?? {
      codigo_ine: codigoIne,
      nombre,
      provincia_nombre: "",
    };
    if (mapaPara === "actual") {
      setMuniActual(m);
      return;
    }
    if (mapaPara === "objetivo") {
      if (isAdding) {
        setMunisObjetivo((prev) =>
          prev.some((x) => x.codigo_ine === codigoIne) ? prev : [...prev, m],
        );
      } else {
        setMunisObjetivo((prev) => prev.filter((x) => x.codigo_ine !== codigoIne));
      }
    }
  }

  function añadirObjetivo(m: MunicipioLocal) {
    setMunisObjetivo((prev) =>
      prev.some((x) => x.codigo_ine === m.codigo_ine) ? prev : [...prev, m],
    );
  }
  function quitarObjetivo(codigoIne: string) {
    setMunisObjetivo((prev) => prev.filter((x) => x.codigo_ine !== codigoIne));
  }

  // CCAA inicial del mapa en función del campo: si el usuario ya tiene
  // muni actual definido, arrancamos por esa CCAA.
  const ccaaInicialMapa = useMemo(() => {
    if (mapaPara === "objetivo" && munisObjetivo.length > 0) {
      const provCod = munisObjetivo[0].codigo_ine.slice(0, 2);
      return ccaaDeProv.get(provCod);
    }
    if (muniActual) {
      const provCod = muniActual.codigo_ine.slice(0, 2);
      return ccaaDeProv.get(provCod);
    }
    return undefined;
  }, [mapaPara, muniActual, munisObjetivo, ccaaDeProv]);

  // Radio en km
  const [radio, setRadio] = useState<number>(40);

  // Resultados
  const [resultados, setResultados] = useState<DetalleCadena[] | null>(null);
  const [totalAnalizados, setTotalAnalizados] = useState(0);
  const [municiposEnRadio, setMunicipiosEnRadio] = useState(0);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [buscando, startBuscar] = useTransition();
  const [tab, setTab] = useState<TipoTab>("todas");

  // Limpiar el aviso "Faltan datos..." en cuanto el usuario cambia
  // cualquier dato del perfil — así no queda colgado mientras se
  // rellenan los campos uno a uno tras un primer click fallido.
  useEffect(() => {
    if (errorBusqueda) setErrorBusqueda(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuerpoId, especialidadId, muniActual, munisObjetivo.length]);

  function buscar() {
    if (!cuerpoId || !muniActual || munisObjetivo.length === 0) {
      setErrorBusqueda(
        "Faltan datos: cuerpo, plaza actual y al menos una localidad objetivo.",
      );
      return;
    }
    if (esSns && !servicioSaludCodigo) {
      setErrorBusqueda(
        "En sanidad necesitamos saber tu Servicio de Salud (las permutas son intra-servicio).",
      );
      return;
    }
    setErrorBusqueda(null);
    startBuscar(async () => {
      const r = await buscarCadenasDesdePerfil({
        cuerpo_id: cuerpoId,
        especialidad_id: especialidadId || null,
        servicio_salud_codigo: esSns ? servicioSaludCodigo : null,
        municipio_actual_codigo: muniActual.codigo_ine,
        municipios_objetivo_codigos: munisObjetivo.map((m) => m.codigo_ine),
        radio_km: radio,
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
      setMunicipiosEnRadio(r.municipios_en_radio);
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
      <aside className="self-start rounded-xl2 border border-slate-200 bg-white shadow-card p-5 lg:sticky lg:top-20">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                setServicioSaludCodigo("");
              }}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              {sectoresActivos.map((s) => (
                <option key={s.codigo} value={s.codigo}>
                  {s.nombre}
                </option>
              ))}
            </select>
            {sectorCodigo === "policia_local" && (
              <p className="mt-1 text-xs text-warn-text">
                Solo regulado en Andalucía, Aragón, Baleares, C. Valenciana y Galicia.
              </p>
            )}
            {sectorCodigo === "funcionario_ccaa" && (
              <p className="mt-1 text-xs text-warn-text">
                Permuta intra-CCAA: solo cruzamos anuncios de tu propia comunidad.
              </p>
            )}
          </Field>

          {esSns && (
            <Field label="Servicio de Salud">
              <select
                value={servicioSaludCodigo}
                onChange={(e) => setServicioSaludCodigo(e.target.value)}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
              >
                <option value="">— Selecciona servicio —</option>
                {serviciosSalud.map((s) => (
                  <option key={s.codigo} value={s.codigo}>
                    {s.nombre_corto} · {s.nombre_oficial}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Las permutas SNS son <strong>intra-servicio</strong>: solo
                cruzamos anuncios del mismo organismo.
              </p>
            </Field>
          )}

          <Field label={esSns ? "Categoría" : "Cuerpo"}>
            <select
              value={cuerpoId}
              onChange={(e) => {
                setCuerpoId(e.target.value);
                setEspecialidadId("");
              }}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
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

          {/*
            Especialidad SIEMPRE renderizada para evitar el "layout
            shift" cuando el usuario elige un cuerpo. Cuando aún no hay
            cuerpo, queda en disabled con un texto guía. Mismo alto que
            cualquier otro select.
          */}
          <Field label="Especialidad">
            <select
              value={especialidadId}
              onChange={(e) => setEspecialidadId(e.target.value)}
              disabled={!cuerpoId || especialidadesDelCuerpo.length === 0}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            >
              {!cuerpoId ? (
                <option value="">— Primero elige un cuerpo —</option>
              ) : especialidadesDelCuerpo.length === 0 ? (
                <option value="">— Este cuerpo no tiene especialidades —</option>
              ) : (
                <>
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
                </>
              )}
            </select>
          </Field>

          <Field label="Tu plaza actual">
            <Autocomplete
              seleccionado={muniActual}
              onSeleccionar={(m) => setMuniActual(m)}
              onLimpiar={() => setMuniActual(null)}
              placeholder="Ej: Madrid, Vigo, Sevilla..."
              municipios={municipios}
            />
            <button
              type="button"
              onClick={() => setMapaPara("actual")}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-text hover:text-brand"
            >
              🗺 Seleccionar en el mapa
            </button>
            {muniActual && (
              <p className="mt-1 text-xs text-slate-500">
                Provincia: {muniActual.provincia_nombre}
              </p>
            )}
          </Field>
        </div>

        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Destino deseado
        </h2>

        <div className="mt-3 space-y-3">
          <Field label="Localidades objetivo (puedes añadir varias)">
            <Autocomplete
              seleccionado={null}
              onSeleccionar={(m) => añadirObjetivo(m)}
              onLimpiar={() => undefined}
              placeholder="Ej: Zaragoza, Calatayud, Daroca..."
              municipios={municipios}
              autoLimpiar
            />
            <button
              type="button"
              onClick={() => setMapaPara("objetivo")}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-text hover:text-brand"
            >
              🗺 Seleccionar en el mapa
            </button>
            {munisObjetivo.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {munisObjetivo.map((m) => (
                  <span
                    key={m.codigo_ine}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-bg px-2 py-0.5 text-[11px] font-medium text-brand-text"
                  >
                    {m.nombre}
                    <button
                      type="button"
                      onClick={() => quitarObjetivo(m.codigo_ine)}
                      aria-label={`Quitar ${m.nombre}`}
                      className="text-brand hover:text-brand-dark"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Field label={`Radio máximo: ${radio} km`}>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={radio}
              onChange={(e) => setRadio(Number.parseInt(e.target.value, 10))}
              className="block w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>10 km</span>
              <span>100 km</span>
            </div>
          </Field>
        </div>

        {errorBusqueda && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            {errorBusqueda}
          </div>
        )}

        <button
          type="button"
          onClick={buscar}
          disabled={buscando}
          className="mt-5 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {buscando ? "Buscando..." : "Buscar permutas"}
        </button>
      </aside>

      <section>
        {resultados === null ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-600">
            <p>
              Define tu perfil a la izquierda y pulsa <strong>Buscar permutas</strong> para ver las cadenas posibles.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Las plazas que te ofrecemos son las que están dentro del radio que indiques alrededor de tu localidad objetivo.
            </p>
          </div>
        ) : (
          <>
            <header className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-head text-2xl font-semibold tracking-tight text-brand">
                  {resultados.length}{" "}
                  {resultados.length === 1 ? "cadena detectada" : "cadenas detectadas"}
                </h2>
                <p className="text-sm text-slate-600">
                  {totalAnalizados} anuncios analizados
                  {munisObjetivo.length > 0 &&
                    ` · ${municiposEnRadio} municipios en ${radio} km de ${
                      munisObjetivo.length === 1
                        ? munisObjetivo[0].nombre
                        : `${munisObjetivo.length} localidades objetivo`
                    }`}
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
              totalAnalizados === 0 ? (
                // Caso 1: cero anuncios analizados = no hay nadie en
                // su combo (sector/cuerpo/especialidad/servicio salud).
                // Es el caso mas comun en alfa fuera de docencia LOE.
                <div className="rounded-xl2 border border-slate-200 bg-white shadow-card p-6 text-sm">
                  <p className="font-head text-base font-semibold text-slate-900">
                    🌱 Eres el primero en tu perfil
                  </p>
                  <p className="mt-2 text-slate-600">
                    De momento <strong>no hay otros anuncios</strong> con tu
                    misma combinación de sector, cuerpo y (si aplica)
                    especialidad o servicio de salud. Esto es lo que pasa en
                    alfa cuando no se han registrado aún usuarios de tu sector.
                  </p>
                  <p className="mt-3 text-slate-700">
                    <strong>Lo que puedes hacer:</strong>
                  </p>
                  <ul className="mt-2 space-y-2 text-slate-700">
                    <li>
                      📝{" "}
                      <a
                        href="/registro"
                        className="font-medium text-brand-text hover:text-brand"
                      >
                        Publica tu anuncio
                      </a>{" "}
                      — quedas guardado y te avisamos por email en cuanto
                      aparezca alguien compatible.
                    </li>
                    <li>
                      💌{" "}
                      <a
                        href="/contacto"
                        className="font-medium text-brand-text hover:text-brand"
                      >
                        Compártela con compañeros
                      </a>{" "}
                      del mismo cuerpo. Cuanto antes haya 2-3 anuncios de tu
                      perfil, antes empezará a haber matches.
                    </li>
                  </ul>
                </div>
              ) : (
                // Caso 2: hay anuncios analizados pero ninguno encaja
                // en cadena (el caso original).
                <div className="rounded-xl2 border border-slate-200 bg-white shadow-card p-6 text-sm">
                  <p className="font-head text-base font-semibold text-slate-900">
                    Aún no hay cadenas para esta búsqueda
                  </p>
                  <p className="mt-2 text-slate-600">
                    Hemos analizado{" "}
                    <strong>{totalAnalizados} anuncios</strong> compatibles con
                    tu perfil profesional
                    {munisObjetivo.length > 0 && (
                      <>
                        , dentro de{" "}
                        <strong>{municiposEnRadio} municipios</strong> en {radio}{" "}
                        km de tus localidades objetivo
                      </>
                    )}
                    . Ninguno encaja en una cadena directa, a 3 o a 4.
                  </p>
                  <ul className="mt-4 space-y-2 text-slate-700">
                    <li>
                      💡 <strong>Amplía el radio</strong> a 60-100 km — quizás
                      haya plazas cerca que no conocías.
                    </li>
                    <li>
                      🗺{" "}
                      <strong>Añade más localidades objetivo</strong> — cuantas
                      más, más probabilidad de encajar en una cadena.
                    </li>
                    <li>
                      📝{" "}
                      <a
                        href="/registro"
                        className="font-medium text-brand-text hover:text-brand"
                      >
                        Publica tu propio anuncio
                      </a>{" "}
                      — te avisaremos por email cuando aparezca una cadena con
                      tu perfil.
                    </li>
                  </ul>
                  <p className="mt-4 text-xs text-slate-500">
                    Estamos en alfa con datos iniciales (importación de
                    PermutaDoc, principalmente Galicia). El catálogo crecerá
                    conforme se publiquen anuncios reales.
                  </p>
                </div>
              )
            ) : (
              <ul className="space-y-4">
                {cadenasFiltradas.map((c, i) => (
                  <CadenaCard key={c.huella} cadena={c} mejor={i === 0} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* Modal con el mapa visual (modo single: click selecciona uno y cierra) */}
      {mapaPara && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-sm">
          <div className="m-2 flex flex-1 flex-col overflow-hidden rounded-xl2 border border-slate-200 bg-white shadow-card md:m-6 md:max-w-6xl md:self-center md:w-full">
            <MapaSelectorMunicipios
              mode={mapaPara === "actual" ? "single" : "multi"}
              ccaaOpciones={ccaa}
              ccaaInicial={ccaaInicialMapa}
              seleccionados={
                new Set(
                  mapaPara === "actual"
                    ? muniActual
                      ? [muniActual.codigo_ine]
                      : []
                    : munisObjetivo.map((m) => m.codigo_ine),
                )
              }
              excluidos={
                // Si estás eligiendo el objetivo, excluimos tu plaza
                // actual (no quieres seleccionar tu propia plaza como
                // destino). Si estás eligiendo la actual, no excluimos
                // los objetivos: cambiar tu plaza actual no debería
                // estar limitado por dónde quieres ir.
                mapaPara === "objetivo" && muniActual
                  ? new Set([muniActual.codigo_ine])
                  : undefined
              }
              onToggle={onMapaToggle}
              onCerrar={() => setMapaPara(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700">
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
          ? "bg-brand text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200")
      }
    >
      {label}
    </button>
  );
}

/**
 * Iniciales para mostrar dentro del círculo del nodo. Si el municipio
 * tiene una sola palabra usamos la primera letra; si tiene varias,
 * primera y última.
 */
function inicialesMunicipio(nombre: string): string {
  const palabras = nombre.split(/\s+/).filter(Boolean);
  if (palabras.length === 1) return palabras[0].slice(0, 1).toUpperCase();
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase();
}

/**
 * Etiqueta humana del tipo de permuta, normalizada a castellano.
 * Acepta los valores que vienen importados de PermutaDoc.
 */
function etiquetaTipo(t: string | null): string {
  if (!t) return "—";
  const v = t.toLowerCase().trim();
  if (v === "cxt" || v === "definitiva") return "Definitiva";
  if (v === "provisional") return "Provisional";
  if (v === "ambas") return "Ambas";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function diasDesde(fechaIso: string | null): number {
  if (!fechaIso) return 0;
  const d = new Date(fechaIso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

/**
 * Tarjeta principal de una cadena detectada. Replica la estructura del
 * `ResultCard` de PermutaDoc: cabecera con ruta y compatibilidad,
 * diagrama de cadena cerrada, lista descriptiva de movimientos y
 * detalle de cada participante (excluyéndote).
 */
function CadenaCard({ cadena, mejor }: { cadena: DetalleCadena; mejor: boolean }) {
  const score = cadena.compatibilidad;
  const longitudLabel =
    cadena.longitud === 2
      ? "Permuta directa"
      : cadena.longitud === 3
        ? "Permuta a 3"
        : "Permuta a 4";

  // Cierre del ciclo en el título: "Sobrado → Arteixo → Ferrol → Sobrado".
  const tituloRuta = [
    ...cadena.participantes.map((p) => p.municipio_actual_nombre),
    cadena.participantes[0]?.municipio_actual_nombre ?? "",
  ].join(" → ");

  // En el grid de detalle excluimos al usuario (siempre el primero).
  const otros = cadena.participantes.slice(1);

  return (
    <article className="space-y-4 rounded-xl2 border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-card-hover sm:p-5 sm:space-y-5 md:p-6">
      {mejor && (
        <div className="-ml-1 -mt-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-medium text-white">
            ★ Mejor coincidencia
          </span>
        </div>
      )}

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            {longitudLabel}
          </div>
          <h3 className="font-head text-sm font-semibold leading-snug text-slate-800 sm:text-base">
            {tituloRuta}
          </h3>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-head text-xl font-semibold leading-none text-brand sm:text-2xl">
            {score}
            <span className="text-xs text-brand-light sm:text-sm">%</span>
          </div>
          <div className="text-[10.5px] text-slate-500">compatibilidad</div>
        </div>
      </header>

      <Chain participantes={cadena.participantes} />

      <Movimientos participantes={cadena.participantes} />

      {otros.length > 0 && (
        <div>
          <h4 className="mb-2 font-head text-sm font-semibold text-slate-800">
            Detalles de los participantes
          </h4>
          <div className={`grid gap-3 ${otros.length > 2 ? "md:grid-cols-2" : ""}`}>
            {otros.map((p, idx) => (
              <ParticipanteDetalle
                key={p.anuncio_id}
                participante={p}
                indice={idx + 2}
              />
            ))}
          </div>
        </div>
      )}

      <footer>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Compatibilidad</span>
          <span>{score}%</span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-light to-brand transition-all"
            style={{ width: `${score}%` }}
          />
        </div>
      </footer>
    </article>
  );
}

/**
 * Diagrama horizontal con círculos, cerrando el ciclo (repite el
 * primer nodo al final). Etiqueta encima ("TÚ" / "Persona N").
 *
 * Padding generoso (py-3) y `overflow-x-auto` con `-mx-1 px-1` para
 * que el ring del círculo del usuario no se corte por arriba.
 */
function Chain({ participantes }: { participantes: ParticipanteCadena[] }) {
  if (participantes.length < 2) return null;
  const cerrada = [...participantes, participantes[0]];

  return (
    <div className="-mx-1 flex items-end gap-0.5 overflow-x-auto px-1 py-3 sm:gap-1">
      {cerrada.map((p, i) => {
        const esUsuario = i === 0 || i === cerrada.length - 1;
        const etiqueta = esUsuario ? "TÚ" : `Persona ${i + 1}`;
        return (
          <div key={i} className="flex shrink-0 items-end gap-0.5 sm:gap-1">
            <div className="flex w-[68px] flex-col items-center gap-1 sm:w-[100px]">
              <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500 sm:text-[10px]">
                {etiqueta}
              </span>
              <div
                className={
                  "flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold sm:h-12 sm:w-12 sm:text-sm " +
                  (esUsuario
                    ? "bg-brand text-white ring-2 ring-brand/20"
                    : "bg-brand-bg text-brand-text ring-2 ring-brand-mint/30")
                }
                title={p.municipio_actual_nombre}
              >
                {inicialesMunicipio(p.municipio_actual_nombre)}
              </div>
              {/*
                Reservamos 2 líneas siempre (min-h-[2.5em] con leading-tight)
                para que cuando un municipio ocupe 2 líneas (p.ej. "Barco
                de Valdeorras, O") las columnas no queden a distinta altura
                y los círculos sigan alineados con `items-end` arriba.
              */}
              <span className="line-clamp-2 min-h-[2.5em] text-center text-[10px] font-medium leading-tight text-slate-700 sm:text-[11px]">
                {p.municipio_actual_nombre}
              </span>
            </div>
            {i < cerrada.length - 1 && (
              <span className="select-none pb-6 text-base text-slate-300 sm:pb-7 sm:text-xl">
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Lista descriptiva de cada movimiento de la cadena. Para cada nodo
 * indicamos quién deja qué plaza y a dónde va. El último item marca
 * "(tu plaza)" porque ahí se cierra el ciclo.
 */
function Movimientos({ participantes }: { participantes: ParticipanteCadena[] }) {
  if (participantes.length < 2) return null;
  const k = participantes.length;
  return (
    <div>
      <h4 className="mb-2 font-head text-sm font-semibold text-slate-800">
        Los movimientos de la permuta
      </h4>
      <ul className="space-y-2">
        {participantes.map((p, i) => {
          const siguiente = participantes[(i + 1) % k];
          const esUsuario = i === 0;
          const esUltimo = i === k - 1;
          return (
            <li
              key={p.anuncio_id}
              className="flex items-start gap-2.5 text-[13.5px] leading-relaxed"
            >
              <span
                className={
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                  (esUsuario ? "bg-brand" : "bg-info-text")
                }
              />
              <span className="text-slate-700">
                <strong className={esUsuario ? "text-brand" : "text-info-text"}>
                  {esUsuario ? "Tú" : `Persona ${i + 1}`}
                </strong>{" "}
                {esUsuario ? "dejas" : "deja"}{" "}
                <strong className="text-slate-900">{p.municipio_actual_nombre}</strong>
                {p.centro_origen ? ` (${p.centro_origen})` : ""} y{" "}
                {esUsuario ? "vas" : "va"} a{" "}
                <strong className="text-slate-900">{siguiente.municipio_actual_nombre}</strong>
                {esUltimo && (
                  <span className="text-slate-500"> (tu plaza)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Tarjeta de detalle de un participante (excluyendo al usuario).
 * Muestra centro, tipo, zona buscada, observaciones, fecha del anuncio
 * y distancia en línea recta entre su plaza y la del usuario buscador.
 */
function ParticipanteDetalle({
  participante: p,
  indice,
}: {
  participante: ParticipanteCadena;
  indice: number;
}) {
  const dias = diasDesde(p.fecha_publicacion);
  const antiguo = dias > 30;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-slate-800">
          Persona {indice} · {p.municipio_actual_nombre}
          {p.provincia_nombre ? ` · ${p.provincia_nombre}` : ""}
        </div>
        {antiguo && (
          <span className="whitespace-nowrap rounded-full bg-warn-bg px-2 py-0.5 text-[10.5px] text-warn-text">
            ⚠ Anuncio con más de 30 días
          </span>
        )}
      </div>
      <ul className="space-y-1 text-[12.5px] leading-snug text-slate-700">
        <li>
          🏫 <span className="text-slate-500">Centro:</span> {p.centro_origen ?? "—"}
        </li>
        <li>
          📋 <span className="text-slate-500">Tipo:</span> {etiquetaTipo(p.tipo)}
        </li>
        <li>
          🎯 <span className="text-slate-500">Busca:</span>{" "}
          {p.zona_deseada ?? "—"}
        </li>
        {p.observaciones && (
          <li>
            📝 <span className="text-slate-500">Obs.:</span> {p.observaciones}
          </li>
        )}
        <li>
          📅 <span className="text-slate-500">Anuncio del:</span>{" "}
          {p.fecha_publicacion ?? "—"}
        </li>
        {p.km_recta !== null && (
          <li className="italic text-slate-500">
            {Math.round(p.km_recta)} km de {p.municipio_actual_nombre} a{" "}
            {p.municipio_destino_nombre} en línea recta
          </li>
        )}
      </ul>

      {/* Avisos legales personales: solo si hay alguno detectado */}
      {p.avisos_legales.length > 0 && (
        <div className="mt-3 rounded-md border border-warn-text/30 bg-warn-bg p-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-warn-text">
            ⚠ Verificar antes de tramitar
          </p>
          <ul className="mt-1.5 space-y-1 text-[11.5px] leading-snug text-warn-text">
            {p.avisos_legales.map((av, i) => (
              <li key={i}>
                <strong>{av.titulo}.</strong>{" "}
                <span className="opacity-90">{av.detalle}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.contacto_disponible ? (
        <BotonContactar anuncioId={p.anuncio_id} />
      ) : (
        <a
          href="/registro"
          className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-text hover:text-brand"
        >
          Regístrate para contactar →
        </a>
      )}
    </div>
  );
}

/**
 * Botón "Contactar" que abre (o crea) una conversación 1-on-1 con el
 * dueño del anuncio indicado y redirige a `/mensajes/[id]`. Si no es
 * posible (p.ej. el buscador aún no ha publicado un anuncio propio en
 * la misma especialidad) muestra el mensaje de error inline.
 */
function BotonContactar({ anuncioId }: { anuncioId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function abrir() {
    setError(null);
    startTransition(async () => {
      const r = await iniciarConversacionDesdeAnuncio(anuncioId);
      if (!r.ok) {
        setError(r.mensaje);
        return;
      }
      window.location.href = `/mensajes/${r.conversacion_id}`;
    });
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={abrir}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1 text-[12.5px] font-medium text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Abriendo…" : "Contactar →"}
      </button>
      {error && (
        <p className="mt-1.5 text-[11.5px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Autocompletado local (sin llamadas al servidor). Recibe la lista
 * completa de municipios precargada y filtra en memoria al instante.
 * Soporta navegación por teclado (↑ ↓ Enter Esc).
 */
function Autocomplete({
  seleccionado,
  onSeleccionar,
  onLimpiar,
  placeholder,
  municipios,
  autoLimpiar = false,
}: {
  seleccionado: MunicipioLocal | null;
  onSeleccionar: (m: MunicipioLocal) => void;
  onLimpiar: () => void;
  placeholder?: string;
  municipios: MunicipioLocal[];
  /**
   * Si está activo, al seleccionar un municipio el input se vacía
   * en vez de quedarse con el nombre. Útil para campos multi-select
   * donde la siguiente acción es añadir otro.
   */
  autoLimpiar?: boolean;
}) {
  const [query, setQuery] = useState(seleccionado?.nombre ?? "");
  const [abierto, setAbierto] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // Sincroniza el query mostrado con el seleccionado externo.
  useEffect(() => {
    setQuery(seleccionado?.nombre ?? "");
  }, [seleccionado]);

  const sugerencias = useMemo(() => {
    const q = clave(query);
    if (!q) return municipios.slice(0, 8);
    // Comparamos sin artículo, así "a coru" encuentra "Coruña, A"
    // y "coru" también encuentra "A Coruña" o "Coruña, A".
    return municipios
      .filter((m) => clave(m.nombre).includes(q))
      .slice(0, 12);
  }, [query, municipios]);

  function seleccionar(m: MunicipioLocal) {
    onSeleccionar(m);
    setQuery(autoLimpiar ? "" : m.nombre);
    setAbierto(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!abierto) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setAbierto(true);
        return;
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, sugerencias.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const m = sugerencias[highlight];
      if (m) seleccionar(m);
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
          setHighlight(0);
          if (seleccionado) onLimpiar();
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={onKeyDown}
        className="block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
      />
      {abierto && sugerencias.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {sugerencias.map((m, i) => (
            <li key={m.codigo_ine}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionar(m)}
                onMouseEnter={() => setHighlight(i)}
                className={
                  "flex w-full justify-between px-3 py-1.5 text-left text-xs " +
                  (i === highlight
                    ? "bg-brand-bg text-brand-text"
                    : "hover:bg-slate-100")
                }
              >
                <span className="font-medium text-slate-900">{m.nombre}</span>
                <span className="text-slate-500">{m.provincia_nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

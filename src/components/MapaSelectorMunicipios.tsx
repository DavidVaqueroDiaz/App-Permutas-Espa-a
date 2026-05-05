"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";

// Nota: el CSS de maplibre-gl se importa ahora globalmente en layout.tsx
// para asegurar que esté presente antes del render del canvas.

export type CcaaOpcion = { codigo_ine: string; nombre: string };

type Props = {
  /** "single" → click selecciona uno y cierra. "multi" → click hace toggle. */
  mode: "single" | "multi";
  /** Lista de CCAA para el desplegable. */
  ccaaOpciones: CcaaOpcion[];
  /** CCAA inicial (si se sabe). Por defecto la primera. */
  ccaaInicial?: string;
  /** Códigos INE actualmente seleccionados (controlado por el padre). */
  seleccionados: Set<string>;
  /**
   * Códigos INE que NO se pueden seleccionar (p.ej. el municipio actual
   * del usuario en el wizard). Aparecen marcados pero el click se ignora.
   */
  excluidos?: Set<string>;
  /** Llamado al añadir o quitar un municipio. `nombre` viene del GeoJSON. */
  onToggle: (codigoIne: string, isAdding: boolean, nombre: string) => void;
  /** Llamado al cerrar (modo single, al seleccionar uno; o al pulsar X). */
  onCerrar: () => void;
};

type GeoProps = { name?: string };

/**
 * Selector visual de municipios sobre un mapa con MapLibre GL.
 *
 * - El usuario elige una CCAA en el desplegable.
 * - El componente carga `/geojson/munis-{ccaa}.geojson` (cacheable como
 *   asset estático) y dibuja sus polígonos.
 * - Click sobre un polígono → toggle en `seleccionados` (modo multi)
 *   o selecciona y cierra (modo single).
 * - Los polígonos seleccionados se pintan con el color de marca; los
 *   excluidos en gris desactivado; el resto en color claro.
 */
export function MapaSelectorMunicipios({
  mode,
  ccaaOpciones,
  ccaaInicial,
  seleccionados,
  excluidos,
  onToggle,
  onCerrar,
}: Props) {
  const contenedor = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  // Guardamos el GeoJSON cargado para poder re-aplicar feature-state
  // cuando cambian las props de seleccionados / excluidos.
  const geojsonRef = useRef<FeatureCollection<Geometry, GeoProps> | null>(null);

  const [ccaa, setCcaa] = useState<string>(
    ccaaInicial ?? ccaaOpciones[0]?.codigo_ine ?? "",
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombrePorCodigo, setNombrePorCodigo] = useState<Record<string, string>>({});
  // Ref espejo del mapping. Los listeners de click/mousemove se
  // registran una sola vez (sobre el primer GeoJSON) y guardan en su
  // closure el `mapping` de aquel momento. Sin esta ref, al cambiar
  // de CCAA el source se actualiza pero los tooltips siguen leyendo
  // el mapping VIEJO → muestran códigos en vez de nombres.
  const nombrePorCodigoRef = useRef<Record<string, string>>({});

  // Refs para que los handlers de MapLibre lean siempre el último
  // estado y los últimos callbacks sin tener que reinscribirse. Las
  // refs de callbacks (onToggle, onCerrar) son críticas: el listener
  // se registra UNA vez al cargar la primera GeoJSON, así que sin ref
  // se queda con el closure del primer render → al hacer click rápido
  // varias veces, las llamadas siguientes ven el estado VIEJO del
  // padre y los toggles se sobreescriben entre ellos (bug de "solo
  // 3-4 selecciones" reportado en el wizard).
  const seleccionadosRef = useRef(seleccionados);
  const excluidosRef = useRef(excluidos);
  const modeRef = useRef(mode);
  const onToggleRef = useRef(onToggle);
  const onCerrarRef = useRef(onCerrar);
  useEffect(() => {
    seleccionadosRef.current = seleccionados;
  }, [seleccionados]);
  useEffect(() => {
    excluidosRef.current = excluidos;
  }, [excluidos]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);
  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  // 1) Inicializar el mapa una sola vez.
  useEffect(() => {
    if (!contenedor.current || map.current) return;

    const m = new maplibregl.Map({
      container: contenedor.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#ffffff" },
          },
        ],
      },
      center: [-3.7, 40.4], // Madrid
      zoom: 5,
      attributionControl: false,
    });

    m.on("error", (e) => console.error("[MapaSelector] map error", e));

    m.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          'Datos: <a href="https://github.com/martgnz/es-atlas" target="_blank" rel="noopener">es-atlas</a> · INE/CNIG',
      }),
    );
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    popup.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 8,
    });

    map.current = m;

    // Forzar un resize después de que el modal haya terminado su layout,
    // y observar el contenedor para mantener el canvas en la talla correcta
    // si el viewport cambia (rotación móvil, modal de tamaño dinámico, etc.).
    const timeoutResize = window.setTimeout(() => m.resize(), 50);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && contenedor.current) {
      observer = new ResizeObserver(() => m.resize());
      observer.observe(contenedor.current);
    }

    return () => {
      window.clearTimeout(timeoutResize);
      observer?.disconnect();
      popup.current?.remove();
      m.remove();
      map.current = null;
    };
  }, []);

  // 2) Cargar GeoJSON al cambiar de CCAA.
  useEffect(() => {
    if (!ccaa || !map.current) return;
    setCargando(true);
    setError(null);

    let cancelado = false;
    fetch(`/geojson/munis-${ccaa}.geojson`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<FeatureCollection<Geometry, GeoProps>>;
      })
      .then((geojson) => {
        if (cancelado || !map.current) return;
        const m = map.current;
        geojsonRef.current = geojson;

        // Construir el mapping codigo_ine → name en este momento.
        const mapping: Record<string, string> = {};
        for (const f of geojson.features) {
          if (typeof f.id === "string") {
            mapping[f.id] = f.properties?.name ?? f.id;
          }
        }
        setNombrePorCodigo(mapping);
        // Actualiza la ref para que los listeners ya registrados
        // (que tienen `mapping` viejo en su closure) puedan leer la
        // versión nueva al hacer click/mousemove.
        nombrePorCodigoRef.current = mapping;

        const setOrCreate = () => {
          const existing = m.getSource("munis");
          if (existing) {
            (existing as GeoJSONSource).setData(geojson);
          } else {
            m.addSource("munis", {
              type: "geojson",
              data: geojson,
            });
            m.addLayer({
              id: "munis-fill",
              type: "fill",
              source: "munis",
              paint: {
                // Usamos feature-state, no expresiones con ["id"] +
                // listas: feature-state evita los problemas de
                // coerción de tipo entre el id del GeoJSON y los
                // valores que guarda MapLibre internamente.
                "fill-color": [
                  "case",
                  ["boolean", ["feature-state", "excluido"], false],
                  "#fde68a",
                  ["boolean", ["feature-state", "seleccionado"], false],
                  "#0d4a3a",
                  "#e1f5ee",
                ],
                "fill-opacity": 0.9,
              },
            });
            m.addLayer({
              id: "munis-outline",
              type: "line",
              source: "munis",
              paint: {
                "line-color": "#5dcaa5",
                "line-width": 0.6,
              },
            });
            m.addLayer({
              id: "munis-hover-outline",
              type: "line",
              source: "munis",
              paint: {
                "line-color": "#0d4a3a",
                "line-width": 2,
                "line-opacity": [
                  "case",
                  ["boolean", ["feature-state", "hover"], false],
                  1,
                  0,
                ],
              },
            });

            let hoveredId: string | number | null = null;

            m.on("click", "munis-fill", (e) => {
              const f = e.features?.[0];
              if (!f || f.id == null) return;
              const codigo = String(f.id);
              if (excluidosRef.current?.has(codigo)) return;
              const isSelected = seleccionadosRef.current.has(codigo);
              // Lee del ref para que muestre el nombre correcto si el
              // usuario ha cambiado de CCAA después del primer render.
              const nombre = nombrePorCodigoRef.current[codigo] ?? codigo;
              // Optimistic: actualizamos el feature-state en local
              // y notificamos al padre. El padre actualizará la
              // prop `seleccionados` y el efecto de sincronización
              // re-confirmará el estado.
              m.setFeatureState(
                { source: "munis", id: f.id },
                { seleccionado: !isSelected },
              );
              // Llamamos via ref para asegurar que es la versión
              // ACTUAL del callback (con el último estado del padre),
              // no la del primer render que se quedó en este closure.
              onToggleRef.current(codigo, !isSelected, nombre);
              if (modeRef.current === "single") onCerrarRef.current();
            });

            m.on("mousemove", "munis-fill", (e) => {
              const f = e.features?.[0];
              if (!f || f.id == null || !popup.current || !map.current) return;
              const codigo = String(f.id);
              // Lee del ref (igual que en el click).
              const nombre = nombrePorCodigoRef.current[codigo] ?? codigo;
              map.current.getCanvas().style.cursor = excluidosRef.current?.has(codigo)
                ? "not-allowed"
                : "pointer";
              if (hoveredId !== null && hoveredId !== f.id) {
                m.setFeatureState(
                  { source: "munis", id: hoveredId },
                  { hover: false },
                );
              }
              hoveredId = f.id;
              m.setFeatureState({ source: "munis", id: f.id }, { hover: true });
              popup.current.setLngLat(e.lngLat).setText(nombre).addTo(map.current);
            });
            m.on("mouseleave", "munis-fill", () => {
              if (!popup.current || !map.current) return;
              map.current.getCanvas().style.cursor = "";
              if (hoveredId !== null) {
                m.setFeatureState(
                  { source: "munis", id: hoveredId },
                  { hover: false },
                );
                hoveredId = null;
              }
              popup.current.remove();
            });
          }

          // Aplicar el estado inicial / actualizado a todos los
          // features del source. Los IDs van tal cual los entrega el
          // GeoJSON (MapLibre los normaliza internamente y la
          // operación de comparación contra setFeatureState usa el
          // mismo formato, así que NO hay problema de tipos).
          aplicarFeatureStates(m, geojson, seleccionadosRef.current, excluidosRef.current);
        };

        if (m.isStyleLoaded()) {
          setOrCreate();
        } else {
          m.once("load", setOrCreate);
        }

        // Encajar la vista a la CCAA.
        const bb = bbox(geojson);
        if (bb) {
          m.fitBounds(bb, { padding: 24, duration: 600, maxZoom: 9 });
        }
        setCargando(false);
      })
      .catch((err) => {
        if (cancelado) return;
        setError(err?.message ?? "Error cargando los municipios");
        setCargando(false);
      });

    return () => {
      cancelado = true;
    };
    // Solo reaccionamos al cambio de CCAA. onToggle/onCerrar se leen
    // siempre via ref dentro del handler, así que no deben disparar
    // re-ejecutar este efecto (evita re-añadir capas de MapLibre).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ccaa]);

  // 3) Re-aplicar feature-state cuando cambian las props.
  useEffect(() => {
    const m = map.current;
    if (!m || !m.getSource("munis") || !geojsonRef.current) return;
    aplicarFeatureStates(m, geojsonRef.current, seleccionados, excluidos);
  }, [seleccionados, excluidos]);

  // Lista visible de CCAA seleccionables.
  const ccaaSorted = useMemo(
    () => [...ccaaOpciones].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [ccaaOpciones],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <label className="text-sm font-medium text-slate-700">CCAA:</label>
        <select
          value={ccaa}
          onChange={(e) => setCcaa(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-brand-light focus:outline-none focus:ring-2 focus:ring-brand-light/20"
        >
          {ccaaSorted.map((c) => (
            <option key={c.codigo_ine} value={c.codigo_ine}>
              {c.nombre}
            </option>
          ))}
        </select>
        {cargando && (
          <span className="text-xs italic text-slate-500">Cargando municipios…</span>
        )}

        {/* Acciones a la derecha */}
        <div className="ml-auto flex items-center gap-2">
          {mode === "multi" && (
            <>
              <span className="hidden text-xs text-slate-500 sm:inline">
                {seleccionados.size}{" "}
                {seleccionados.size === 1 ? "seleccionado" : "seleccionados"}
              </span>
              <button
                type="button"
                onClick={onCerrar}
                disabled={seleccionados.size === 0}
                className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                Seleccionar
                {seleccionados.size > 0 && ` (${seleccionados.size})`}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {mode === "multi" ? "Cancelar" : "Cerrar"}
          </button>
        </div>
      </div>

      {/*
        Contenedor del canvas de MapLibre.

        IMPORTANTE: usamos `h-full w-full`, NO `absolute inset-0`.
        MapLibre añade su propia clase `.maplibregl-map { position:
        relative }` al div al inicializarse. Como su CSS se carga
        después de la de Tailwind, su `position: relative` gana sobre
        cualquier `position: absolute` que intentemos aplicar con
        Tailwind. Eso dejaba al div en posición relativa con `inset:
        0` ignorado, resultando en altura 0 y mapa invisible.

        La min-h y flex-1 las llevamos en el wrapper relative para
        garantizar que este contenedor tenga tamaño aunque el flex
        padre tarde en establecerlo.
      */}
      <div className="relative min-h-[400px] flex-1">
        <div ref={contenedor} className="h-full w-full" />
        {error && (
          <div className="absolute inset-x-4 top-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <Leyenda mode={mode} />
      </div>
    </div>
  );
}

function Leyenda({ mode }: { mode: "single" | "multi" }) {
  return (
    <div className="absolute left-3 bottom-3 max-w-[260px] rounded-md border border-slate-200 bg-white/95 p-3 text-[11.5px] text-slate-700 shadow-card">
      <p className="mb-1.5 font-head font-semibold text-slate-900">
        {mode === "single" ? "Elige una localidad" : "Elige los municipios"}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-brand-bg ring-1 ring-brand-mint" />
        <span>Disponible</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-brand" />
        <span>Seleccionado</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-[#fde68a]" />
        <span>Tu plaza actual (no se puede elegir)</span>
      </div>
      <p className="mt-2 text-[10.5px] text-slate-500">
        {mode === "single"
          ? "Click en un municipio para seleccionarlo."
          : "Click para añadirlo. Click otra vez para quitarlo."}
      </p>
    </div>
  );
}

/**
 * Aplica el feature-state {seleccionado, excluido} a cada feature del
 * source "munis" según los Sets que pasa el padre. Pasa el id del
 * feature directamente a setFeatureState (mismo formato que MapLibre
 * almacena internamente, así no hay desajuste de tipo).
 */
function aplicarFeatureStates(
  m: maplibregl.Map,
  fc: FeatureCollection<Geometry, GeoProps>,
  seleccionados: Set<string>,
  excluidos?: Set<string>,
) {
  for (const f of fc.features) {
    if (f.id == null) continue;
    const codigo = String(f.id);
    m.setFeatureState(
      { source: "munis", id: f.id },
      {
        seleccionado: seleccionados.has(codigo),
        excluido: excluidos?.has(codigo) ?? false,
      },
    );
  }
}

/**
 * Calcula la bounding box [west, south, east, north] de una FeatureCollection.
 * Devuelve `null` si no hay geometrías válidas.
 */
function bbox(
  fc: FeatureCollection<Geometry, GeoProps>,
): [[number, number], [number, number]] | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  function addCoord(c: number[]) {
    const [x, y] = c;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  function visit(geom: Geometry) {
    if (geom.type === "Polygon") {
      for (const ring of geom.coordinates) for (const c of ring) addCoord(c);
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates)
        for (const ring of poly) for (const c of ring) addCoord(c);
    }
  }
  for (const f of fc.features) visit(f.geometry);
  if (!Number.isFinite(minX)) return null;
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

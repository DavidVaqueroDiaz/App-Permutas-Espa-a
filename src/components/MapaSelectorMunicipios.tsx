"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Geometry } from "geojson";

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

  const [ccaa, setCcaa] = useState<string>(
    ccaaInicial ?? ccaaOpciones[0]?.codigo_ine ?? "",
  );
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombrePorCodigo, setNombrePorCodigo] = useState<Record<string, string>>({});

  // Refs para que los handlers de MapLibre lean siempre el último estado
  // de selección sin tener que reinscribirse.
  const seleccionadosRef = useRef(seleccionados);
  const excluidosRef = useRef(excluidos);
  const modeRef = useRef(mode);
  useEffect(() => {
    seleccionadosRef.current = seleccionados;
  }, [seleccionados]);
  useEffect(() => {
    excluidosRef.current = excluidos;
  }, [excluidos]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
            paint: { "background-color": "#f1f5f9" },
          },
        ],
        glyphs: undefined as unknown as string,
      },
      center: [-3.7, 40.4], // Madrid
      zoom: 5,
      attributionControl: false,
    });

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

    return () => {
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

        // Construir el mapping codigo_ine → name en este momento.
        const mapping: Record<string, string> = {};
        for (const f of geojson.features) {
          if (typeof f.id === "string") {
            mapping[f.id] = f.properties?.name ?? f.id;
          }
        }
        setNombrePorCodigo(mapping);

        const setOrCreate = () => {
          const existing = m.getSource("munis");
          if (existing) {
            (existing as GeoJSONSource).setData(geojson);
          } else {
            m.addSource("munis", {
              type: "geojson",
              data: geojson,
              promoteId: undefined,
              generateId: false,
            });
            m.addLayer({
              id: "munis-fill",
              type: "fill",
              source: "munis",
              paint: {
                "fill-color": pintarColorPorEstado(),
                "fill-opacity": 0.85,
              },
            });
            m.addLayer({
              id: "munis-outline",
              type: "line",
              source: "munis",
              paint: {
                "line-color": "#94a3b8",
                "line-width": 0.5,
              },
            });
            m.addLayer({
              id: "munis-hover-outline",
              type: "line",
              source: "munis",
              paint: {
                "line-color": "#0d4a3a",
                "line-width": 2,
              },
              filter: ["==", ["id"], ""],
            });

            m.on("click", "munis-fill", (e) => {
              const f = e.features?.[0];
              if (!f) return;
              const codigo = String(f.id ?? "");
              if (!codigo) return;
              if (excluidosRef.current?.has(codigo)) return;
              const isSelected = seleccionadosRef.current.has(codigo);
              const nombre = mapping[codigo] ?? codigo;
              onToggle(codigo, !isSelected, nombre);
              if (modeRef.current === "single") onCerrar();
            });

            m.on("mousemove", "munis-fill", (e) => {
              const f = e.features?.[0];
              if (!f || !popup.current || !map.current) return;
              const codigo = String(f.id ?? "");
              const nombre = mapping[codigo] ?? codigo;
              map.current.getCanvas().style.cursor = excluidosRef.current?.has(codigo)
                ? "not-allowed"
                : "pointer";
              map.current.setFilter("munis-hover-outline", ["==", ["id"], codigo]);
              popup.current.setLngLat(e.lngLat).setText(nombre).addTo(map.current);
            });
            m.on("mouseleave", "munis-fill", () => {
              if (!popup.current || !map.current) return;
              map.current.getCanvas().style.cursor = "";
              map.current.setFilter("munis-hover-outline", ["==", ["id"], ""]);
              popup.current.remove();
            });
          }
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
  }, [ccaa, onCerrar, onToggle]);

  // 3) Repintar cuando cambian los seleccionados/excluidos.
  useEffect(() => {
    const m = map.current;
    if (!m || !m.getLayer("munis-fill")) return;
    m.setPaintProperty("munis-fill", "fill-color", pintarColorPorEstado());
  }, [seleccionados, excluidos]);

  // Memoizar la expresión de color para no reconstruirla en cada render
  // (función real, no useMemo, para tener acceso al cierre de seleccionados).
  function pintarColorPorEstado(): maplibregl.ExpressionSpecification {
    const seleccionadosArr = Array.from(seleccionadosRef.current);
    const excluidosArr = Array.from(excluidosRef.current ?? []);
    return [
      "case",
      ["in", ["id"], ["literal", excluidosArr]],
      "#fde68a", // amarillo: tu municipio actual o excluido
      ["in", ["id"], ["literal", seleccionadosArr]],
      "#0d4a3a", // brand: seleccionado
      "#e2e8f0", // slate-200: por defecto
    ];
  }

  // Lista visible de CCAA seleccionables.
  const ccaaSorted = useMemo(
    () => [...ccaaOpciones].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [ccaaOpciones],
  );

  return (
    <div className="flex h-full flex-col">
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
        <button
          type="button"
          onClick={onCerrar}
          className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cerrar
        </button>
      </div>

      <div className="relative flex-1">
        <div ref={contenedor} className="absolute inset-0" />
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
        <span className="h-3 w-3 rounded-sm bg-[#e2e8f0]" />
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

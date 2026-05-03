"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import maplibregl, {
  type Map as MapLibreMap,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  obtenerConteosPorCcaa,
  type ConteoPorCcaa,
  type SectorOpcion,
} from "@/app/actions/conteos";

type FeatureCollectionGeo = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: unknown;
    properties: Record<string, unknown>;
  }>;
};

type Props = {
  /** Sectores reales con al menos un anuncio (para el desplegable). */
  sectoresOpciones: SectorOpcion[];
  /** Conteos iniciales (para SSR-friendly first paint sin parpadeo). */
  conteosIniciales: ConteoPorCcaa;
  /** Total de anuncios iniciales. */
  totalInicial: number;
};

/** Colores de la chorópleta — escala secuencial azul. */
const COLOR_CERO = "#e2e8f0"; // gris claro
const COLOR_BAJO = "#bfdbfe";
const COLOR_MEDIO = "#60a5fa";
const COLOR_ALTO = "#1d4ed8";

export function MapaHomeChoropleth({
  sectoresOpciones,
  conteosIniciales,
  totalInicial,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geojsonBaseRef = useRef<FeatureCollectionGeo | null>(null);

  const [sector, setSector] = useState<string>("");
  const [conteos, setConteos] = useState<ConteoPorCcaa>(conteosIniciales);
  const [total, setTotal] = useState<number>(totalInicial);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    nombre: string;
    count: number;
  } | null>(null);
  const [, startTransition] = useTransition();

  // Inicializa el mapa una vez al montar.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          ccaa: {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
            promoteId: "cod_ccaa",
          },
          // Source aparte solo con un Point por CCAA en su centroide
          // aproximado, para colocar el número del conteo. Así evitamos
          // que MapLibre pinte el texto en cada parte del MultiPolygon
          // (Galicia, Canarias, Baleares...).
          "ccaa-centroides": {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          },
        },
        layers: [
          {
            id: "fondo",
            type: "background",
            paint: { "background-color": "#f8fafc" },
          },
          {
            id: "ccaa-fill",
            type: "fill",
            source: "ccaa",
            paint: {
              "fill-color": [
                "case",
                ["==", ["coalesce", ["get", "count"], 0], 0], COLOR_CERO,
                ["<=", ["get", "count"], 5], COLOR_BAJO,
                ["<=", ["get", "count"], 20], COLOR_MEDIO,
                COLOR_ALTO,
              ],
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                0.95,
                0.85,
              ],
            },
          },
          {
            id: "ccaa-line",
            type: "line",
            source: "ccaa",
            paint: {
              "line-color": "#475569",
              "line-width": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                2,
                0.6,
              ],
            },
          },
          {
            id: "ccaa-count",
            type: "symbol",
            source: "ccaa-centroides",
            filter: [">", ["coalesce", ["get", "count"], 0], 0],
            layout: {
              "text-field": ["to-string", ["get", "count"]],
              "text-size": 16,
              "text-allow-overlap": true,
              "text-font": ["Open Sans Bold"],
            },
            paint: {
              "text-color": "#0f172a",
              "text-halo-color": "#fff",
              "text-halo-width": 2,
            },
          },
        ],
        glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
      },
      center: [-3.7, 40.4], // Madrid aprox.
      zoom: 4.6,
      minZoom: 4,
      maxZoom: 7,
      attributionControl: false,
    });

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "Datos: INE · Geometrías: Code for Germany",
      }),
    );

    let hoveredId: string | null = null;

    map.on("load", async () => {
      // Cargar el GeoJSON base.
      const res = await fetch("/geo/ccaa.geojson");
      const gj = (await res.json()) as FeatureCollectionGeo;
      geojsonBaseRef.current = gj;

      // Pintar con los conteos iniciales.
      aplicarConteos(map, gj, conteosIniciales);
    });

    map.on("mousemove", "ccaa-fill", (e) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const id = feat.id as string | undefined;
      if (id !== undefined) {
        if (hoveredId !== null && hoveredId !== id) {
          map.setFeatureState({ source: "ccaa", id: hoveredId }, { hover: false });
        }
        hoveredId = id;
        map.setFeatureState({ source: "ccaa", id }, { hover: true });
      }
      const props = feat.properties as Record<string, unknown>;
      setTooltip({
        x: e.point.x,
        y: e.point.y,
        nombre: (props.name as string) ?? "—",
        count: typeof props.count === "number" ? (props.count as number) : 0,
      });
    });

    map.on("mouseleave", "ccaa-fill", () => {
      if (hoveredId !== null) {
        map.setFeatureState({ source: "ccaa", id: hoveredId }, { hover: false });
        hoveredId = null;
      }
      setTooltip(null);
    });

    map.getCanvas().style.cursor = "default";

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [conteosIniciales]);

  // Cuando cambia el sector, pedir nuevos conteos y repintar.
  useEffect(() => {
    startTransition(async () => {
      const nuevos = await obtenerConteosPorCcaa(sector || undefined);
      setConteos(nuevos);
      setTotal(Object.values(nuevos).reduce((a, b) => a + b, 0));

      const map = mapRef.current;
      const gj = geojsonBaseRef.current;
      if (!map || !gj) return;
      if (!map.isStyleLoaded()) {
        map.once("load", () => aplicarConteos(map, gj, nuevos));
      } else {
        aplicarConteos(map, gj, nuevos);
      }
    });
  }, [sector]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Anuncios activos en España
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {total} {total === 1 ? "anuncio publicado" : "anuncios publicados"} en este momento.
          </p>
        </div>

        <div>
          <label
            htmlFor="filtro-sector"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Filtrar por sector
          </label>
          <select
            id="filtro-sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Todos los sectores</option>
            {sectoresOpciones.map((s) => (
              <option key={s.codigo} value={s.codigo}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="relative mt-4">
        <div
          ref={containerRef}
          className="h-[500px] w-full overflow-hidden rounded-md border border-slate-200 dark:border-slate-800"
        />
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
            style={{
              left: tooltip.x + 12,
              top: tooltip.y + 12,
            }}
          >
            <div className="font-semibold">{tooltip.nombre}</div>
            <div>
              {tooltip.count} {tooltip.count === 1 ? "anuncio" : "anuncios"}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Pasa el ratón por encima de una comunidad para ver el detalle.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------
// Helper: añade `count` a cada feature y le da setData al source.
// ----------------------------------------------------------------------

function aplicarConteos(
  map: MapLibreMap,
  geojson: FeatureCollectionGeo,
  conteos: ConteoPorCcaa,
) {
  const featuresConCount: FeatureCollectionGeo = {
    type: "FeatureCollection",
    features: geojson.features.map((f) => ({
      type: "Feature",
      geometry: f.geometry,
      properties: {
        ...f.properties,
        count: conteos[f.properties.cod_ccaa as string] ?? 0,
      },
    })),
  };

  // Generar un Point por CCAA en el centroide aproximado del polígono más
  // grande (para poner el número del conteo en una sola posición visible).
  const centroides: FeatureCollectionGeo = {
    type: "FeatureCollection",
    features: featuresConCount.features.map((f) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: centroideAprox(f.geometry as GeometriaArea),
      },
      properties: f.properties,
    })),
  };

  const source = map.getSource("ccaa") as GeoJSONSource | undefined;
  if (source) {
    source.setData(
      featuresConCount as unknown as Parameters<GeoJSONSource["setData"]>[0],
    );
  }
  const sourceCent = map.getSource("ccaa-centroides") as
    | GeoJSONSource
    | undefined;
  if (sourceCent) {
    sourceCent.setData(
      centroides as unknown as Parameters<GeoJSONSource["setData"]>[0],
    );
  }
}

// ----------------------------------------------------------------------
// Cálculo aproximado del centroide de un Polygon o MultiPolygon.
// Para MultiPolygon tomamos el subpolígono con más vértices (suele ser
// la masa principal) e ignoramos islas/exclaves pequeños.
// ----------------------------------------------------------------------

type AnilloLineal = Array<[number, number]>;
type GeometriaArea =
  | { type: "Polygon"; coordinates: AnilloLineal[] }
  | { type: "MultiPolygon"; coordinates: AnilloLineal[][] };

function centroideAprox(geom: GeometriaArea): [number, number] {
  let anillo: AnilloLineal;
  if (geom.type === "MultiPolygon") {
    let mejor: AnilloLineal = geom.coordinates[0]?.[0] ?? [];
    for (const poly of geom.coordinates) {
      const ext = poly[0] ?? [];
      if (ext.length > mejor.length) mejor = ext;
    }
    anillo = mejor;
  } else {
    anillo = geom.coordinates[0] ?? [];
  }
  if (anillo.length === 0) return [0, 0];
  let sx = 0, sy = 0;
  for (const [x, y] of anillo) {
    sx += x;
    sy += y;
  }
  return [sx / anillo.length, sy / anillo.length];
}

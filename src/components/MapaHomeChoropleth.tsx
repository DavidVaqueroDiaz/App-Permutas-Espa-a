"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import maplibregl, {
  type Map as MapLibreMap,
  type GeoJSONSource,
  type StyleSpecification,
} from "maplibre-gl";
// CSS de maplibre-gl cargado globalmente en layout.tsx.
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
  sectoresOpciones: SectorOpcion[];
  conteosIniciales: ConteoPorCcaa;
  totalInicial: number;
};

const COLOR_CERO = "#e2e8f0";
const COLOR_BAJO = "#bfdbfe";
const COLOR_MEDIO = "#60a5fa";
const COLOR_ALTO = "#1d4ed8";

// Bbox de la península ibérica + Baleares (Canarias va en mapa aparte).
const BOUNDS_PENINSULA: [[number, number], [number, number]] = [
  [-10.0, 35.5],
  [5.5, 44.2],
];

// Bbox de las Islas Canarias.
const BOUNDS_CANARIAS: [[number, number], [number, number]] = [
  [-18.3, 27.5],
  [-13.3, 29.5],
];

// Código INE de Canarias (para filtrar features en cada mapa).
const CCAA_CODIGO_CANARIAS = "05";

function buildStyle(
  showOnly: "peninsula" | "canarias",
): StyleSpecification {
  const filtroCanarias = ["==", ["get", "cod_ccaa"], CCAA_CODIGO_CANARIAS];
  const filtro =
    showOnly === "canarias" ? filtroCanarias : ["!", filtroCanarias];

  return {
    version: 8,
    sources: {
      ccaa: {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        promoteId: "cod_ccaa",
      },
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
        filter: filtro as maplibregl.ExpressionSpecification,
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
            ["boolean", ["feature-state", "hover"], false], 0.95, 0.85,
          ],
        },
      },
      {
        id: "ccaa-line",
        type: "line",
        source: "ccaa",
        filter: filtro as maplibregl.ExpressionSpecification,
        paint: {
          "line-color": "#475569",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false], 2, 0.6,
          ],
        },
      },
      {
        id: "ccaa-count",
        type: "symbol",
        source: "ccaa-centroides",
        filter: ["all",
          [">", ["coalesce", ["get", "count"], 0], 0],
          filtro,
        ] as unknown as maplibregl.ExpressionSpecification,
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
  };
}

export function MapaHomeChoropleth({
  sectoresOpciones,
  conteosIniciales,
  totalInicial,
}: Props) {
  const router = useRouter();

  const containerMainRef = useRef<HTMLDivElement | null>(null);
  const containerCanariasRef = useRef<HTMLDivElement | null>(null);
  const mapMainRef = useRef<MapLibreMap | null>(null);
  const mapCanariasRef = useRef<MapLibreMap | null>(null);
  const geojsonBaseRef = useRef<FeatureCollectionGeo | null>(null);

  const [sector, setSector] = useState<string>("");
  const [conteos, setConteos] = useState<ConteoPorCcaa>(conteosIniciales);
  const [total, setTotal] = useState<number>(totalInicial);
  const sectorRef = useRef(sector);
  useEffect(() => { sectorRef.current = sector; }, [sector]);

  const [tooltip, setTooltip] = useState<{
    x: number; y: number; nombre: string; count: number;
  } | null>(null);
  const [avisoSector, setAvisoSector] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  // Inicializa ambos mapas (principal + inset Canarias) UNA VEZ.
  useEffect(() => {
    if (!containerMainRef.current || !containerCanariasRef.current) return;
    if (mapMainRef.current) return;

    const mapMain = new maplibregl.Map({
      container: containerMainRef.current,
      style: buildStyle("peninsula"),
      bounds: BOUNDS_PENINSULA,
      maxBounds: BOUNDS_PENINSULA,
      minZoom: 5,
      maxZoom: 7,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: false,
    });
    mapMain.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "Datos: INE / CNIG · Geometrías: IGN España",
      }),
    );

    const mapCan = new maplibregl.Map({
      container: containerCanariasRef.current,
      style: buildStyle("canarias"),
      bounds: BOUNDS_CANARIAS,
      maxBounds: BOUNDS_CANARIAS,
      minZoom: 5,
      maxZoom: 8,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: false,
    });

    setupInteractions(mapMain);
    setupInteractions(mapCan);

    mapMainRef.current = mapMain;
    mapCanariasRef.current = mapCan;

    // Cargar GeoJSON una sola vez y aplicar a los dos mapas.
    fetch("/geo/ccaa.geojson")
      .then((r) => r.json())
      .then((gj: FeatureCollectionGeo) => {
        geojsonBaseRef.current = gj;
        cuandoCargado(mapMain, () => aplicarConteos(mapMain, gj, conteosIniciales));
        cuandoCargado(mapCan,  () => aplicarConteos(mapCan,  gj, conteosIniciales));
      });

    return () => {
      mapMain.remove();
      mapCan.remove();
      mapMainRef.current = null;
      mapCanariasRef.current = null;
    };

    function setupInteractions(m: MapLibreMap) {
      let hoveredId: string | null = null;

      m.on("mousemove", "ccaa-fill", (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const id = feat.id as string | undefined;
        if (id !== undefined) {
          if (hoveredId !== null && hoveredId !== id) {
            m.setFeatureState({ source: "ccaa", id: hoveredId }, { hover: false });
          }
          hoveredId = id;
          m.setFeatureState({ source: "ccaa", id }, { hover: true });
        }
        const props = feat.properties as Record<string, unknown>;
        // El tooltip se posiciona respecto al canvas del mapa.
        // Para el mapa inset usaríamos coordenadas relativas al document.
        const rect = m.getCanvas().getBoundingClientRect();
        setTooltip({
          x: rect.left + e.point.x,
          y: rect.top + e.point.y,
          nombre: (props.name as string) ?? "—",
          count: typeof props.count === "number" ? (props.count as number) : 0,
        });
        m.getCanvas().style.cursor = "pointer";
      });

      m.on("mouseleave", "ccaa-fill", () => {
        if (hoveredId !== null) {
          m.setFeatureState({ source: "ccaa", id: hoveredId }, { hover: false });
          hoveredId = null;
        }
        setTooltip(null);
        m.getCanvas().style.cursor = "default";
      });

      m.on("click", "ccaa-fill", (e) => {
        const feat = e.features?.[0];
        if (!feat) return;
        const codigo = (feat.properties as Record<string, unknown>).cod_ccaa as
          | string
          | undefined;
        if (!codigo) return;
        // Si no hay sector elegido, avisamos en lugar de navegar.
        if (!sectorRef.current) {
          setAvisoSector(true);
          return;
        }
        const qs = new URLSearchParams();
        qs.set("ccaa", codigo);
        qs.set("sector", sectorRef.current);
        router.push(`/anuncios?${qs.toString()}`);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambia el filtro de sector, repintar.
  useEffect(() => {
    startTransition(async () => {
      const nuevos = await obtenerConteosPorCcaa(sector || undefined);
      setConteos(nuevos);
      setTotal(Object.values(nuevos).reduce((a, b) => a + b, 0));

      const gj = geojsonBaseRef.current;
      if (!gj) return;
      const m1 = mapMainRef.current;
      const m2 = mapCanariasRef.current;
      if (m1) cuandoCargado(m1, () => aplicarConteos(m1, gj, nuevos));
      if (m2) cuandoCargado(m2, () => aplicarConteos(m2, gj, nuevos));
    });
  }, [sector]);

  return (
    <div className="rounded-xl2 border border-slate-200 bg-white shadow-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Anuncios activos en España
          </h2>
          <p className="text-sm text-slate-600">
            {total}{" "}
            {total === 1 ? "anuncio publicado" : "anuncios publicados"} en este momento.
          </p>
        </div>

        <div>
          <label
            htmlFor="filtro-sector"
            className="block text-xs font-medium text-slate-700"
          >
            Filtrar por sector
          </label>
          <select
            id="filtro-sector"
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              if (e.target.value) setAvisoSector(false);
            }}
            className={
              "mt-1 rounded-md border bg-white px-3 py-1.5 text-sm " +
              (avisoSector
                ? "border-amber-500 ring-2 ring-amber-300"
                : "border-slate-300")
            }
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

      {avisoSector && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Selecciona primero el sector que estás buscando en el desplegable de arriba.
        </div>
      )}

      <div className="relative mt-4">
        <div
          ref={containerMainRef}
          className="h-[500px] w-full overflow-hidden rounded-md border border-slate-200"
        />

        {/* Inset Canarias absoluto en la esquina inferior izquierda */}
        <div
          ref={containerCanariasRef}
          className="absolute bottom-3 left-3 h-[120px] w-[180px] overflow-hidden rounded-md border-2 border-slate-300 bg-white shadow-md"
          aria-label="Mapa de Canarias"
        />

        {tooltip && (
          <div
            className="pointer-events-none fixed z-20 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white shadow-lg"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            <div className="font-semibold">{tooltip.nombre}</div>
            <div>
              {tooltip.count}{" "}
              {tooltip.count === 1 ? "anuncio" : "anuncios"}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Pasa el ratón por encima de una comunidad para ver el detalle. Pulsa para ver sus anuncios.
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function cuandoCargado(map: MapLibreMap, fn: () => void) {
  if (map.isStyleLoaded()) fn();
  else map.once("load", fn);
}

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

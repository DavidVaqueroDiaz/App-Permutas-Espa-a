/**
 * Convierte el TopoJSON de es-atlas (municipios de España indexados
 * por código INE) a GeoJSON FeatureCollection y lo parte en 19
 * ficheros (uno por CCAA) en `public/geojson/munis-{ccaa}.geojson`.
 *
 * Estrategia:
 *   1. Lee `tmp/es-atlas.json` (TopoJSON).
 *   2. `topojson.feature(...)` reconstruye el GeoJSON.
 *   3. Para cada feature, derivamos la CCAA a partir del codigo_ine
 *      del municipio mirando el mapping provincia → ccaa de nuestra BD.
 *   4. Agrupamos por ccaa_codigo y volcamos un fichero por grupo.
 *   5. Parche manual: añadimos Usansolo (48916) que no estaba en el
 *      snapshot 2024 de es-atlas — tomamos la geometría aproximada
 *      del entorno de Galdakao.
 *
 * Atribución: datos de es-atlas (martgnz) — MIT + CC-BY 4.0 sobre
 * los datos administrativos derivados de IGN/CNIG.
 *
 * Ejecutar: npx tsx scripts/build-municipios-geojson.ts
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";

const FUENTE = path.resolve("tmp/es-atlas.json");
const OUT_DIR = path.resolve("public/geojson");

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

type Props = { name?: string };

async function main() {
  if (!fs.existsSync(FUENTE)) {
    console.error(`✗ No existe ${FUENTE}.`);
    console.error(`  Descárgalo primero con:`);
    console.error(`    curl -sL -o tmp/es-atlas.json https://unpkg.com/es-atlas@0.6.0/es/municipalities.json`);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const topoRaw = fs.readFileSync(FUENTE, "utf8");
  const topo = JSON.parse(topoRaw) as Topology;
  console.log(`Leído TopoJSON con ${(topoRaw.length / 1024).toFixed(0)} KB.`);

  // Convertir a GeoJSON
  const fc = feature(
    topo,
    topo.objects.municipalities as never,
  ) as unknown as FeatureCollection<Geometry, Props>;
  console.log(`Reconstruidas ${fc.features.length} features (incluye polígonos múltiples por municipio).`);

  // Mapping provincia → ccaa y nombres oficiales INE de los municipios
  // desde la BD. Usar BD garantiza nombres consistentes y evita
  // problemas de codificación de la fuente externa (es-atlas).
  const client = new Client({
    user: process.env.SUPABASE_DB_USER!,
    password: process.env.SUPABASE_DB_PASSWORD!,
    host: process.env.SUPABASE_DB_HOST!,
    port: Number.parseInt(process.env.SUPABASE_DB_PORT!, 10),
    database: process.env.SUPABASE_DB_NAME!,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const provs = await client.query<{ codigo_ine: string; ccaa_codigo: string }>(
    "select codigo_ine, ccaa_codigo from public.provincias",
  );
  const provACcaa = new Map<string, string>();
  for (const r of provs.rows) provACcaa.set(r.codigo_ine, r.ccaa_codigo);
  console.log(`Cargado mapping provincia→CCAA: ${provACcaa.size} provincias.`);

  const munis = await client.query<{ codigo_ine: string; nombre: string }>(
    "select codigo_ine, nombre from public.municipios",
  );
  const nombrePorCodigo = new Map<string, string>();
  for (const r of munis.rows) nombrePorCodigo.set(r.codigo_ine, r.nombre);
  console.log(`Cargados nombres oficiales de ${nombrePorCodigo.size} municipios.`);

  // Agrupar features por CCAA. Si un municipio aparece varias veces
  // (multi-polígono — islas por ejemplo), las concatenamos en una
  // misma feature con tipo MultiPolygon.
  type Acc = Map<string, Map<string, FeatureCollection<Geometry, Props>["features"]>>;
  const porCcaa: Acc = new Map();

  let sinCcaa = 0;
  for (const f of fc.features) {
    const codigoIne = String(f.id ?? "");
    if (!codigoIne || codigoIne.length !== 5) continue;
    const provCodigo = codigoIne.slice(0, 2);
    const ccaa = provACcaa.get(provCodigo);
    if (!ccaa) {
      sinCcaa++;
      continue;
    }
    let porIne = porCcaa.get(ccaa);
    if (!porIne) {
      porIne = new Map();
      porCcaa.set(ccaa, porIne);
    }
    const list = porIne.get(codigoIne) ?? [];
    list.push(f);
    porIne.set(codigoIne, list);
  }
  if (sinCcaa > 0) console.warn(`! ${sinCcaa} features sin provincia conocida (descartadas).`);

  // Parche Usansolo (48916) — Bizkaia, segregada de Galdakao en 2024.
  // Añadimos un punto-buffer aproximado a partir de las coords que ya
  // metimos en la BD: 43.205, -2.7717. Geometría minúscula (cuadradito
  // de ~1 km de lado) — placeholder hasta que el dataset se actualice.
  const ccaaUsansolo = provACcaa.get("48");
  if (ccaaUsansolo) {
    const lat = 43.205, lon = -2.7717, d = 0.005; // ~500 m
    const usansoloFeat: FeatureCollection<Geometry, Props>["features"][number] = {
      type: "Feature",
      id: "48916",
      properties: { name: "Usansolo" },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [lon - d, lat - d],
          [lon + d, lat - d],
          [lon + d, lat + d],
          [lon - d, lat + d],
          [lon - d, lat - d],
        ]],
      },
    };
    let porIne = porCcaa.get(ccaaUsansolo);
    if (!porIne) {
      porIne = new Map();
      porCcaa.set(ccaaUsansolo, porIne);
    }
    porIne.set("48916", [usansoloFeat]);
    console.log(`✓ Parche manual: Usansolo (48916) añadido a CCAA ${ccaaUsansolo}.`);
  }

  // Volcado por CCAA. Si un municipio tenía múltiples polígonos los
  // colapsamos en una sola feature MultiPolygon para que el cliente
  // lo trate como una unidad clicable.
  let totalMunis = 0;
  let totalCcaaFiles = 0;
  for (const [ccaa, porIne] of porCcaa) {
    const features: FeatureCollection<Geometry, Props>["features"] = [];
    for (const [codigoIne, lista] of porIne) {
      // Nombre OFICIAL de la BD (INE). Si no está, fallback al de
      // es-atlas. Si tampoco, el código.
      const nombreOficial =
        nombrePorCodigo.get(codigoIne) ?? lista[0].properties?.name ?? codigoIne;

      if (lista.length === 1) {
        features.push({
          ...lista[0],
          properties: { name: nombreOficial },
        });
      } else {
        // Combinar múltiples polígonos en MultiPolygon
        const coords: number[][][][] = [];
        for (const f of lista) {
          if (f.geometry.type === "Polygon") {
            coords.push((f.geometry as { coordinates: number[][][] }).coordinates);
          } else if (f.geometry.type === "MultiPolygon") {
            for (const c of (f.geometry as { coordinates: number[][][][] }).coordinates) {
              coords.push(c);
            }
          }
        }
        features.push({
          type: "Feature",
          id: codigoIne,
          properties: { name: nombreOficial },
          geometry: { type: "MultiPolygon", coordinates: coords },
        });
      }
    }

    const out: FeatureCollection<Geometry, Props> = {
      type: "FeatureCollection",
      features,
    };
    const outPath = path.join(OUT_DIR, `munis-${ccaa}.geojson`);
    // No usamos pretty-print: ahorra ~30% del tamaño en disco/red.
    fs.writeFileSync(outPath, JSON.stringify(out));
    const kb = (fs.statSync(outPath).size / 1024).toFixed(0);
    console.log(`  CCAA ${ccaa}: ${features.length} municipios → munis-${ccaa}.geojson (${kb} KB)`);
    totalMunis += features.length;
    totalCcaaFiles++;
  }

  console.log(`\n✓ ${totalCcaaFiles} ficheros generados, ${totalMunis} municipios totales.`);

  // Cross-check con la BD
  const total = await client.query<{ n: number }>(
    "select count(*)::int as n from public.municipios",
  );
  const enBd = total.rows[0].n;
  console.log(`En BD hay ${enBd} municipios.`);
  if (totalMunis < enBd) {
    console.warn(`! Faltan ${enBd - totalMunis} municipios respecto a la BD.`);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

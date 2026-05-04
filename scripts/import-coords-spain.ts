/**
 * Carga coordenadas (lat, lon) de los municipios de TODA España en
 * `public.municipios`, usando como fuente el dataset abierto
 * softlinegeodb (https://github.com/softline-informatica/softlinegeodb).
 *
 * El dump es MySQL phpMyAdmin pero los datos que nos interesan están
 * en una sola tabla `softlinegeodb_ine_municipios_geo`. La columna
 * `id_municipio_geo` codifica `[id_ccaa][cod_provincia_INE_zero_pad_2][cod_municipio_INE_zero_pad_3]`,
 * de modo que el código INE estándar de 5 cifras es:
 *
 *     codigo_ine = id_municipio_geo % 100000  (zero-padded a 5)
 *
 * Verificado contra Madrid (1328079 → 28079) y A Coruña (1215030 → 15030).
 *
 * Atribución: los datos provienen de SOFT LINE Informática S.L., a su
 * vez derivados de los catálogos públicos del INE (CC-BY 4.0) y CNIG/IGN.
 *
 * Ejecutar: npx tsx scripts/import-coords-spain.ts
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const FUENTE = path.resolve("tmp/softlinegeodb.sql");

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

type Coord = { codigo_ine: string; lat: number; lon: number };

/**
 * Saca todas las filas (id_municipio_geo, lat, lon) del dump y las
 * convierte al código INE estándar.
 *
 * Las filas tienen este formato dentro del INSERT INTO ... VALUES:
 *   (104001, 37.14120990, -2.77953953, 4, 0, 1, 1258, 4524.4244, 46589, '1029-1', 853, '04005')
 *
 * El primer valor entre paréntesis es id_municipio_geo, los siguientes
 * dos son latitud y longitud. El resto no nos interesa.
 */
function parsearGeo(sql: string): Coord[] {
  // Aislamos la sección de INSERTs de la tabla relevante.
  const startMarker = "INSERT INTO `softlinegeodb_ine_municipios_geo`";
  const tablaIdx = sql.indexOf(startMarker);
  if (tablaIdx < 0) throw new Error("No se encontró la tabla de coordenadas en el dump.");

  // Capturamos todas las tuplas (...) hasta que aparezca otro CREATE/INSERT
  // que no sea de esta tabla.
  const final = sql.indexOf("-- --------------------------------------------------------", tablaIdx + 100);
  const corte = final > 0 ? sql.slice(tablaIdx, final) : sql.slice(tablaIdx);

  // Tupla: ( id_municipio_geo, lat, lon, ...resto... )
  const tupleRe =
    /\(\s*(\d+)\s*,\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*,/g;

  const out: Coord[] = [];
  let m: RegExpExecArray | null;
  while ((m = tupleRe.exec(corte)) !== null) {
    const idMuni = Number.parseInt(m[1], 10);
    const lat = Number.parseFloat(m[2]);
    const lon = Number.parseFloat(m[3]);
    if (Number.isNaN(idMuni) || Number.isNaN(lat) || Number.isNaN(lon)) continue;
    const codigo = String(idMuni % 100000).padStart(5, "0");
    out.push({ codigo_ine: codigo, lat, lon });
  }
  return out;
}

async function main() {
  if (!fs.existsSync(FUENTE)) {
    console.error(`✗ No existe ${FUENTE}.`);
    console.error(`  Descárgalo primero con:`);
    console.error(`    curl -sL -o tmp/softlinegeodb.sql https://raw.githubusercontent.com/softline-informatica/softlinegeodb/main/sql/softlinegeodb-spain-minimal-db.sql`);
    process.exit(1);
  }

  const sql = fs.readFileSync(FUENTE, "utf8");
  console.log(`Leídos ${(sql.length / 1024).toFixed(0)} KB del dump.`);

  const coords = parsearGeo(sql);
  console.log(`Extraídos ${coords.length} pares (codigo_ine, lat, lon) del dump.`);

  // Aviso si hay duplicados (no debería).
  const visto = new Set<string>();
  const duplicados: string[] = [];
  for (const c of coords) {
    if (visto.has(c.codigo_ine)) duplicados.push(c.codigo_ine);
    visto.add(c.codigo_ine);
  }
  if (duplicados.length > 0) {
    console.warn(`! ${duplicados.length} códigos duplicados (se sobrescribirán entre sí).`);
  }

  const client = new Client({
    user: process.env.SUPABASE_DB_USER!,
    password: process.env.SUPABASE_DB_PASSWORD!,
    host: process.env.SUPABASE_DB_HOST!,
    port: Number.parseInt(process.env.SUPABASE_DB_PORT!, 10),
    database: process.env.SUPABASE_DB_NAME!,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("✓ Conectado a Supabase.");

  // Estado previo
  const antes = await client.query<{ con: number; sin: number }>(`
    select
      count(*) filter (where latitud is not null)::int as con,
      count(*) filter (where latitud is null)::int as sin
    from public.municipios
  `);
  console.log(`Antes: ${antes.rows[0].con} con coords / ${antes.rows[0].sin} sin coords`);

  // UPDATE FROM VALUES por lotes. No usamos TEMP TABLE porque el
  // pooler de Supabase puede cerrar la conexión / transacción entre
  // queries y la temp table desaparecería.
  const lote = 500;
  let actualizados = 0;
  for (let i = 0; i < coords.length; i += lote) {
    const slice = coords.slice(i, i + lote);
    const valores: string[] = [];
    const params: (string | number)[] = [];
    let idx = 1;
    for (const c of slice) {
      valores.push(`($${idx++}::char(5), $${idx++}::numeric, $${idx++}::numeric)`);
      params.push(c.codigo_ine, c.lat, c.lon);
    }
    const r = await client.query(
      `update public.municipios m
          set latitud = v.lat, longitud = v.lon
         from (values ${valores.join(", ")}) as v(codigo_ine, lat, lon)
        where m.codigo_ine = v.codigo_ine`,
      params,
    );
    actualizados += r.rowCount ?? 0;
  }
  console.log(`✓ ${actualizados} municipios actualizados.`);

  // Parches manuales para municipios creados después del snapshot
  // de softlinegeodb (2024-11). Usansolo (48916) se segregó de
  // Galdakao en 2022. Coordenadas aproximadas del casco urbano.
  const parchesManuales: Coord[] = [
    { codigo_ine: "48916", lat: 43.205, lon: -2.7717 }, // Usansolo (Bizkaia)
  ];
  for (const p of parchesManuales) {
    const r = await client.query(
      "update public.municipios set latitud = $1, longitud = $2 where codigo_ine = $3 and latitud is null",
      [p.lat, p.lon, p.codigo_ine],
    );
    if (r.rowCount && r.rowCount > 0) {
      console.log(`✓ Parche manual aplicado para ${p.codigo_ine}`);
    }
  }

  // Estado final
  const despues = await client.query<{ con: number; sin: number }>(`
    select
      count(*) filter (where latitud is not null)::int as con,
      count(*) filter (where latitud is null)::int as sin
    from public.municipios
  `);
  console.log(`\nDespués: ${despues.rows[0].con} con coords / ${despues.rows[0].sin} sin coords`);

  // Cuáles siguen sin coords (si quedan ≤ 25, los listamos)
  if (despues.rows[0].sin > 0 && despues.rows[0].sin <= 25) {
    const huecos = await client.query<{ codigo_ine: string; nombre: string; pcod: string }>(`
      select m.codigo_ine, m.nombre, m.provincia_codigo as pcod
        from public.municipios m
       where m.latitud is null
       order by m.codigo_ine
    `);
    console.log("\nMunicipios SIN coords:");
    for (const h of huecos.rows) {
      console.log(`  ${h.codigo_ine} (prov ${h.pcod}) — ${h.nombre}`);
    }
  }

  await client.end();
  console.log("\n✓ Hecho.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

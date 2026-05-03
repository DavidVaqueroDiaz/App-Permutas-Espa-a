/**
 * Carga las coordenadas (lat, lon) de los municipios gallegos en
 * `public.municipios`, usando como fuente el dataset de PermutaDoc
 * en `C:/Users/Usuario/Desktop/permutas/src/data/municipios.js`.
 *
 * Hace match por nombre normalizado (sin tildes, lowercase, sin
 * artículos antepuestos como "A"/"O").
 *
 * Ejecutar: npx tsx scripts/import-coords-galicia.ts
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const FUENTE = "C:/Users/Usuario/Desktop/permutas/src/data/municipios.js";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tildes
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Quita artículos antepuestos ("A Coruña") o pospuestos ("Coruña, A").
 * IMPORTANTE: la cadena ya debe estar normalizada (lowercase, sin tildes,
 * comas convertidas a espacio). Se llama después de `normalizar`.
 */
function quitarArticulo(s: string): string {
  return s
    .replace(/^(a|o|as|os|el|la|los|las)\s+/, "")
    .replace(/\s+(a|o|as|os|el|la|los|las)$/, "");
}

function clave(s: string): string {
  return quitarArticulo(normalizar(s));
}

async function main() {
  const txt = fs.readFileSync(FUENTE, "utf8");

  // Parseamos con regex todos los objetos { nome: '...', lat: X, lon: Y, provincia: '...' }
  const re = /\{\s*nome:\s*'([^']+)',\s*lat:\s*(-?\d+(?:\.\d+)?),\s*lon:\s*(-?\d+(?:\.\d+)?),\s*provincia:\s*'([^']+)'\s*\}/g;

  type Mun = { nome: string; lat: number; lon: number; provincia: string };
  const municipiosFuente: Mun[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(txt)) !== null) {
    municipiosFuente.push({
      nome: m[1],
      lat: Number.parseFloat(m[2]),
      lon: Number.parseFloat(m[3]),
      provincia: m[4],
    });
  }
  console.log(`Leídos ${municipiosFuente.length} municipios del archivo fuente.`);

  const client = new Client({
    user: process.env.SUPABASE_DB_USER!,
    password: process.env.SUPABASE_DB_PASSWORD!,
    host: process.env.SUPABASE_DB_HOST!,
    port: Number.parseInt(process.env.SUPABASE_DB_PORT!, 10),
    database: process.env.SUPABASE_DB_NAME!,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("✓ Conectado.");

  // Cargo todos los municipios gallegos de mi BD para hacer el match.
  const dbRes = await client.query<{
    codigo_ine: string;
    nombre: string;
    provincia_codigo: string;
  }>(
    "select codigo_ine, nombre, provincia_codigo from public.municipios where provincia_codigo in ('15','27','32','36')",
  );
  const dbMunis = dbRes.rows;
  console.log(`En BD: ${dbMunis.length} municipios gallegos.`);

  // Construimos un índice por nombre normalizado sin artículo.
  const indice = new Map<string, { codigo_ine: string; provincia_codigo: string }>();
  for (const m of dbMunis) {
    indice.set(clave(m.nombre), { codigo_ine: m.codigo_ine, provincia_codigo: m.provincia_codigo });
  }

  let actualizados = 0;
  let noEncontrados: string[] = [];

  for (const muni of municipiosFuente) {
    const norm = clave(muni.nome);
    const enc = indice.get(norm);
    if (!enc) {
      noEncontrados.push(muni.nome);
      continue;
    }
    await client.query(
      "update public.municipios set latitud = $1, longitud = $2 where codigo_ine = $3",
      [muni.lat, muni.lon, enc.codigo_ine],
    );
    actualizados++;
  }

  console.log(`\n✓ Actualizados ${actualizados} municipios con coordenadas.`);
  if (noEncontrados.length > 0) {
    console.log(`✗ No encontrados (${noEncontrados.length}):`);
    for (const n of noEncontrados) console.log(`  - ${n}`);
  }

  // Verificamos cuántos gallegos tienen ya coordenadas.
  const verif = await client.query<{ con_coords: number; sin_coords: number }>(
    `select
       count(*) filter (where latitud is not null)::int as con_coords,
       count(*) filter (where latitud is null)::int as sin_coords
     from public.municipios
     where provincia_codigo in ('15','27','32','36')`,
  );
  console.log(`\nResumen Galicia: ${verif.rows[0].con_coords} con coords / ${verif.rows[0].sin_coords} sin coords`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

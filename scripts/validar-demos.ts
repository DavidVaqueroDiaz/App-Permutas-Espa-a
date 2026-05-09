/**
 * Valida data/demo_anuncios.json contra los catalogos reales de la BD:
 * - sectores (codigo)
 * - ccaa (codigo INE)
 * - cuerpos (denominacion + codigo_oficial + sector)
 * - especialidades (denominacion + codigo_oficial + cuerpo)
 * - municipios (denominacion + provincia)
 *
 * NO modifica nada. Solo reporta:
 * - Cuantos anuncios resuelven correctamente.
 * - Cuantos cuerpos/especialidades/municipios NO se pueden resolver.
 * - Lista de valores no resueltos para que el usuario decida si los
 *   ajusta a mano o aceptamos el matching aproximado.
 */
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

// .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

type Demo = {
  sector_codigo: string;
  ccaa_codigo: string;
  cuerpo_codigo_oficial: string | null;
  cuerpo_denominacion: string;
  especialidad_codigo_oficial: string | null;
  especialidad_denominacion: string | null;
  municipio_actual_nombre: string;
  provincia_actual_nombre: string;
  destinos: Array<{ tipo: string; nombre: string }>;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['"`]/g, "")
    .replace(/[\s\-_/]+/g, " ")
    .trim();
}

async function main() {
  const arr: Demo[] = JSON.parse(
    fs.readFileSync("data/demo_anuncios.json", "utf8"),
  );
  console.log(`Validando ${arr.length} anuncios demo...\n`);

  const client = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // Cargar catalogos
  const sectores = (await client.query("select codigo from public.sectores")).rows.map((r) => r.codigo);
  const ccaa = (await client.query("select codigo_ine from public.ccaa")).rows.map((r) => r.codigo_ine);
  const cuerpos = (await client.query("select id, sector_codigo, codigo_oficial, denominacion from public.cuerpos")).rows;
  const especialidades = (await client.query("select id, cuerpo_id, codigo_oficial, denominacion from public.especialidades")).rows;
  const municipiosRows = (await client.query("select codigo_ine, nombre, provincia_codigo from public.municipios")).rows;

  // Mapas para resolver rapido
  const cuerpoPorClave = new Map<string, typeof cuerpos>();
  for (const c of cuerpos) {
    const k1 = norm(c.denominacion) + "::" + c.sector_codigo;
    if (!cuerpoPorClave.has(k1)) cuerpoPorClave.set(k1, []);
    cuerpoPorClave.get(k1)!.push(c);
  }

  const especialidadPorClave = new Map<string, typeof especialidades>();
  for (const e of especialidades) {
    const k = norm(e.denominacion) + "::" + e.cuerpo_id;
    if (!especialidadPorClave.has(k)) especialidadPorClave.set(k, []);
    especialidadPorClave.get(k)!.push(e);
  }

  const municipioPorNombre = new Map<string, typeof municipiosRows>();
  for (const m of municipiosRows) {
    const k = norm(m.nombre);
    if (!municipioPorNombre.has(k)) municipioPorNombre.set(k, []);
    municipioPorNombre.get(k)!.push(m);
  }

  // Validar
  const errores: string[] = [];
  const cuerposNoEncontrados = new Set<string>();
  const especialidadesNoEncontradas = new Set<string>();
  const municipiosNoEncontrados = new Set<string>();
  let resuelven = 0;

  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    const errs: string[] = [];

    if (!sectores.includes(a.sector_codigo))
      errs.push(`sector "${a.sector_codigo}" desconocido`);
    if (!ccaa.includes(a.ccaa_codigo))
      errs.push(`ccaa "${a.ccaa_codigo}" desconocida`);

    // Cuerpo
    const cuerposEncontrados = cuerpoPorClave.get(norm(a.cuerpo_denominacion) + "::" + a.sector_codigo);
    if (!cuerposEncontrados || cuerposEncontrados.length === 0) {
      errs.push(`cuerpo "${a.cuerpo_denominacion}" (sector ${a.sector_codigo}) no encontrado`);
      cuerposNoEncontrados.add(`${a.sector_codigo} :: ${a.cuerpo_denominacion}`);
    }

    // Especialidad (si tiene)
    if (a.especialidad_denominacion) {
      let encontrada = false;
      if (cuerposEncontrados) {
        for (const c of cuerposEncontrados) {
          const e = especialidadPorClave.get(norm(a.especialidad_denominacion) + "::" + c.id);
          if (e && e.length > 0) { encontrada = true; break; }
        }
      }
      if (!encontrada) {
        especialidadesNoEncontradas.add(`${a.cuerpo_denominacion} :: ${a.especialidad_denominacion}`);
      }
    }

    // Municipio actual
    const muniMatches = municipioPorNombre.get(norm(a.municipio_actual_nombre));
    if (!muniMatches || muniMatches.length === 0) {
      municipiosNoEncontrados.add(a.municipio_actual_nombre);
    }

    if (errs.length === 0) resuelven++;
    else errores.push(`#${i}: ${errs.join("; ")}`);
  }

  console.log("=== RESUMEN ===");
  console.log(`Total anuncios:           ${arr.length}`);
  console.log(`Resuelven 100%:           ${resuelven}`);
  console.log(`Cuerpos no encontrados:   ${cuerposNoEncontrados.size}`);
  console.log(`Especialidades no encs:   ${especialidadesNoEncontradas.size}`);
  console.log(`Municipios no encontrad.: ${municipiosNoEncontrados.size}`);
  console.log("");

  if (cuerposNoEncontrados.size > 0) {
    console.log("--- CUERPOS NO ENCONTRADOS (denominacion exacta) ---");
    for (const c of [...cuerposNoEncontrados].sort()) console.log("  " + c);
    console.log("");
  }
  if (especialidadesNoEncontradas.size > 0) {
    console.log("--- ESPECIALIDADES NO ENCONTRADAS ---");
    for (const e of [...especialidadesNoEncontradas].sort()) console.log("  " + e);
    console.log("");
  }
  if (municipiosNoEncontrados.size > 0) {
    console.log("--- MUNICIPIOS NO ENCONTRADOS ---");
    for (const m of [...municipiosNoEncontrados].sort()) console.log("  " + m);
    console.log("");
  }

  // Cuerpos disponibles por sector (para diagnostico)
  console.log("--- CUERPOS DISPONIBLES EN BD POR SECTOR ---");
  const porSector: Record<string, string[]> = {};
  for (const c of cuerpos) {
    if (!porSector[c.sector_codigo]) porSector[c.sector_codigo] = [];
    porSector[c.sector_codigo].push(`${c.codigo_oficial ?? "—"} ${c.denominacion}`);
  }
  for (const [s, cs] of Object.entries(porSector).sort()) {
    console.log(`\n${s} (${cs.length}):`);
    for (const c of cs) console.log("  " + c);
  }

  await client.end();
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

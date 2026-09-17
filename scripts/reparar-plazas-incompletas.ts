/**
 * Completa la lista de municipios deseados de los anuncios activos a los
 * que les faltan municipios de los atajos que eligieron (toda una CCAA,
 * toda una provincia o municipios sueltos). Solo AÑADE lo que ya habia
 * elegido la persona; nunca quita nada.
 *
 *   npx tsx scripts/reparar-plazas-incompletas.ts --probar   (ROLLBACK)
 *   npx tsx scripts/reparar-plazas-incompletas.ts --aplicar  (COMMIT)
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const modo = process.argv[2];
if (modo !== "--probar" && modo !== "--aplicar") {
  console.error("Uso: npx tsx scripts/reparar-plazas-incompletas.ts --probar | --aplicar");
  process.exit(1);
}

const ESPERADAS = `
  with activos as (
    select a.id, a.municipio_actual_codigo
      from public.anuncios a
     where a.estado = 'activo' and not a.es_demo
  ),
  esperadas as (
    select act.id as anuncio_id, m.codigo_ine as codigo
      from activos act
      join public.anuncio_atajos t on t.anuncio_id = act.id and t.tipo = 'ccaa'
      join public.provincias pr on pr.ccaa_codigo = t.valor
      join public.municipios m on m.provincia_codigo = pr.codigo_ine
     where m.codigo_ine <> act.municipio_actual_codigo
    union
    select act.id, m.codigo_ine
      from activos act
      join public.anuncio_atajos t on t.anuncio_id = act.id and t.tipo = 'provincia'
      join public.municipios m on m.provincia_codigo = t.valor
     where m.codigo_ine <> act.municipio_actual_codigo
    union
    select act.id, t.valor::char(5)
      from activos act
      join public.anuncio_atajos t on t.anuncio_id = act.id and t.tipo = 'municipio_individual'
     where t.valor::char(5) <> act.municipio_actual_codigo
  )`;

async function main() {
  const db = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 120_000,
  });
  await db.connect();
  let ok = false;
  try {
    await db.query("begin");
    const antes = (await db.query(`select * from public.admin_anuncios_plazas_incompletas() order by anuncio_id`)).rows;
    console.log(`Anuncios incompletos antes: ${antes.length}`);
    for (const r of antes) console.log(`  ${String(r.anuncio_id).slice(0, 8)}: faltan ${r.faltan}`);

    const totalAntes = (await db.query(`select count(*)::int as n from public.anuncio_plazas_deseadas`)).rows[0].n;
    const ins = await db.query(
      `${ESPERADAS}
       insert into public.anuncio_plazas_deseadas (anuncio_id, municipio_codigo)
       select e.anuncio_id, e.codigo from esperadas e
       on conflict do nothing
       returning anuncio_id`,
    );
    const porAnuncio = new Map<string, number>();
    for (const r of ins.rows) porAnuncio.set(r.anuncio_id, (porAnuncio.get(r.anuncio_id) ?? 0) + 1);
    console.log(`Municipios añadidos: ${ins.rowCount}`);
    for (const [id, n] of porAnuncio) console.log(`  ${id.slice(0, 8)}: +${n}`);

    const despues = (await db.query(`select * from public.admin_anuncios_plazas_incompletas()`)).rows;
    const totalDespues = (await db.query(`select count(*)::int as n from public.anuncio_plazas_deseadas`)).rows[0].n;
    const cuadra = antes.reduce((n, r) => n + Number(r.faltan), 0) === ins.rowCount;
    console.log(`Incompletos despues: ${despues.length} | filas ${totalAntes} -> ${totalDespues}`);
    ok = despues.length === 0 && totalDespues - totalAntes === ins.rowCount && cuadra;
    console.log(ok ? "OK: todo completo y solo se ha añadido lo que faltaba." : "KO: algo no cuadra.");

    if (modo === "--aplicar" && ok) {
      await db.query("commit");
      console.log("REPARACION APLICADA (COMMIT).");
    } else {
      await db.query("rollback");
      console.log("ROLLBACK: no se ha cambiado nada.");
    }
  } catch (e) {
    await db.query("rollback").catch(() => {});
    console.error("ERROR -> ROLLBACK:", (e as Error).message);
    ok = false;
  } finally {
    await db.end();
  }
  process.exit(ok ? 0 : 1);
}

main();

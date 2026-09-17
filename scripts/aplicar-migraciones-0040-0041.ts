/**
 * Aplica las migraciones 0040 y 0041 (aditivas) y 0042 (restrictiva)
 * con comprobaciones dentro de la transaccion.
 *
 *   npx tsx scripts/aplicar-migraciones-0040-0041.ts 0040 --aplicar
 *   npx tsx scripts/aplicar-migraciones-0040-0041.ts 0041 --probar|--aplicar
 *   npx tsx scripts/aplicar-migraciones-0040-0041.ts 0042 --probar|--aplicar
 *
 * La 0042 solo debe aplicarse cuando el codigo nuevo ya esta publicado.
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const [cual, modo] = process.argv.slice(2);
const ARCHIVOS: Record<string, string> = {
  "0040": "supabase/migrations/0040_panel_recordatorios_atrasados.sql",
  "0041": "supabase/migrations/0041_arreglar_rate_limit.sql",
  "0042": "supabase/migrations/0042_cerrar_funciones_publicas.sql",
};
if (!ARCHIVOS[cual] || (modo !== "--probar" && modo !== "--aplicar")) {
  console.error("Uso: npx tsx scripts/aplicar-migraciones-0040-0041.ts 0040|0041|0042 --probar|--aplicar");
  process.exit(1);
}

let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  console.log(`  ${ok ? "OK " : "KO "} ${nombre}${detalle ? ` (${detalle})` : ""}`);
  if (!ok) fallos++;
}

async function permiso(db: Client, rol: string, fn: string): Promise<boolean | null> {
  const r = await db.query(
    `select bool_and(has_function_privilege($1, p.oid, 'EXECUTE')) as ok, count(*)::int as n
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = $2`,
    [rol, fn],
  );
  return r.rows[0].n === 0 ? null : r.rows[0].ok === true;
}

async function verificar0040(db: Client) {
  await db.query("set local role service_role");
  const m = (await db.query("select public.admin_metricas() as m")).rows[0].m;
  await db.query("reset role");
  comprobar("admin_metricas da recordatorios_atrasados", typeof m?.recordatorios_atrasados === "number", `valor ${m?.recordatorios_atrasados}`);
  comprobar("admin_metricas conserva el resto", !!m?.usuarios && Array.isArray(m?.tareas));
  for (const rol of ["anon", "authenticated"]) {
    comprobar(`admin_metricas cerrada para ${rol}`, (await permiso(db, rol, "admin_metricas")) === false);
  }
  comprobar("admin_metricas abierta al servidor", (await permiso(db, "service_role", "admin_metricas")) === true);
}

async function verificar0041(db: Client) {
  const clave = `prueba-0041-${Date.now()}`;
  await db.query("set local role service_role");
  const r1 = (await db.query(`select * from public.chequear_rate_limit($1, 600, 2)`, [clave])).rows[0];
  const r2 = (await db.query(`select * from public.chequear_rate_limit($1, 600, 2)`, [clave])).rows[0];
  const r3 = (await db.query(`select * from public.chequear_rate_limit($1, 600, 2)`, [clave])).rows[0];
  await db.query("reset role");
  comprobar("primera llamada permitida", r1?.permitido === true && r1?.contador === 1, JSON.stringify(r1));
  comprobar("segunda llamada permitida", r2?.permitido === true && r2?.contador === 2, JSON.stringify(r2));
  comprobar("tercera llamada bloqueada (maximo 2)", r3?.permitido === false && r3?.contador === 3, JSON.stringify(r3));
  const otra = (await db.query(`select * from public.chequear_rate_limit($1, 600, 2)`, [clave + "-otra"])).rows[0];
  comprobar("otra clave tiene su propio contador", otra?.contador === 1);
  await db.query(`delete from public.rate_limit where clave like 'prueba-0041-%'`);
}

const CERRADAS = [
  "marcar_notificacion_email_enviada",
  "chequear_rate_limit",
  "limpiar_rate_limit",
  "borrar_conversaciones_caducadas",
  "marcar_anuncios_caducados",
  "limpiar_demos_sinteticos",
];
const BORRADAS = [
  "tomar_email_para_notificar_cadena",
  "emails_otros_participantes_post_cierre",
  "datos_email_destinatario_mensaje",
];

async function verificar0042(db: Client) {
  const esperadas = (await db.query(
    `select count(*)::int as n from public.conversaciones c
      where not c.es_demo
        and not exists (select 1 from public.perfiles_usuario p
                         where p.es_admin and p.id in (c.usuario_a_id, c.usuario_b_id))`,
  )).rows[0].n;
  await db.query("set local role service_role");
  const m = (await db.query("select public.admin_metricas() as m")).rows[0].m;
  await db.query("reset role");
  comprobar(
    "las cifras del panel no cuentan conversaciones de admin",
    m?.conversaciones?.total === esperadas,
    `${m?.conversaciones?.total} vs ${esperadas}`,
  );
  comprobar("admin_metricas sigue completa", typeof m?.recordatorios_atrasados === "number" && Array.isArray(m?.tareas));
  for (const fn of BORRADAS) {
    comprobar(`${fn} ya no existe`, (await permiso(db, "service_role", fn)) === null);
  }
  for (const fn of CERRADAS) {
    const anon = await permiso(db, "anon", fn);
    const auth = await permiso(db, "authenticated", fn);
    const svc = await permiso(db, "service_role", fn);
    comprobar(`${fn} solo servidor`, anon === false && auth === false && svc === true, `anon=${anon} auth=${auth} svc=${svc}`);
  }
  for (const fn of ["renovar_anuncio", "reemplazar_plazas_deseadas", "iniciar_conversacion", "marcar_conversacion_vista", "es_admin_actual"]) {
    comprobar(`${fn} sigue disponible para usuarios`, (await permiso(db, "authenticated", fn)) === true);
  }
  // Las tareas programadas deben poder seguir ejecutando sus funciones.
  const jobs = (await db.query(`select jobname, username, command from cron.job`)).rows;
  for (const j of jobs) {
    const fn = /public\.([a-z_]+)\(/.exec(j.command)?.[1];
    if (!fn) continue;
    const ok = await permiso(db, j.username, fn);
    comprobar(`tarea ${j.jobname} (${j.username}) puede ejecutar ${fn}`, ok === true);
  }
  // Un usuario registrado ya no puede gastar el cupo de otro.
  const usuario = (await db.query(`select id from auth.users limit 1`)).rows[0].id;
  await db.query("savepoint s1");
  await db.query("set local role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: usuario, role: "authenticated" })]);
  let bloqueado = false;
  try {
    await db.query(`select * from public.chequear_rate_limit('prueba-0042', 60, 5)`);
  } catch {
    bloqueado = true;
  }
  await db.query("rollback to savepoint s1");
  comprobar("un usuario registrado no puede tocar el limitador", bloqueado);
  await db.query("savepoint s2");
  await db.query("set local role service_role");
  const r = await db.query(`select * from public.chequear_rate_limit('prueba-0042', 60, 5)`);
  await db.query("rollback to savepoint s2");
  comprobar("el servidor si puede usar el limitador", r.rows[0]?.permitido === true);
}

async function main() {
  const sql = fs.readFileSync(path.join(process.cwd(), ARCHIVOS[cual]), "utf8");
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
  try {
    await db.query("begin");
    await db.query(sql);
    console.log(`Comprobaciones ${cual}:`);
    if (cual === "0040") await verificar0040(db);
    else if (cual === "0041") await verificar0041(db);
    else await verificar0042(db);
    if (modo === "--probar" || fallos > 0) {
      await db.query("rollback");
      console.log(`\n${fallos === 0 ? "Ensayo correcto" : fallos + " fallos"}. ROLLBACK: no se ha cambiado nada.`);
    } else {
      await db.query("commit");
      console.log(`\nMIGRACION ${cual} APLICADA (COMMIT).`);
    }
  } catch (e) {
    await db.query("rollback").catch(() => {});
    console.error("\nERROR -> ROLLBACK:", (e as Error).message);
    fallos++;
  } finally {
    await db.end();
  }
  process.exit(fallos === 0 ? 0 : 1);
}

main();

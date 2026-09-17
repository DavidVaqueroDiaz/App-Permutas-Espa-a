/**
 * Aplica la migracion 0039 con red de seguridad.
 *
 *   npx tsx scripts/aplicar-migracion-0039.ts --probar   (ensayo: aplica,
 *       prueba cada funcion con datos reales y hace ROLLBACK; no cambia nada)
 *   npx tsx scripts/aplicar-migracion-0039.ts --aplicar  (aplica, comprueba
 *       permisos y hace COMMIT solo si todo cuadra)
 *
 * No imprime emails ni alias: solo si/no y recuentos.
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const MIGRACION = path.join(process.cwd(), "supabase/migrations/0039_avisos_servidor_renovar_y_panel.sql");
const modo = process.argv[2];
if (modo !== "--probar" && modo !== "--aplicar") {
  console.error("Uso: npx tsx scripts/aplicar-migracion-0039.ts --probar | --aplicar");
  process.exit(1);
}

const SOLO_SERVIDOR = [
  "aviso_cadena_tomar_email",
  "aviso_cadena_liberar",
  "emails_aviso_cierre",
  "datos_aviso_mensaje",
  "admin_anuncios_plazas_incompletas",
  "admin_metricas",
  "limpiar_envios_email",
];
const PARA_USUARIOS = ["renovar_anuncio", "reemplazar_plazas_deseadas"];
// El codigo publicado hoy sigue usandolas con la sesion del usuario: la
// 0039 NO debe quitarles el permiso (eso lo hace la 0042).
const SIGUEN_ABIERTAS = [
  "tomar_email_para_notificar_cadena",
  "emails_otros_participantes_post_cierre",
  "datos_email_destinatario_mensaje",
  "chequear_rate_limit",
  "marcar_notificacion_email_enviada",
];

let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  console.log(`  ${ok ? "OK " : "KO "} ${nombre}${detalle ? ` (${detalle})` : ""}`);
  if (!ok) fallos++;
}

async function permiso(db: Client, rol: string, fn: string): Promise<boolean> {
  const r = await db.query(
    `select bool_and(has_function_privilege($1, p.oid, 'EXECUTE')) as ok
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = $2`,
    [rol, fn],
  );
  return r.rows[0]?.ok === true;
}

async function comoUsuario(db: Client, usuarioId: string) {
  await db.query("set local role authenticated");
  const claims = JSON.stringify({ sub: usuarioId, role: "authenticated" });
  await db.query("select set_config('request.jwt.claims', $1, true)", [claims]);
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [usuarioId]);
}

async function comoServidor(db: Client) {
  await db.query("set local role service_role");
}

async function comoAdminBd(db: Client) {
  await db.query("reset role");
}

async function comprobarPermisos(db: Client) {
  console.log("\nPermisos:");
  for (const fn of SOLO_SERVIDOR) {
    const anon = await permiso(db, "anon", fn);
    const auth = await permiso(db, "authenticated", fn);
    const svc = await permiso(db, "service_role", fn);
    comprobar(`${fn} solo servidor`, !anon && !auth && svc, `anon=${anon} auth=${auth} svc=${svc}`);
  }
  for (const fn of PARA_USUARIOS) {
    const anon = await permiso(db, "anon", fn);
    const auth = await permiso(db, "authenticated", fn);
    comprobar(`${fn} para usuarios registrados`, !anon && auth, `anon=${anon} auth=${auth}`);
  }
  for (const fn of SIGUEN_ABIERTAS) {
    comprobar(`${fn} sigue disponible para el codigo publicado`, await permiso(db, "authenticated", fn));
  }
  for (const fn of ["marcar_notificacion_email_enviada", "chequear_rate_limit"]) {
    comprobar(`${fn} usable por el servidor`, await permiso(db, "service_role", fn));
  }
  const tabla = await db.query(
    `select c.relrowsecurity as rls,
            has_table_privilege('anon', 'public.envios_email', 'select') as anon_lee,
            has_table_privilege('authenticated', 'public.envios_email', 'select') as auth_lee
       from pg_class c where c.oid = 'public.envios_email'::regclass`,
  );
  const t = tabla.rows[0];
  comprobar("envios_email protegida", t.rls && !t.anon_lee && !t.auth_lee, JSON.stringify(t));
  const trig = await db.query(
    `select p.prosecdef from pg_proc p where p.proname = 'tg_limpiar_recordatorio_si_se_renueva'`,
  );
  comprobar("trigger de recordatorio con permisos propios", trig.rows[0]?.prosecdef === true);
  const cron = await db.query(`select count(*)::int as n from cron.job where jobname = 'limpiar-envios-email'`);
  comprobar("tarea diaria limpiar-envios-email", cron.rows[0].n === 1);
}

async function pruebasFuncionales(db: Client) {
  console.log("\nPruebas con datos reales (se desharan):");

  // --- renovar_anuncio + reinicio del recordatorio ---
  const anuncio = (await db.query(
    `select a.id, a.usuario_id, a.caduca_el from public.anuncios a
      where a.estado = 'activo' and not a.es_demo order by a.creado_el limit 1`,
  )).rows[0];
  await db.query(`insert into public.recordatorios_caducidad (anuncio_id) values ($1) on conflict do nothing`, [anuncio.id]);
  await db.query("savepoint s1");
  await comoUsuario(db, anuncio.usuario_id);
  const ren = await db.query(`select public.renovar_anuncio($1) as caduca`, [anuncio.id]);
  await comoAdminBd(db);
  const nueva = new Date(ren.rows[0].caduca).getTime();
  const esperada = Date.now() + 182 * 86_400_000;
  comprobar("renovar_anuncio pone la caducidad a 6 meses", Math.abs(nueva - esperada) < 5 * 86_400_000);
  const rec = await db.query(`select count(*)::int as n from public.recordatorios_caducidad where anuncio_id = $1`, [anuncio.id]);
  comprobar("renovar reinicia el recordatorio de caducidad", rec.rows[0].n === 0);

  // Reactiva un caducado
  await db.query(`update public.anuncios set estado = 'caducado' where id = $1`, [anuncio.id]);
  await comoUsuario(db, anuncio.usuario_id);
  await db.query(`select public.renovar_anuncio($1)`, [anuncio.id]);
  await comoAdminBd(db);
  const est = await db.query(`select estado from public.anuncios where id = $1`, [anuncio.id]);
  comprobar("renovar reactiva un anuncio caducado", est.rows[0].estado === "activo");

  // Otro usuario no puede renovarlo
  const otro = (await db.query(
    `select id from auth.users where id <> $1 limit 1`, [anuncio.usuario_id],
  )).rows[0];
  await db.query("savepoint s2");
  await comoUsuario(db, otro.id);
  let bloqueado = false;
  try {
    await db.query(`select public.renovar_anuncio($1)`, [anuncio.id]);
  } catch {
    bloqueado = true;
  }
  await db.query("rollback to savepoint s2");
  await comoAdminBd(db);
  comprobar("un usuario no puede renovar el anuncio de otro", bloqueado);

  // --- reemplazar_plazas_deseadas ---
  const incompletos = (await db.query(`select * from public.admin_anuncios_plazas_incompletas()`)).rows;
  comprobar("admin_anuncios_plazas_incompletas responde", Array.isArray(incompletos), `${incompletos.length} anuncios`);
  const grande = (await db.query(
    `select a.id, a.usuario_id, a.municipio_actual_codigo,
            (select count(*) from public.anuncio_plazas_deseadas p where p.anuncio_id = a.id)::int as n
       from public.anuncios a
      where a.estado = 'activo' and not a.es_demo
      order by n desc limit 1`,
  )).rows[0];
  const codigos = (await db.query(
    `select municipio_codigo as c from public.anuncio_plazas_deseadas where anuncio_id = $1`, [grande.id],
  )).rows.map((r) => String(r.c));
  await comoUsuario(db, grande.usuario_id);
  const rep = await db.query(`select public.reemplazar_plazas_deseadas($1, $2::text[]) as n`, [
    grande.id,
    [...codigos, grande.municipio_actual_codigo, codigos[0]],
  ]);
  await comoAdminBd(db);
  comprobar(
    "reemplazar_plazas_deseadas guarda listas de mas de 1000 sin duplicar ni meter el municipio propio",
    rep.rows[0].n === grande.n && grande.n > 1000,
    `${grande.n} municipios`,
  );
  await db.query("savepoint s3");
  await comoUsuario(db, grande.usuario_id);
  let invalidoFalla = false;
  try {
    await db.query(`select public.reemplazar_plazas_deseadas($1, $2::text[])`, [grande.id, ["99999"]]);
  } catch {
    invalidoFalla = true;
  }
  await db.query("rollback to savepoint s3");
  await comoAdminBd(db);
  const trasFallo = await db.query(
    `select count(*)::int as n from public.anuncio_plazas_deseadas where anuncio_id = $1`, [grande.id],
  );
  comprobar("un codigo invalido no borra la lista anterior", invalidoFalla && trasFallo.rows[0].n === grande.n);

  // --- avisos de cadena (solo servidor) ---
  const destinatario = (await db.query(
    `select u.id from auth.users u join public.anuncios a on a.usuario_id = u.id
      where not a.es_demo and u.email_confirmed_at is not null limit 1`,
  )).rows[0].id;
  const huella = "prueba-0039-" + Date.now();
  await comoServidor(db);
  const t1 = (await db.query(`select public.aviso_cadena_tomar_email($1, $2) as e`, [destinatario, huella])).rows[0].e;
  const t2 = (await db.query(`select public.aviso_cadena_tomar_email($1, $2) as e`, [destinatario, huella])).rows[0].e;
  await db.query(`select public.aviso_cadena_liberar($1, $2)`, [destinatario, huella]);
  const t3 = (await db.query(`select public.aviso_cadena_tomar_email($1, $2) as e`, [destinatario, huella])).rows[0].e;
  await comoAdminBd(db);
  comprobar("aviso_cadena_tomar_email da el correo la primera vez", typeof t1 === "string" && t1.includes("@"));
  comprobar("y no lo repite la segunda", t2 === null);
  comprobar("aviso_cadena_liberar permite reintentar", typeof t3 === "string");

  const sintetico = (await db.query(
    `select id from auth.users where email like '%@permutaes.invalid' limit 1`,
  )).rows[0];
  if (sintetico) {
    await comoServidor(db);
    const ts = (await db.query(`select public.aviso_cadena_tomar_email($1, $2) as e`, [sintetico.id, huella])).rows[0].e;
    await comoAdminBd(db);
    comprobar("nunca da correos de cuentas de demostracion", ts === null);
  }

  await db.query("savepoint s4");
  await comoUsuario(db, otro.id);
  let usuarioBloqueado = false;
  try {
    await db.query(`select public.aviso_cadena_tomar_email($1, $2)`, [destinatario, huella + "-x"]);
  } catch {
    usuarioBloqueado = true;
  }
  await db.query("rollback to savepoint s4");
  await comoAdminBd(db);
  comprobar("un usuario registrado NO puede pedir correos", usuarioBloqueado);

  // --- aviso de cierre ---
  await db.query(`update public.anuncios set estado = 'permutado', permutado_el = now() where id = $1`, [anuncio.id]);
  await comoServidor(db);
  const cierre = (await db.query(
    `select * from public.emails_aviso_cierre($1, $2::uuid[])`, [anuncio.id, [destinatario, anuncio.usuario_id]],
  )).rows;
  await comoAdminBd(db);
  const esperadoCierre = destinatario === anuncio.usuario_id ? 0 : 1;
  comprobar("emails_aviso_cierre excluye al dueno", cierre.length === esperadoCierre, `${cierre.length} filas`);
  await db.query(`update public.anuncios set estado = 'activo', permutado_el = null where id = $1`, [anuncio.id]);
  await comoServidor(db);
  const cierreActivo = (await db.query(
    `select * from public.emails_aviso_cierre($1, $2::uuid[])`, [anuncio.id, [destinatario]],
  )).rows;
  await comoAdminBd(db);
  comprobar("y no da nada si el anuncio no esta cerrado", cierreActivo.length === 0);

  // --- aviso de mensaje ---
  const conv = (await db.query(
    `select id, usuario_a_id from public.conversaciones where not es_demo limit 1`,
  )).rows[0];
  if (conv) {
    await comoServidor(db);
    const dm = (await db.query(`select * from public.datos_aviso_mensaje($1, $2)`, [conv.id, conv.usuario_a_id])).rows;
    const dmAjeno = (await db.query(
      `select * from public.datos_aviso_mensaje($1, $2)`, [conv.id, "00000000-0000-4000-8000-000000000000"],
    )).rows;
    await comoAdminBd(db);
    comprobar("datos_aviso_mensaje devuelve el destinatario", dm.length === 1 && String(dm[0].email).includes("@"));
    comprobar("y nada si el remitente no esta en la conversacion", dmAjeno.length === 0);
  }

  // --- metricas del panel ---
  await comoServidor(db);
  const met = (await db.query(`select public.admin_metricas() as m`)).rows[0].m;
  await comoAdminBd(db);
  comprobar("admin_metricas responde", !!met?.usuarios && !!met?.anuncios && Array.isArray(met?.tareas));
  console.log("\nMetricas (solo recuentos):");
  console.log(JSON.stringify({
    usuarios: met.usuarios,
    anuncios: { ...met.anuncios },
    conversaciones: met.conversaciones,
    mensajes: met.mensajes,
    avisos_cadena: met.avisos_cadena,
    recordatorios_caducidad: met.recordatorios_caducidad,
    demos_sinteticos_activos: met.demos_sinteticos_activos,
    reportes_pendientes: met.reportes_pendientes,
    anuncios_plazas_incompletas: met.anuncios_plazas_incompletas,
    tareas: met.tareas.map((t: { nombre: string; ultimo_estado: string; fallos_7d: number }) =>
      `${t.nombre}: ${t.ultimo_estado} (fallos 7d: ${t.fallos_7d})`),
  }, null, 2));
}

async function main() {
  const sql = fs.readFileSync(MIGRACION, "utf8");
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
    await comprobarPermisos(db);
    if (modo === "--probar") {
      await pruebasFuncionales(db);
      await db.query("rollback");
      console.log(`\nENSAYO TERMINADO: ${fallos === 0 ? "todo bien" : fallos + " fallos"}. ROLLBACK, no se ha cambiado nada.`);
    } else if (fallos > 0) {
      await db.query("rollback");
      console.log(`\n${fallos} comprobaciones fallidas -> ROLLBACK. No se ha cambiado nada.`);
    } else {
      await db.query("commit");
      console.log("\nMIGRACION 0039 APLICADA (COMMIT).");
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

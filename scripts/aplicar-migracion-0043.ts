/**
 * Aplica la migracion 0043 (aditiva) con comprobaciones dentro de la
 * transaccion.
 *
 *   npx tsx scripts/aplicar-migracion-0043.ts --probar    (ensayo completo, ROLLBACK)
 *   npx tsx scripts/aplicar-migracion-0043.ts --aplicar   (permisos y datos, COMMIT)
 *
 * El ensayo prueba con datos reales las reservas de avisos y seguimientos
 * (enviar, repetir, confirmar, soltar, reserva atascada, cuentas sin
 * correo) y lo deshace todo. No envia correos ni imprime direcciones.
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
  console.error("Uso: npx tsx scripts/aplicar-migracion-0043.ts --probar|--aplicar");
  process.exit(1);
}
const MIGRACION = path.join(process.cwd(), "supabase/migrations/0043_avisos_confirmados_y_seguimiento.sql");

let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  console.log(`  ${ok ? "OK " : "KO "} ${nombre}${detalle ? ` (${detalle})` : ""}`);
  if (!ok) fallos++;
}

const SOLO_SERVIDOR = [
  "aviso_cadena_reservar",
  "aviso_cadena_confirmar",
  "aviso_cadena_soltar",
  "seguimiento_reservar",
  "seguimiento_confirmar",
  "seguimiento_soltar",
  "admin_metricas",
];

async function permiso(db: Client, rol: string, fn: string): Promise<boolean | null> {
  const r = await db.query(
    `select bool_and(has_function_privilege($1, p.oid, 'EXECUTE')) as ok, count(*)::int as n
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = $2`,
    [rol, fn],
  );
  return r.rows[0].n === 0 ? null : r.rows[0].ok === true;
}

async function comoUsuario(db: Client, usuarioId: string) {
  await db.query("set local role authenticated");
  await db.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: usuarioId, role: "authenticated" }),
  ]);
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [usuarioId]);
}
const comoServidor = (db: Client) => db.query("set local role service_role");
const comoAdminBd = (db: Client) => db.query("reset role");

async function comprobacionesFijas(db: Client) {
  console.log("Permisos y datos:");
  for (const fn of SOLO_SERVIDOR) {
    const anon = await permiso(db, "anon", fn);
    const auth = await permiso(db, "authenticated", fn);
    const svc = await permiso(db, "service_role", fn);
    comprobar(`${fn} solo servidor`, anon === false && auth === false && svc === true, `anon=${anon} auth=${auth} svc=${svc}`);
  }
  for (const fn of ["aviso_cadena_tomar_email", "aviso_cadena_liberar", "emails_aviso_cierre", "datos_aviso_mensaje"]) {
    comprobar(`${fn} sigue para el codigo publicado`, (await permiso(db, "service_role", fn)) === true);
  }
  const t = (await db.query(
    `select c.relrowsecurity as rls,
            has_table_privilege('anon', 'public.seguimientos_permuta', 'select') as anon_lee,
            has_table_privilege('authenticated', 'public.seguimientos_permuta', 'insert') as auth_escribe,
            has_table_privilege('service_role', 'public.seguimientos_permuta', 'insert') as svc_escribe
       from pg_class c where c.oid = 'public.seguimientos_permuta'::regclass`,
  )).rows[0];
  comprobar(
    "seguimientos_permuta protegida",
    t.rls && !t.anon_lee && !t.auth_escribe && t.svc_escribe,
    JSON.stringify(t),
  );
  const svcEnvios = (await db.query(
    `select has_table_privilege('service_role', 'public.envios_email', 'insert') as ok`,
  )).rows[0].ok;
  comprobar("el servidor puede anotar correos en envios_email", svcEnvios === true);

  const sinFecha = (await db.query(
    `select count(*)::int as n from public.cadenas_notificadas where enviado_el is null`,
  )).rows[0].n;
  comprobar("todos los avisos anteriores quedan como enviados", sinFecha === 0, `${sinFecha} sin fecha`);
  const resumen = (await db.query(
    `select count(*)::int as total, count(*) filter (where sin_correo)::int as sin_correo
       from public.cadenas_notificadas`,
  )).rows[0];
  console.log(`  avisos apuntados: ${resumen.total} (sin correo utilizable: ${resumen.sin_correo})`);

  await comoServidor(db);
  const m = (await db.query("select public.admin_metricas() as m")).rows[0].m;
  await comoAdminBd(db);
  comprobar(
    "admin_metricas trae avisos a medias, seguimientos y permutas",
    typeof m?.avisos_cadena?.sin_confirmar === "number" &&
      typeof m?.seguimientos?.primeros === "number" &&
      typeof m?.permutas?.tras_seguimiento === "number",
  );
  comprobar("admin_metricas conserva el resto", !!m?.usuarios && Array.isArray(m?.tareas) && typeof m?.recordatorios_atrasados === "number");
  const envios = (await db.query(`select count(*)::int as n from public.envios_email`)).rows[0].n;
  console.log(`  correos anotados en envios_email hasta ahora: ${envios}`);
}

type Accion = { accion: string; correo: string | null };

async function reservarAviso(db: Client, u: string, h: string): Promise<Accion> {
  await comoServidor(db);
  const r = (await db.query(`select * from public.aviso_cadena_reservar($1, $2)`, [u, h])).rows[0];
  await comoAdminBd(db);
  return r;
}

async function reservarSeguimiento(db: Client, u: string, h: string, n: number): Promise<Accion> {
  await comoServidor(db);
  const r = (await db.query(`select * from public.seguimiento_reservar($1, $2, $3)`, [u, h, n])).rows[0];
  await comoAdminBd(db);
  return r;
}

async function servidor<T = number>(db: Client, sql: string, params: unknown[]): Promise<T> {
  await comoServidor(db);
  const r = (await db.query(sql, params)).rows[0];
  await comoAdminBd(db);
  return Object.values(r)[0] as T;
}

async function pruebasFuncionales(db: Client) {
  console.log("\nPruebas con datos reales (se desharan):");
  const real = (await db.query(
    `select u.id from auth.users u
      where u.email_confirmed_at is not null
        and u.email not like '%@permutaes.test' and u.email not like '%@permutaes.invalid'
      limit 1`,
  )).rows[0].id as string;
  const otro = (await db.query(`select id from auth.users where id <> $1 limit 1`, [real])).rows[0].id as string;
  const marca = `prueba-0043-${Date.now()}`;

  // --- avisos: enviar, repetir, confirmar ---
  const h1 = `${marca}-a`;
  const a1 = await reservarAviso(db, real, h1);
  comprobar("aviso nuevo: hay que enviarlo y trae el correo", a1.accion === "enviar" && !!a1.correo?.includes("@"));
  const a2 = await reservarAviso(db, real, h1);
  comprobar("mientras se envia, otra revision no lo repite", a2.accion === "nada");
  const c1 = await servidor(db, `select public.aviso_cadena_confirmar($1, $2::text[])`, [real, [h1]]);
  comprobar("confirmar marca el aviso como enviado", c1 === 1);
  const a3 = await reservarAviso(db, real, h1);
  comprobar("un aviso enviado no se repite", a3.accion === "nada");
  const s1 = await servidor(db, `select public.aviso_cadena_soltar($1, $2::text[])`, [real, [h1]]);
  comprobar("soltar nunca borra un aviso enviado", s1 === 0);

  // --- avisos: fallo del correo y reintento ---
  const h2 = `${marca}-b`;
  await reservarAviso(db, real, h2);
  const s2 = await servidor(db, `select public.aviso_cadena_soltar($1, $2::text[])`, [real, [h2]]);
  comprobar("si el correo falla, se suelta la reserva", s2 === 1);
  const a4 = await reservarAviso(db, real, h2);
  comprobar("y se puede volver a intentar", a4.accion === "enviar");

  // --- avisos: envio cortado a medias ---
  await db.query(
    `update public.cadenas_notificadas set notificada_el = now() - interval '31 minutes'
      where usuario_id = $1 and cadena_huella = $2`,
    [real, h2],
  );
  const a5 = await reservarAviso(db, real, h2);
  comprobar("una reserva atascada de mas de 30 min se reintenta", a5.accion === "enviar");

  // --- avisos: codigo anterior (aviso_cadena_tomar_email) ---
  const h3 = `${marca}-c`;
  const viejo = await servidor<string | null>(db, `select public.aviso_cadena_tomar_email($1, $2)`, [real, h3]);
  const filaVieja = (await db.query(
    `select enviado_el from public.cadenas_notificadas where usuario_id = $1 and cadena_huella = $2`,
    [real, h3],
  )).rows[0];
  comprobar(
    "el codigo publicado sigue apuntando avisos como enviados",
    typeof viejo === "string" && filaVieja?.enviado_el !== null,
  );

  // --- avisos: cuentas sin correo utilizable ---
  const demo = (await db.query(`select id from auth.users where email like '%@permutaes.invalid' limit 1`)).rows[0];
  if (demo) {
    const d1 = await reservarAviso(db, demo.id, `${marca}-d`);
    const d2 = await reservarAviso(db, demo.id, `${marca}-d`);
    comprobar("cuenta de demostracion: queda apuntada sin correo", d1.accion === "sin_correo" && d1.correo === null);
    comprobar("y no se vuelve a intentar", d2.accion === "nada");
  }
  const h4 = `${marca}-e`;
  await db.query(
    `insert into public.cadenas_notificadas (usuario_id, cadena_huella, notificada_el, enviado_el, sin_correo)
     values ($1, $2, now() - interval '10 days', now() - interval '10 days', true)`,
    [real, h4],
  );
  const a6 = await reservarAviso(db, real, h4);
  comprobar("si alguien sin correo lo confirma despues, se le avisa", a6.accion === "enviar");

  // --- avisos: nadie mas puede usarlas ---
  await db.query("savepoint u1");
  await comoUsuario(db, otro);
  let bloqueado = false;
  try {
    await db.query(`select * from public.aviso_cadena_reservar($1, $2)`, [real, `${marca}-x`]);
  } catch {
    bloqueado = true;
  }
  await db.query("rollback to savepoint u1");
  await comoAdminBd(db);
  comprobar("un usuario registrado no puede reservar avisos", bloqueado);

  // --- seguimientos ---
  const hs = `${marca}-s`;
  const g1 = await reservarSeguimiento(db, real, hs, 1);
  comprobar("seguimiento nuevo: hay que enviarlo", g1.accion === "enviar" && !!g1.correo?.includes("@"));
  const g2 = await reservarSeguimiento(db, real, hs, 1);
  comprobar("no se repite mientras se envia", g2.accion === "nada");
  const gc = await servidor(db, `select public.seguimiento_confirmar($1, $2::text[], $3::int[])`, [real, [hs], [1]]);
  comprobar("confirmar el seguimiento", gc === 1);
  const g3 = await reservarSeguimiento(db, real, hs, 1);
  comprobar("un seguimiento enviado no se repite", g3.accion === "nada");
  const g4 = await reservarSeguimiento(db, real, hs, 2);
  comprobar("el recordatorio es independiente del primero", g4.accion === "enviar");
  const gs = await servidor(db, `select public.seguimiento_soltar($1, $2::text[], $3::int[])`, [real, [hs, hs], [1, 2]]);
  comprobar("soltar solo quita el recordatorio sin enviar", gs === 1);
  const g5 = await reservarSeguimiento(db, real, hs, 2);
  comprobar("y el recordatorio se puede reintentar", g5.accion === "enviar");
  await db.query(
    `update public.seguimientos_permuta set reservado_el = now() - interval '31 minutes'
      where usuario_id = $1 and cadena_huella = $2 and numero = 2`,
    [real, hs],
  );
  const g6 = await reservarSeguimiento(db, real, hs, 2);
  comprobar("un seguimiento atascado se reintenta", g6.accion === "enviar");
  await db.query("savepoint u2");
  let numeroMalo = false;
  try {
    await reservarSeguimiento(db, real, hs, 3);
  } catch {
    numeroMalo = true;
  }
  await db.query("rollback to savepoint u2");
  await comoAdminBd(db);
  comprobar("solo existen el seguimiento 1 y el 2", numeroMalo);

  // --- cada usuario solo ve sus seguimientos (exportar mis datos) ---
  await comoUsuario(db, real);
  const propios = (await db.query(`select count(*)::int as n from public.seguimientos_permuta where cadena_huella = $1`, [hs])).rows[0].n;
  await comoAdminBd(db);
  await comoUsuario(db, otro);
  const ajenos = (await db.query(`select count(*)::int as n from public.seguimientos_permuta where cadena_huella = $1`, [hs])).rows[0].n;
  await comoAdminBd(db);
  comprobar("cada persona ve sus seguimientos y no los de otras", propios === 2 && ajenos === 0, `${propios} y ${ajenos}`);
  await db.query("savepoint u3");
  await comoUsuario(db, real);
  let escribeBloqueado = false;
  try {
    await db.query(
      `insert into public.seguimientos_permuta (usuario_id, cadena_huella, numero) values ($1, $2, 1)`,
      [real, `${marca}-y`],
    );
  } catch {
    escribeBloqueado = true;
  }
  await db.query("rollback to savepoint u3");
  await comoAdminBd(db);
  comprobar("nadie puede escribir seguimientos desde la web", escribeBloqueado);

  // --- metricas: permuta marcada tras un seguimiento ---
  const anuncio = (await db.query(
    `select id, usuario_id from public.anuncios where estado = 'activo' and not es_demo limit 1`,
  )).rows[0];
  await comoServidor(db);
  const antes = (await db.query(`select public.admin_metricas() as m`)).rows[0].m;
  await comoAdminBd(db);
  await db.query(
    `insert into public.seguimientos_permuta (usuario_id, cadena_huella, numero, reservado_el, enviado_el)
     values ($1, $2, 1, now() - interval '2 days', now() - interval '2 days')`,
    [anuncio.usuario_id, `${anuncio.id}-${marca}`],
  );
  await db.query(
    `update public.anuncios set estado = 'permutado', permutado_el = now() where id = $1`,
    [anuncio.id],
  );
  await db.query(
    `insert into public.cadenas_notificadas (usuario_id, cadena_huella, notificada_el, enviado_el)
     values ($1, $2, now() - interval '2 hours', null)`,
    [real, `${marca}-z`],
  );
  await comoServidor(db);
  const despues = (await db.query(`select public.admin_metricas() as m`)).rows[0].m;
  await comoAdminBd(db);
  comprobar(
    "el panel cuenta la permuta marcada tras el seguimiento",
    despues.permutas.total === antes.permutas.total + 1 &&
      despues.permutas.tras_seguimiento === antes.permutas.tras_seguimiento + 1,
    `${antes.permutas.tras_seguimiento} -> ${despues.permutas.tras_seguimiento}`,
  );
  comprobar(
    "el panel detecta avisos que se quedaron a medias",
    despues.avisos_cadena.sin_confirmar === antes.avisos_cadena.sin_confirmar + 1,
  );
  comprobar(
    "el panel cuenta los seguimientos enviados",
    despues.seguimientos.primeros >= antes.seguimientos.primeros + 1,
  );
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
    await comprobacionesFijas(db);
    if (modo === "--probar") {
      await pruebasFuncionales(db);
      await db.query("rollback");
      console.log(`\nENSAYO TERMINADO: ${fallos === 0 ? "todo bien" : fallos + " fallos"}. ROLLBACK, no se ha cambiado nada.`);
    } else if (fallos > 0) {
      await db.query("rollback");
      console.log(`\n${fallos} comprobaciones fallidas -> ROLLBACK. No se ha cambiado nada.`);
    } else {
      await db.query("commit");
      console.log("\nMIGRACION 0043 APLICADA (COMMIT).");
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

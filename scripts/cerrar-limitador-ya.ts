/**
 * Adelanta la parte de la migracion 0042 que es segura con el codigo
 * publicado de junio: cierra al publico el limitador, la marca de avisos
 * y las tareas de mantenimiento. (El codigo de junio llama al limitador
 * con la sesion del usuario; sin permiso, deja pasar la accion, igual
 * que hacia antes de arreglarlo en la 0041.) Las tres funciones de
 * emails se retiran con la 0042 completa, tras publicar el codigo nuevo.
 *
 *   npx tsx scripts/cerrar-limitador-ya.ts
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const FUNCIONES = [
  "public.marcar_notificacion_email_enviada(uuid)",
  "public.chequear_rate_limit(text, integer, integer)",
  "public.limpiar_rate_limit()",
  "public.borrar_conversaciones_caducadas()",
  "public.marcar_anuncios_caducados()",
  "public.limpiar_demos_sinteticos()",
];

async function main() {
  const db = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  let ok = true;
  try {
    await db.query("begin");
    for (const f of FUNCIONES) {
      await db.query(`revoke all on function ${f} from public, anon, authenticated`);
      await db.query(`grant execute on function ${f} to service_role`);
    }
    for (const f of FUNCIONES) {
      const r = (await db.query(
        `select has_function_privilege('anon', $1::regprocedure, 'execute') as anon,
                has_function_privilege('authenticated', $1::regprocedure, 'execute') as auth,
                has_function_privilege('service_role', $1::regprocedure, 'execute') as svc`,
        [f],
      )).rows[0];
      const bien = !r.anon && !r.auth && r.svc;
      console.log(`  ${bien ? "OK " : "KO "} ${f} anon=${r.anon} auth=${r.auth} svc=${r.svc}`);
      if (!bien) ok = false;
    }
    await db.query(ok ? "commit" : "rollback");
    console.log(ok ? "APLICADO (COMMIT)." : "ROLLBACK: no se ha cambiado nada.");
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

/**
 * limpiar-demos-sinteticos.ts
 *
 * Borra anuncios demo sinteticos (alias `demosyn_*`) creados al vuelo
 * por el sintetizador de cadenas en modo demo. Estos demos crecen con
 * cada busqueda en modo demo que necesite completar cadenas — un
 * usuario con muchas busquedas distintas puede llegar a generar
 * decenas. Este script se ejecuta manual (o por cron) para mantener
 * la BD limpia.
 *
 * Por defecto borra los que tienen mas de 24 horas; pasar `--all`
 * borra TODOS los sinteticos sin importar la edad.
 *
 * Uso:
 *   npx tsx scripts/limpiar-demos-sinteticos.ts          # > 24h
 *   npx tsx scripts/limpiar-demos-sinteticos.ts --all    # todos
 */
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  const todos = process.argv.includes("--all");

  const c = new Client({
    host: process.env.SUPABASE_DB_HOST!,
    port: Number(process.env.SUPABASE_DB_PORT!),
    user: process.env.SUPABASE_DB_USER!,
    password: process.env.SUPABASE_DB_PASSWORD!,
    database: process.env.SUPABASE_DB_NAME!,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const cuandoSql = todos ? "" : "and u.created_at < now() - interval '24 hours'";

  console.log(`Borrando demos sinteticos${todos ? " (TODOS)" : " > 24h"}...`);

  // 1. Anuncios
  const r1 = await c.query(
    `delete from public.anuncios a
     using auth.users u
     where a.usuario_id = u.id
       and u.email like 'demosyn_%@permutaes.invalid'
       ${cuandoSql}`,
  );
  console.log(`  Anuncios borrados: ${r1.rowCount}`);

  // 2. Usuarios sinteticos (cascada limpia perfiles y conversaciones)
  const r2 = await c.query(
    `delete from auth.users u
     where u.email like 'demosyn_%@permutaes.invalid'
       ${cuandoSql.replace(/u\./g, "u.")}`,
  );
  console.log(`  Usuarios sinteticos borrados: ${r2.rowCount}`);

  await c.end();
  console.log("Listo.");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

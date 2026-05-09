/**
 * Borra TODOS los anuncios marcados como es_demo (591 base + cualquier
 * sintetico acumulado) y sus usuarios asociados. Pensado para ejecutar
 * justo antes del lanzamiento publico, asi la web arranca limpia con
 * solo los anuncios reales que publiquen los usuarios.
 *
 * Lo que SE conserva:
 *   - El sistema de modo demo (toggle, sintetizador, kill-switch).
 *   - Los anuncios reales de usuarios (es_demo=false).
 *
 * Tras este borrado, el "modo demo" seguira funcionando: cuando alguien
 * busque en /auto-permutas y no haya cadenas reales, el sintetizador
 * creara demos al vuelo para su busqueda concreta, y el cron diario
 * los limpiara despues.
 *
 * Uso: npx tsx scripts/borrar-todos-los-demos.ts
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
  const c = new Client({
    host: process.env.SUPABASE_DB_HOST!,
    port: Number(process.env.SUPABASE_DB_PORT!),
    user: process.env.SUPABASE_DB_USER!,
    password: process.env.SUPABASE_DB_PASSWORD!,
    database: process.env.SUPABASE_DB_NAME!,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  // Estado antes
  const antes = await c.query(`
    SELECT
      (SELECT count(*) FROM public.anuncios WHERE es_demo) AS demos,
      (SELECT count(*) FROM public.anuncios WHERE NOT es_demo) AS reales,
      (SELECT count(*) FROM auth.users WHERE email LIKE '%@permutaes.invalid' OR email LIKE '%@permutaes.test') AS users_demo
  `);
  console.log("=== Antes ===");
  console.log(`  Anuncios demo: ${antes.rows[0].demos}`);
  console.log(`  Anuncios reales: ${antes.rows[0].reales}`);
  console.log(`  Usuarios sinteticos en auth: ${antes.rows[0].users_demo}`);

  // Borrar anuncios demo
  console.log("\nBorrando anuncios demo...");
  const a = await c.query("DELETE FROM public.anuncios WHERE es_demo = true");
  console.log(`  Anuncios borrados: ${a.rowCount}`);

  // Borrar usuarios sinteticos (cascada limpia perfiles y demas)
  console.log("Borrando usuarios sinteticos en auth...");
  const u = await c.query(`
    DELETE FROM auth.users
    WHERE email LIKE '%@permutaes.invalid'
       OR email LIKE '%@permutaes.test'
  `);
  console.log(`  Usuarios borrados: ${u.rowCount}`);

  // Estado despues
  const despues = await c.query(`
    SELECT
      (SELECT count(*) FROM public.anuncios WHERE es_demo) AS demos,
      (SELECT count(*) FROM public.anuncios WHERE NOT es_demo) AS reales
  `);
  console.log("\n=== Despues ===");
  console.log(`  Anuncios demo: ${despues.rows[0].demos}`);
  console.log(`  Anuncios reales: ${despues.rows[0].reales}`);

  await c.end();
  console.log("\nListo. La web esta limpia para lanzamiento.");
}
main().catch((e) => { console.error(e); process.exit(1); });

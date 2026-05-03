/**
 * Aplica un archivo SQL contra la base de datos de Supabase
 * configurada en `.env.local`.
 *
 * Uso:
 *   npx tsx scripts/apply-migration.ts supabase/migrations/0002_seed_geografia.sql
 */
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

// Cargar .env.local (todas las claves SUPABASE_DB_*).
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Uso: npx tsx scripts/apply-migration.ts <ruta-al-sql>");
  process.exit(1);
}

const sqlPath = path.resolve(process.cwd(), sqlFile);
if (!fs.existsSync(sqlPath)) {
  console.error(`No existe el archivo: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, "utf8");
console.log(`Cargando ${sqlFile} (${(sql.length / 1024).toFixed(1)} KB).`);

const host = process.env.SUPABASE_DB_HOST;
const port = process.env.SUPABASE_DB_PORT;
const user = process.env.SUPABASE_DB_USER;
const password = process.env.SUPABASE_DB_PASSWORD;
const database = process.env.SUPABASE_DB_NAME;

if (!host || !port || !user || !password || !database) {
  console.error("Faltan variables SUPABASE_DB_* en .env.local.");
  process.exit(1);
}

const client = new Client({
  user,
  password,
  host,
  port: Number.parseInt(port, 10),
  database,
  ssl: { rejectUnauthorized: false },
  // Aumentar el timeout porque algunas migraciones (la geografía con
  // 8.000 municipios, por ejemplo) tardan varios segundos en aplicarse.
  statement_timeout: 5 * 60 * 1000, // 5 minutos.
});

async function main() {
  console.log("Conectando a Supabase...");
  await client.connect();
  console.log("✓ Conexión establecida.");

  console.log("\nEjecutando migración (puede tardar varios segundos)...");
  const t0 = Date.now();
  try {
    await client.query(sql);
    const ms = Date.now() - t0;
    console.log(`✓ Migración aplicada en ${(ms / 1000).toFixed(1)}s.`);
  } catch (e) {
    console.error("✗ ERROR aplicando la migración:");
    console.error((e as Error).message);
    await client.end();
    process.exit(1);
  }

  await client.end();
  console.log("\n✓ Conexión cerrada.");
}

main().catch((e) => {
  console.error("Error inesperado:", e);
  process.exit(1);
});

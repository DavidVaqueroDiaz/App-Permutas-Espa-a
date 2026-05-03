/**
 * Comprueba que la conexión a la base de datos de Supabase
 * configurada en `SUPABASE_DB_URL` (en `.env.local`) funciona.
 *
 * Hace un par de consultas sencillas contra las tablas de
 * referencia (sectores, ccaa, provincias, municipios) e imprime
 * cuántas filas hay en cada una.
 *
 * Ejecutar: npx tsx scripts/test-db-connection.ts
 */
import "dotenv/config";
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

// Cargar manualmente .env.local porque dotenv/config solo carga .env por defecto.
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

const host = process.env.SUPABASE_DB_HOST;
const port = process.env.SUPABASE_DB_PORT;
const user = process.env.SUPABASE_DB_USER;
const password = process.env.SUPABASE_DB_PASSWORD;
const database = process.env.SUPABASE_DB_NAME;

if (!host || !port || !user || !password || !database) {
  console.error(
    "ERROR: Falta alguna variable. Revisa que en .env.local estén SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD y SUPABASE_DB_NAME.",
  );
  process.exit(1);
}

const client = new Client({
  user,
  password,
  host,
  port: Number.parseInt(port, 10),
  database,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("Conectando a la base de datos...");
  await client.connect();
  console.log("✓ Conexión establecida.");

  console.log("\nContando filas en tablas existentes:");

  const tablas = ["sectores", "ccaa", "provincias", "municipios", "cuerpos", "especialidades"];
  for (const tabla of tablas) {
    try {
      const result = await client.query(`select count(*)::int as n from public.${tabla}`);
      console.log(`  ${tabla.padEnd(20)} ${result.rows[0].n}`);
    } catch (e) {
      console.log(`  ${tabla.padEnd(20)} ERROR: ${(e as Error).message}`);
    }
  }

  await client.end();
  console.log("\n✓ Conexión cerrada correctamente.");
}

main().catch((e) => {
  console.error("ERROR durante la prueba de conexión:", e);
  process.exit(1);
});

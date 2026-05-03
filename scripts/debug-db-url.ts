/**
 * Inspecciona SUPABASE_DB_URL en .env.local y muestra todos los
 * componentes de la URL EXCEPTO la contraseña. Sirve para diagnosticar
 * problemas de conexión sin exponer secretos.
 */
import fs from "node:fs";
import path from "node:path";

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

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("No hay SUPABASE_DB_URL en .env.local.");
  process.exit(1);
}

try {
  const parsed = new URL(url);
  console.log("=== Estructura de SUPABASE_DB_URL ===");
  console.log(`  protocol  : ${parsed.protocol}`);
  console.log(`  username  : ${parsed.username}`);
  console.log(`  password  : (longitud: ${parsed.password.length}, oculta)`);
  console.log(`  hostname  : ${parsed.hostname}`);
  console.log(`  port      : ${parsed.port}`);
  console.log(`  pathname  : ${parsed.pathname}`);
  console.log(`  search    : ${parsed.search || "(vacío)"}`);
  console.log("");

  // Diagnóstico básico
  console.log("=== Diagnóstico ===");
  if (parsed.hostname.includes("pooler.supabase.com")) {
    console.log("  ✓ Estás usando el Session/Transaction pooler.");
    if (!parsed.username.includes(".")) {
      console.log("  ✗ El usuario debería ser 'postgres.<project-ref>' (con punto). Tu usuario es solo:", parsed.username);
    }
  } else if (parsed.hostname.startsWith("db.")) {
    console.log("  ⚠ Estás usando Direct connection (db.*.supabase.co). En plan free puede no resolver.");
  } else {
    console.log("  ? Hostname desconocido:", parsed.hostname);
  }

  if (parsed.password.length === 0) {
    console.log("  ✗ La contraseña está vacía.");
  } else if (parsed.password.includes("[") || parsed.password.includes("]")) {
    console.log("  ✗ La contraseña contiene corchetes. ¿Olvidaste sustituir [YOUR-PASSWORD] por la real?");
  }
} catch (e) {
  console.error("ERROR parseando la URL:", (e as Error).message);
  process.exit(1);
}

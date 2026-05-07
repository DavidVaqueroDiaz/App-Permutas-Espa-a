/**
 * Configura el SMTP custom de Supabase Auth via Management API para
 * que los emails de auth (confirmar cuenta, recuperar contrasena,
 * cambiar email) salgan desde noreply@permutaes.es a traves de Resend
 * en lugar del remitente generico de Supabase (noreply@mail.app.supabase.io).
 *
 * Requisitos en `.env.local`:
 *   - SUPABASE_MANAGEMENT_TOKEN (PAT generado en
 *     https://supabase.com/dashboard/account/tokens)
 *   - NEXT_PUBLIC_SUPABASE_URL (de aqui se extrae el project ref)
 *   - RESEND_API_KEY (la misma que usamos para enviar emails desde
 *     Resend; aqui la usamos como password SMTP)
 *
 * Uso:
 *   npx tsx scripts/aplicar-smtp-auth.ts
 *
 * IMPORTANTE: revoca el SUPABASE_MANAGEMENT_TOKEN despues de ejecutarlo.
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

const TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!TOKEN) {
  console.error("Falta SUPABASE_MANAGEMENT_TOKEN en .env.local");
  console.error("Generalo en https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  process.exit(1);
}
if (!RESEND_API_KEY) {
  console.error("Falta RESEND_API_KEY en .env.local");
  process.exit(1);
}

const refMatch = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
if (!refMatch) {
  console.error("No he podido extraer el project ref de NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}
const PROJECT_REF = refMatch[1];

// Configuracion SMTP via Resend.
// Resend acepta SMTP en smtp.resend.com:465 con usuario "resend" y la
// API key como password.
const payload = {
  external_email_enabled: true,
  smtp_admin_email: "noreply@permutaes.es",
  smtp_host: "smtp.resend.com",
  smtp_port: "465",
  smtp_user: "resend",
  smtp_pass: RESEND_API_KEY,
  smtp_sender_name: "PermutaES",
  smtp_max_frequency: 60, // segundos minimos entre emails al mismo usuario
};

async function main() {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
  console.log(`-> PATCH ${url}`);
  console.log(`   Configurando SMTP custom:`);
  console.log(`   - host:    smtp.resend.com:465`);
  console.log(`   - user:    resend`);
  console.log(`   - sender:  PermutaES <noreply@permutaes.es>`);

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`\nFallo (${res.status} ${res.statusText}):`);
    console.error(txt);
    process.exit(1);
  }

  console.log("\nSMTP custom aplicado correctamente.");
  console.log("\nProximos pasos:");
  console.log("  1. Registra una cuenta de prueba con un email real.");
  console.log("  2. Verifica que el email de confirmacion llega desde");
  console.log("     `PermutaES <noreply@permutaes.es>` (no desde");
  console.log("     `Supabase Auth <noreply@mail.app.supabase.io>`).");
  console.log("  3. REVOCA el token en https://supabase.com/dashboard/account/tokens");
}

main().catch((e) => {
  console.error("Error inesperado:", e);
  process.exit(1);
});

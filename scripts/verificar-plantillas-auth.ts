/**
 * Lee la configuracion de Auth de Supabase y muestra el subject + las
 * primeras lineas del HTML de cada plantilla, para verificar que las
 * plantillas que aplico `aplicar-plantillas-auth.ts` quedaron guardadas.
 *
 * Uso:
 *   npx tsx scripts/verificar-plantillas-auth.ts
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
if (!TOKEN || !SUPABASE_URL) {
  console.error("Faltan SUPABASE_MANAGEMENT_TOKEN o NEXT_PUBLIC_SUPABASE_URL.");
  process.exit(1);
}
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!PROJECT_REF) {
  console.error("No se ha podido extraer project ref.");
  process.exit(1);
}

const CAMPOS = [
  ["mailer_subjects_confirmation", "mailer_templates_confirmation_content"],
  ["mailer_subjects_recovery", "mailer_templates_recovery_content"],
  ["mailer_subjects_email_change", "mailer_templates_email_change_content"],
  ["mailer_subjects_magic_link", "mailer_templates_magic_link_content"],
] as const;

async function main() {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    console.error(`Fallo (${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  const conf = (await res.json()) as Record<string, string | null>;

  console.log("Configuracion de Auth en Supabase:\n");
  for (const [campoSubject, campoTpl] of CAMPOS) {
    const subject = conf[campoSubject] ?? "(sin asignar)";
    const tpl = conf[campoTpl] ?? "";
    const tieneBranding = tpl.includes("PermutaES");
    const longitud = tpl.length;
    console.log(`  ${campoSubject}:`);
    console.log(`     subject  -> ${subject}`);
    console.log(
      `     plantilla -> ${longitud} caracteres ${tieneBranding ? "[OK con branding]" : "[!! sin branding]"}`,
    );
    console.log("");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

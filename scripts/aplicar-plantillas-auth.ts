/**
 * Aplica las plantillas de email de Auth (confirm signup, reset password,
 * change email, magic link) contra el panel de Supabase usando la
 * Management API.
 *
 * Requisitos en `.env.local`:
 *   - SUPABASE_MANAGEMENT_TOKEN  (Personal Access Token, generado en
 *     https://supabase.com/dashboard/account/tokens)
 *   - NEXT_PUBLIC_SUPABASE_URL    (de aqui se extrae el project ref)
 *
 * Uso:
 *   npx tsx scripts/aplicar-plantillas-auth.ts
 *
 * Despues de ejecutarlo, REVOCA el token desde el mismo panel de Supabase.
 */
import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// Carga manual de .env.local (mismo patron que apply-migration.ts).
// ---------------------------------------------------------------------------
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

if (!TOKEN) {
  console.error("Falta SUPABASE_MANAGEMENT_TOKEN en .env.local");
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL en .env.local");
  process.exit(1);
}

// Extrae el project ref de "https://<ref>.supabase.co".
const refMatch = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
if (!refMatch) {
  console.error(
    "No he podido extraer el project ref de NEXT_PUBLIC_SUPABASE_URL: " +
      SUPABASE_URL,
  );
  process.exit(1);
}
const PROJECT_REF = refMatch[1];

// ---------------------------------------------------------------------------
// Plantillas
// ---------------------------------------------------------------------------

/**
 * Wrapper HTML compartido (mismo estilo que src/lib/email/plantillas.ts).
 * Tiene la cabecera verde con "PermutaES", el cuerpo con padding y un
 * footer en gris.
 */
function envoltura(opts: { subtitulo: string; cuerpo: string }): string {
  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f8fafb;font-family:'DM Sans',Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0d4a3a;padding:20px 28px;color:#ffffff;">
                <strong style="font-size:18px;letter-spacing:0.2px;">PermutaES</strong>
                <div style="color:#5dcaa5;font-size:12.5px;margin-top:2px;">${opts.subtitulo}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.55;color:#1f2937;">
                ${opts.cuerpo}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;font-size:11.5px;color:#64748b;background:#f8fafb;border-top:1px solid #e2e8f0;">
                PermutaES &middot; Plataforma para detectar cadenas de permuta entre funcionarios publicos en Espana.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const tplConfirmacion = envoltura({
  subtitulo: "Confirma tu email",
  cuerpo: `
    <p style="margin:0 0 12px 0;font-size:16px;">
      Bienvenido a <strong style="color:#0d4a3a;">PermutaES</strong>!
    </p>
    <p style="margin:0 0 18px 0;">
      Has creado una cuenta con el email <strong>{{ .Email }}</strong>.
      Para terminar el registro y poder publicar tu anuncio, confirma
      que esta direccion es tuya pulsando el boton:
    </p>
    <p style="margin:0 0 22px 0;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px;">
        Confirmar mi cuenta
      </a>
    </p>
    <p style="margin:0 0 14px 0;color:#64748b;font-size:12.5px;">
      Si el boton no funciona, copia este enlace en tu navegador:<br>
      <span style="color:#0f6e56;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">
      Si no has sido tu, ignora este email &mdash; sin confirmacion la
      cuenta no queda activa.
    </p>
  `,
});

const tplRecuperacion = envoltura({
  subtitulo: "Recuperar contrasena",
  cuerpo: `
    <p style="margin:0 0 12px 0;font-size:16px;">
      <strong style="color:#0d4a3a;">Has olvidado tu contrasena?</strong>
    </p>
    <p style="margin:0 0 18px 0;">
      Hemos recibido una peticion de cambio de contrasena para la
      cuenta <strong>{{ .Email }}</strong>. Pulsa el boton para elegir
      una nueva. El enlace caduca pronto, asi que no tardes:
    </p>
    <p style="margin:0 0 22px 0;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px;">
        Cambiar mi contrasena
      </a>
    </p>
    <p style="margin:0 0 14px 0;color:#64748b;font-size:12.5px;">
      Si el boton no funciona, copia este enlace en tu navegador:<br>
      <span style="color:#0f6e56;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
    <div style="margin:18px 0 0 0;padding:12px 16px;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:6px;color:#92400e;font-size:12.5px;">
      <strong>Si no has sido tu</strong>, ignora este email. Nadie
      podra cambiar tu contrasena sin abrir este enlace, asi que tu
      cuenta sigue segura.
    </div>
  `,
});

const tplCambioEmail = envoltura({
  subtitulo: "Cambio de email",
  cuerpo: `
    <p style="margin:0 0 12px 0;font-size:16px;">
      <strong style="color:#0d4a3a;">Confirma tu nuevo email</strong>
    </p>
    <p style="margin:0 0 18px 0;">
      Has solicitado cambiar el email de tu cuenta de PermutaES a
      <strong>{{ .Email }}</strong>. Pulsa el boton para
      confirmar que esta direccion es tuya:
    </p>
    <p style="margin:0 0 22px 0;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px;">
        Confirmar nuevo email
      </a>
    </p>
    <p style="margin:0 0 14px 0;color:#64748b;font-size:12.5px;">
      Si el boton no funciona, copia este enlace en tu navegador:<br>
      <span style="color:#0f6e56;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">
      Si no has sido tu quien ha pedido este cambio, ignora este
      email y revisa la seguridad de tu cuenta cuanto antes.
    </p>
  `,
});

const tplMagicLink = envoltura({
  subtitulo: "Enlace de acceso",
  cuerpo: `
    <p style="margin:0 0 18px 0;">
      Pulsa el boton para entrar en tu cuenta sin contrasena:
    </p>
    <p style="margin:0 0 22px 0;">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px;">
        Entrar en PermutaES
      </a>
    </p>
    <p style="margin:0 0 14px 0;color:#64748b;font-size:12.5px;">
      Si el boton no funciona, copia este enlace en tu navegador:<br>
      <span style="color:#0f6e56;word-break:break-all;">{{ .ConfirmationURL }}</span>
    </p>
    <p style="margin:0;color:#94a3b8;font-size:12px;">
      Si no has pedido este enlace, ignora este email.
    </p>
  `,
});

// ---------------------------------------------------------------------------
// Construccion del payload y PATCH a la Management API
// ---------------------------------------------------------------------------

const payload = {
  // Confirmacion de registro
  mailer_subjects_confirmation: "Confirma tu cuenta en PermutaES",
  mailer_templates_confirmation_content: tplConfirmacion,
  // Recuperacion de contrasena
  mailer_subjects_recovery: "Recupera tu contrasena de PermutaES",
  mailer_templates_recovery_content: tplRecuperacion,
  // Cambio de email
  mailer_subjects_email_change: "Confirma tu nuevo email en PermutaES",
  mailer_templates_email_change_content: tplCambioEmail,
  // Magic link (no se usa todavia, lo dejamos por coherencia)
  mailer_subjects_magic_link: "Tu enlace de acceso a PermutaES",
  mailer_templates_magic_link_content: tplMagicLink,
};

async function main() {
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
  console.log(`-> PATCH ${url}`);
  console.log(
    `   campos a actualizar: ${Object.keys(payload).length} (${Object.keys(payload).join(", ")})`,
  );

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
    console.error(`Fallo (${res.status} ${res.statusText}):`);
    console.error(txt);
    process.exit(1);
  }

  console.log("\nPlantillas aplicadas correctamente.");
  console.log("\nProximos pasos:");
  console.log("  1. Ve a Authentication -> Email Templates en el panel de");
  console.log("     Supabase y verifica visualmente que estan las nuevas.");
  console.log("  2. Crea una cuenta de prueba con un email real para");
  console.log("     comprobar el envio.");
  console.log("  3. REVOCA el token: https://supabase.com/dashboard/account/tokens");
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});

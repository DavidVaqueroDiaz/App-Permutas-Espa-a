/**
 * Cliente único de Resend para PermutaES.
 *
 * Lazy-singleton: se instancia la primera vez que se necesita.
 * Si la API key no está configurada (entornos donde no se quiere
 * enviar email, como tests), `enviarEmail` simplemente registra el
 * intento y devuelve `{ ok: false }` — no rompe el flujo de la app.
 *
 * Con `registro`, cada envío (bueno o fallido) queda anotado en la tabla
 * `envios_email` (sin la dirección) para verlo en el panel de admin: la
 * clave de Resend solo permite enviar, no consultar lo enviado.
 */
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

let cliente: Resend | null = null;

function getCliente(): Resend | null {
  if (cliente) return cliente;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY no configurada — emails desactivados.");
    return null;
  }
  cliente = new Resend(key);
  return cliente;
}

function getRemitente(): string {
  return process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
}

export type TipoEmail =
  | "cadena_nueva"
  | "cadena_cerrada"
  | "mensaje_nuevo"
  | "mensaje_demo"
  | "recordatorio_caducidad"
  | "bienvenida"
  | "contacto";

async function anotarEnvio(
  registro: { tipo: TipoEmail; referencia?: string },
  ok: boolean,
  error: string | null,
): Promise<void> {
  try {
    const { error: errInsert } = await createAdminClient()
      .from("envios_email")
      .insert({
        tipo: registro.tipo,
        ok,
        error: error ? error.slice(0, 500) : null,
        referencia: registro.referencia ?? null,
      });
    if (errInsert) console.warn("[email] no se pudo anotar el envio:", errInsert.message);
  } catch (e) {
    console.warn("[email] no se pudo anotar el envio:", e);
  }
}

export async function enviarEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Direccion a la que se respondera. Util para el formulario de
   *  contacto: el From es siempre noreply@permutaes pero la respuesta
   *  va al usuario. */
  replyTo?: string;
  /** Anota el resultado en `envios_email` (sin la direccion). */
  registro?: { tipo: TipoEmail; referencia?: string };
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const resultado = await enviar(opts);
  if (opts.registro) {
    await anotarEnvio(
      opts.registro,
      resultado.ok,
      resultado.ok ? null : resultado.error,
    );
  }
  return resultado;
}

async function enviar(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const c = getCliente();
  if (!c) return { ok: false, error: "Resend no configurado" };

  try {
    const r = await c.emails.send({
      from: `PermutaES <${getRemitente()}>`,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
    });
    if (r.error) {
      // Errores típicos: el dominio remitente no está verificado, el
      // destinatario no es válido, etc. Los registramos pero no
      // interrumpimos el flujo de mensajería.
      console.warn("[email] Resend error:", r.error.message);
      return { ok: false, error: r.error.message };
    }
    return { ok: true, id: r.data?.id ?? "" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[email] excepción al enviar:", msg);
    return { ok: false, error: msg };
  }
}

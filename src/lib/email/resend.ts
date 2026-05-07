/**
 * Cliente único de Resend para PermutaES.
 *
 * Lazy-singleton: se instancia la primera vez que se necesita.
 * Si la API key no está configurada (entornos donde no se quiere
 * enviar email, como tests), `enviarEmail` simplemente registra el
 * intento y devuelve `{ ok: false }` — no rompe el flujo de la app.
 */
import { Resend } from "resend";

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

export async function enviarEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Direccion a la que se respondera. Util para el formulario de
   *  contacto: el From es siempre noreply@permutaes pero la respuesta
   *  va al usuario. */
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

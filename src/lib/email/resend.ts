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
 *
 * Resend admite unas 2 peticiones por segundo: los envíos de una misma
 * ejecución se espacian y, si aun así responde "demasiadas peticiones",
 * se reintenta una vez. Con `idempotencyKey`, Resend descarta durante
 * 24 horas un segundo envío idéntico (por ejemplo, si una revisión se
 * cortó justo después de enviar).
 */
import { createHash } from "node:crypto";
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
  | "seguimiento_permuta"
  | "mensaje_nuevo"
  | "mensaje_demo"
  | "recordatorio_caducidad"
  | "bienvenida"
  | "contacto";

/** Anota un envio en `envios_email` (sin la direccion). Nunca falla. */
export async function anotarEnvio(
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

/**
 * Clave para que Resend no repita un correo identico. Incluye el
 * contenido: si el texto cambia (otro alias, otra cadena) es otro correo.
 */
export function claveIdempotencia(
  tipo: string,
  usuarioId: string,
  partes: string[],
  contenido: { subject: string; text: string },
): string {
  const resumen = createHash("sha256")
    .update([...partes].sort().join("|"))
    .update("\n")
    .update(contenido.subject)
    .update("\n")
    .update(contenido.text)
    .digest("hex")
    .slice(0, 40);
  return `${tipo}/${usuarioId}/${resumen}`;
}

const PAUSA_ENTRE_ENVIOS_MS = 600;
let ultimoEnvio = 0;
let cola: Promise<void> = Promise.resolve();

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Espera su turno para no pasar del limite de Resend. */
function esperarTurno(): Promise<void> {
  const turno = cola.then(async () => {
    const espera = ultimoEnvio + PAUSA_ENTRE_ENVIOS_MS - Date.now();
    if (espera > 0) await dormir(espera);
    ultimoEnvio = Date.now();
  });
  cola = turno.catch(() => {});
  return turno;
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
  /** Ver `claveIdempotencia`. */
  idempotencyKey?: string;
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
  idempotencyKey?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const c = getCliente();
  if (!c) return { ok: false, error: "Resend no configurado" };

  try {
    const pedir = async () => {
      await esperarTurno();
      return c.emails.send(
        {
          from: `PermutaES <${getRemitente()}>`,
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
          replyTo: opts.replyTo,
        },
        opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
      );
    };
    let r = await pedir();
    if (r.error && (r.error.statusCode === 429 || String(r.error.name).includes("rate_limit"))) {
      await dormir(1500);
      r = await pedir();
    }
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

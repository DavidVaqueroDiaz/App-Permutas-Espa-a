"use server";

import { headers } from "next/headers";
import { enviarEmail } from "@/lib/email/resend";
import { aplicarRateLimit, ipDesdeHeaders } from "@/lib/rate-limit";

export type ContactoState =
  | { ok: true }
  | { ok: false; mensaje: string; valoresEnviados?: { nombre: string; email: string; asunto: string; mensaje: string } }
  | null;

const DESTINO_DEFAULT = process.env.CONTACTO_EMAIL_DESTINO;

/**
 * Procesa el formulario de contacto:
 *   - Valida campos.
 *   - Aplica rate limit por IP.
 *   - Envia email al admin via Resend con `reply-to` del usuario para
 *     poder responder con un click sin tener que copiar la direccion.
 *   - Si falla el envio, lo registra y devuelve error generico.
 *
 * El destinatario se configura en la env var CONTACTO_EMAIL_DESTINO en
 * Vercel (no se hardcodea en codigo). Si no esta definida, el form
 * sigue funcionando pero solo loguea el mensaje (modo desarrollo).
 */
export async function enviarContacto(
  _prev: ContactoState,
  formData: FormData,
): Promise<ContactoState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const asunto = String(formData.get("asunto") ?? "").trim();
  const mensaje = String(formData.get("mensaje") ?? "").trim();

  const valoresEnviados = { nombre, email, asunto, mensaje };

  if (!nombre || nombre.length < 2) {
    return { ok: false, mensaje: "Indica tu nombre.", valoresEnviados };
  }
  if (!email || !email.includes("@") || email.length > 200) {
    return {
      ok: false,
      mensaje: "Email no valido.",
      valoresEnviados,
    };
  }
  if (!asunto || asunto.length < 3) {
    return {
      ok: false,
      mensaje: "Indica un asunto (al menos 3 caracteres).",
      valoresEnviados,
    };
  }
  if (asunto.length > 150) {
    return {
      ok: false,
      mensaje: "El asunto no puede pasar de 150 caracteres.",
      valoresEnviados,
    };
  }
  if (!mensaje || mensaje.length < 10) {
    return {
      ok: false,
      mensaje: "Escribe al menos 10 caracteres en el mensaje.",
      valoresEnviados,
    };
  }
  if (mensaje.length > 5000) {
    return {
      ok: false,
      mensaje: "El mensaje no puede pasar de 5000 caracteres.",
      valoresEnviados,
    };
  }

  // Rate limit: 3 mensajes por hora desde la misma IP. Suficiente para
  // un usuario legitimo, bloquea spam automatizado.
  const ip = ipDesdeHeaders(await headers());
  const rl = await aplicarRateLimit({
    clave: `contacto:${ip}`,
    ventanaSegundos: 3600,
    max: 3,
    mensajeBloqueado:
      "Has enviado demasiados mensajes en la última hora. Inténtalo más tarde.",
  });
  if (!rl.permitido) {
    return { ok: false, mensaje: rl.mensaje, valoresEnviados };
  }

  // Sanitizar para HTML (sin libreria externa: el contenido lo controla
  // el usuario, pero el unico sitio donde aparece es nuestro propio
  // email y nuestro propio cliente de correo, asi que el riesgo de XSS
  // es minimo. Aun asi escapamos lo basico).
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  if (!DESTINO_DEFAULT) {
    console.warn(
      "[contacto] CONTACTO_EMAIL_DESTINO no configurada. Mensaje recibido:",
      { nombre, email, ip, mensaje: mensaje.slice(0, 200) },
    );
    // Devolvemos OK al usuario porque desde su lado el formulario "fue
    // bien" — el problema es de configuracion del servidor.
    return { ok: true };
  }

  const html =
    `<p><strong>Nuevo mensaje de contacto</strong></p>` +
    `<p><strong>Nombre:</strong> ${esc(nombre)}</p>` +
    `<p><strong>Email:</strong> ${esc(email)}</p>` +
    `<p><strong>Asunto:</strong> ${esc(asunto)}</p>` +
    `<p><strong>IP:</strong> ${esc(ip)}</p>` +
    `<hr>` +
    `<p style="white-space:pre-wrap;">${esc(mensaje)}</p>`;
  const text =
    `Nuevo mensaje de contacto\n\n` +
    `Nombre: ${nombre}\n` +
    `Email: ${email}\n` +
    `Asunto: ${asunto}\n` +
    `IP: ${ip}\n\n` +
    `--- mensaje ---\n${mensaje}\n`;

  const r = await enviarEmail({
    to: DESTINO_DEFAULT,
    subject: `[PermutaES] ${asunto.slice(0, 100)} — ${nombre}`,
    html,
    text,
    replyTo: email,
  });

  if (!r.ok) {
    return {
      ok: false,
      mensaje:
        "No hemos podido enviar el mensaje. Intentalo de nuevo en unos minutos.",
      valoresEnviados,
    };
  }
  return { ok: true };
}

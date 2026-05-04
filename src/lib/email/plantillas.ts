/**
 * Plantillas HTML simples para los emails transaccionales de PermutaES.
 *
 * Las dejamos en un único módulo para poder iterar el copy/diseño
 * sin tener que tocar la lógica que las dispara.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://permutaes.vercel.app";

function envoltura({
  titulo,
  contenido,
}: {
  titulo: string;
  contenido: string;
}): string {
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
                <div style="color:#5dcaa5;font-size:12.5px;margin-top:2px;">${titulo}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.55;color:#1f2937;">
                ${contenido}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;font-size:11.5px;color:#64748b;background:#f8fafb;border-top:1px solid #e2e8f0;">
                Recibes este email porque alguien te ha contactado dentro de PermutaES.
                Puedes desactivar las notificaciones desde
                <a href="${BASE_URL}/mi-cuenta" style="color:#0f6e56;">tu cuenta</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function plantillaMensajeNuevo(opts: {
  remitenteAlias: string;
  fragmentoMensaje: string;
  conversacionId: string;
}): { subject: string; html: string; text: string } {
  const enlace = `${BASE_URL}/mensajes/${opts.conversacionId}`;
  // Sanitizar: el fragmento se incluye como texto, no como HTML.
  const fragmentoSeguro = opts.fragmentoMensaje
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const aliasSeguro = opts.remitenteAlias
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = envoltura({
    titulo: "Nuevo mensaje",
    contenido: `
      <p style="margin:0 0 16px 0;">
        <strong style="color:#0d4a3a;">${aliasSeguro}</strong>
        te ha enviado un mensaje en PermutaES.
      </p>
      <blockquote style="margin:0 0 22px 0;padding:12px 16px;background:#f8fafb;border-left:3px solid #5dcaa5;border-radius:6px;color:#374151;">
        ${fragmentoSeguro}
      </blockquote>
      <p style="margin:0 0 22px 0;">
        <a href="${enlace}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:14px;">
          Responder en PermutaES →
        </a>
      </p>
      <p style="margin:0;color:#64748b;font-size:12.5px;">
        Si el botón no funciona, copia este enlace en tu navegador:<br>
        <span style="color:#0f6e56;word-break:break-all;">${enlace}</span>
      </p>
    `,
  });

  const text =
    `${opts.remitenteAlias} te ha enviado un mensaje en PermutaES:\n\n` +
    `${opts.fragmentoMensaje}\n\n` +
    `Responde aquí: ${enlace}\n`;

  return {
    subject: `Nuevo mensaje de ${opts.remitenteAlias} en PermutaES`,
    html,
    text,
  };
}

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

export function plantillaCadenaNueva(opts: {
  longitud: 2 | 3 | 4;
  recorrido: string[]; // ["Sevilla", "Madrid", "Vigo", "Sevilla"] (cierra ciclo)
  aliasOtros: string[]; // alias de los otros participantes
  cuerpoTexto: string; // "597 — Maestros"
}): { subject: string; html: string; text: string } {
  const enlace = `${BASE_URL}/auto-permutas`;
  const tipoLabel =
    opts.longitud === 2
      ? "Permuta directa"
      : opts.longitud === 3
        ? "Permuta a 3"
        : "Permuta a 4";

  const recorridoSeguro = opts.recorrido
    .map((m) =>
      m
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;"),
    )
    .join(" → ");
  const aliasSeguro = opts.aliasOtros
    .map((a) =>
      a
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;"),
    )
    .join(", ");
  const cuerpoSeguro = opts.cuerpoTexto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = envoltura({
    titulo: tipoLabel + " posible",
    contenido: `
      <p style="margin:0 0 12px 0;font-size:16px;">
        🎉 <strong style="color:#0d4a3a;">¡Hay una cadena posible que te incluye!</strong>
      </p>
      <p style="margin:0 0 16px 0;">
        Acabamos de detectar una <strong>${tipoLabel.toLowerCase()}</strong>
        entre tu anuncio y ${opts.aliasOtros.length === 1 ? "el de" : "los de"}
        <strong>${aliasSeguro}</strong>, en
        <strong>${cuerpoSeguro}</strong>.
      </p>
      <div style="margin:0 0 22px 0;padding:12px 16px;background:#e1f5ee;border-left:3px solid #0d4a3a;border-radius:6px;">
        <p style="margin:0;font-size:11px;font-weight:600;color:#0f6e56;text-transform:uppercase;letter-spacing:0.5px;">
          Recorrido propuesto
        </p>
        <p style="margin:6px 0 0 0;font-size:15px;color:#0d4a3a;font-weight:600;">
          ${recorridoSeguro}
        </p>
      </div>
      <p style="margin:0 0 22px 0;">
        <a href="${enlace}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:14px;">
          Ver detalle de la cadena →
        </a>
      </p>
      <p style="margin:0;color:#64748b;font-size:12.5px;">
        Recuerda que las reglas legales personales (jubilación,
        antigüedad, carencia entre permutas, ≥2 años en destino) las
        debes verificar tú con tus datos antes de tramitar. PermutaES
        cruza únicamente los criterios profesionales y geográficos.
      </p>
      <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;">
        Si el botón no funciona: <span style="color:#0f6e56;">${enlace}</span>
      </p>
    `,
  });

  const text =
    `🎉 ¡Hay una ${tipoLabel.toLowerCase()} posible que te incluye!\n\n` +
    `Recorrido: ${opts.recorrido.join(" → ")}\n` +
    `Cuerpo: ${opts.cuerpoTexto}\n` +
    `Otros participantes: ${opts.aliasOtros.join(", ")}\n\n` +
    `Ver detalle: ${enlace}\n\n` +
    `Recuerda verificar las reglas legales personales antes de tramitar.\n`;

  return {
    subject: `🎉 ${tipoLabel} posible para ti en PermutaES`,
    html,
    text,
  };
}

/**
 * Email de bienvenida que enviamos cuando el usuario confirma su email
 * y entra por primera vez. Es distinto del email tecnico de Supabase
 * (ese es el que dice "confirma tu cuenta"); este es el "Hola de
 * verdad, ya estas dentro, esto es lo que viene ahora".
 */
export function plantillaEmailBienvenida(opts: {
  alias: string;
}): { subject: string; html: string; text: string } {
  const enlaceNuevoAnuncio = `${BASE_URL}/anuncios/nuevo`;
  const enlaceAutoPermutas = `${BASE_URL}/auto-permutas`;
  const enlaceMiCuenta = `${BASE_URL}/mi-cuenta`;
  const aliasSeguro = opts.alias
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = envoltura({
    titulo: "Bienvenido",
    contenido: `
      <p style="margin:0 0 12px 0;font-size:16px;">
        Hola <strong style="color:#0d4a3a;">${aliasSeguro}</strong>,
      </p>
      <p style="margin:0 0 16px 0;">
        Bienvenido a <strong>PermutaES</strong>, la plataforma para detectar
        cadenas de permuta entre funcionarios públicos en España. Tu cuenta
        está confirmada y lista para usar.
      </p>

      <div style="margin:0 0 22px 0;padding:14px 18px;background:#e1f5ee;border-left:3px solid #0d4a3a;border-radius:6px;">
        <p style="margin:0 0 8px 0;color:#0d4a3a;font-weight:600;">
          Tus 3 siguientes pasos:
        </p>
        <ol style="margin:0;padding-left:20px;color:#1f2937;">
          <li style="margin-bottom:6px;">
            <a href="${enlaceNuevoAnuncio}" style="color:#0f6e56;font-weight:500;">Publica tu anuncio</a>
            con tu plaza actual y los destinos a los que aceptarías irte.
          </li>
          <li style="margin-bottom:6px;">
            Cuando lo publiques, cruzaremos automáticamente tu perfil con
            todos los demás. Te avisaremos por email si aparece una cadena
            que te incluya.
          </li>
          <li>
            Mientras tanto, puedes
            <a href="${enlaceAutoPermutas}" style="color:#0f6e56;font-weight:500;">explorar el buscador</a>
            para ver qué otros anuncios hay en tu sector y zona.
          </li>
        </ol>
      </div>

      <p style="margin:0 0 22px 0;">
        <a href="${enlaceNuevoAnuncio}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px;">
          Publicar mi anuncio →
        </a>
      </p>

      <p style="margin:0 0 8px 0;color:#374151;font-size:13.5px;">
        <strong>Algunas cosas importantes:</strong>
      </p>
      <ul style="margin:0 0 18px 0;padding-left:20px;color:#374151;font-size:13.5px;">
        <li>El servicio es <strong>gratis</strong>, sin publicidad ni datos
        a terceros.</li>
        <li>Tu identidad real solo se comparte cuando tú decides contactar
        con otra persona dentro de la mensajería.</li>
        <li>Las reglas legales personales (años hasta jubilación, antigüedad,
        etc.) las verificamos automáticamente cuando aparecen cadenas, pero
        siempre debes confirmarlas con tu administración antes de tramitar.</li>
        <li>Si en algún momento quieres irte, puedes
        <a href="${enlaceMiCuenta}" style="color:#0f6e56;">descargar todos
        tus datos o eliminar tu cuenta</a> con un click. RGPD completo.</li>
      </ul>

      <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;">
        Si tienes cualquier duda, responde a este email y lo leeremos.
      </p>
    `,
  });

  const text =
    `Hola ${opts.alias},\n\n` +
    `Bienvenido a PermutaES. Tu cuenta esta confirmada y lista para usar.\n\n` +
    `Tus 3 siguientes pasos:\n` +
    `  1. Publica tu anuncio con tu plaza actual y los destinos que buscas:\n` +
    `     ${enlaceNuevoAnuncio}\n` +
    `  2. Cuando lo publiques, cruzaremos tu perfil con los demas y te\n` +
    `     avisaremos por email si aparece una cadena.\n` +
    `  3. Mientras tanto, puedes explorar el buscador:\n` +
    `     ${enlaceAutoPermutas}\n\n` +
    `Algunas cosas importantes:\n` +
    `  - Servicio gratis, sin publicidad ni datos a terceros.\n` +
    `  - Tu identidad real solo se comparte si tu decides contactar.\n` +
    `  - Las reglas legales (jubilacion, antiguedad...) las verificamos\n` +
    `    automaticamente, pero confirmalo siempre con tu administracion.\n` +
    `  - Si quieres irte, descarga tus datos o elimina tu cuenta desde\n` +
    `    ${enlaceMiCuenta}\n\n` +
    `Si tienes cualquier duda, responde a este email.\n`;

  return {
    subject: `Bienvenido a PermutaES, ${opts.alias}`,
    html,
    text,
  };
}

/**
 * Email de recordatorio cuando el anuncio del usuario va a caducar
 * en menos de 30 dias. Le invita a entrar y renovarlo (o cerrarlo si
 * ya consiguio la permuta y se le olvido marcarlo).
 */
export function plantillaRecordatorioCaducidad(opts: {
  alias: string;
  cuerpoTexto: string;
  municipio: string;
  diasRestantes: number;
  anuncioId: string;
}): { subject: string; html: string; text: string } {
  const enlaceEditar = `${BASE_URL}/anuncios/${opts.anuncioId}/editar`;
  const enlaceMiCuenta = `${BASE_URL}/mi-cuenta`;

  const cuerpoSeguro = opts.cuerpoTexto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const muniSeguro = opts.municipio
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = envoltura({
    titulo: "Tu anuncio caduca pronto",
    contenido: `
      <p style="margin:0 0 12px 0;font-size:16px;">
        Hola <strong style="color:#0d4a3a;">${opts.alias}</strong>,
      </p>
      <p style="margin:0 0 16px 0;">
        Tu anuncio de <strong>${cuerpoSeguro}</strong> en
        <strong>${muniSeguro}</strong> caduca en
        <strong>${opts.diasRestantes} ${opts.diasRestantes === 1 ? "día" : "días"}</strong>.
        Después dejará de aparecer en /auto-permutas y en los buscadores.
      </p>
      <div style="margin:0 0 22px 0;padding:12px 16px;background:#e1f5ee;border-left:3px solid #0d4a3a;border-radius:6px;">
        <p style="margin:0;color:#0d4a3a;">
          <strong>¿Sigues queriendo permutar?</strong> Entra y guarda
          (sin cambiar nada) para renovarlo otros 6 meses.
        </p>
      </div>
      <p style="margin:0 0 22px 0;">
        <a href="${enlaceEditar}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:14px;">
          Renovar mi anuncio →
        </a>
      </p>
      <p style="margin:0 0 8px 0;color:#64748b;font-size:13px;">
        Si <strong>ya conseguiste tu permuta</strong> y se te olvidó
        marcarlo, hazlo desde
        <a href="${enlaceMiCuenta}" style="color:#0f6e56;">tu cuenta</a>
        para que las otras personas de la cadena no esperen tu respuesta.
      </p>
      <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;">
        Si el botón no funciona: <span style="color:#0f6e56;">${enlaceEditar}</span>
      </p>
    `,
  });

  const text =
    `Hola ${opts.alias},\n\n` +
    `Tu anuncio de ${opts.cuerpoTexto} en ${opts.municipio} caduca en ${opts.diasRestantes} ${opts.diasRestantes === 1 ? "día" : "días"}.\n\n` +
    `Si sigues queriendo permutar, renuevalo aqui:\n${enlaceEditar}\n\n` +
    `Si ya conseguiste tu permuta y se te olvido marcarlo, hazlo desde:\n${enlaceMiCuenta}\n`;

  return {
    subject: `Tu anuncio en PermutaES caduca en ${opts.diasRestantes} ${opts.diasRestantes === 1 ? "día" : "días"}`,
    html,
    text,
  };
}

/**
 * Email enviado a los OTROS participantes de cadenas en las que estaba
 * un anuncio que acaba de cerrarse como "permuta conseguida".
 *
 * El objetivo es cerrar el loop emocionalmente: si Carlos lleva días
 * viendo "1 cadena posible incluye tu anuncio" y de pronto desaparece,
 * sin este email tendría que adivinar por qué. Le decimos:
 *
 *   "La persona X cerró su permuta. Esa cadena ya no es viable, pero
 *    sigues teniendo otras N cadenas activas."
 */
export function plantillaCadenaCerradaPorOtro(opts: {
  aliasQueCerro: string;
  /** Recorridos (humano-legibles) de las cadenas afectadas. */
  recorridosAfectados: string[];
  cuerpoTexto: string;
  /** Cadenas que el destinatario sigue teniendo abiertas, post cierre. */
  cadenasRestantes: number;
}): { subject: string; html: string; text: string } {
  const enlace = `${BASE_URL}/auto-permutas`;
  const aliasSeguro = opts.aliasQueCerro
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const cuerpoSeguro = opts.cuerpoTexto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const recorridosLista = opts.recorridosAfectados
    .map(
      (r) =>
        `<li style="margin:0 0 4px 0;">${r
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</li>`,
    )
    .join("");
  const numeroAfectadas = opts.recorridosAfectados.length;

  const html = envoltura({
    titulo: "Cadena cerrada",
    contenido: `
      <p style="margin:0 0 12px 0;font-size:16px;">
        <strong style="color:#0d4a3a;">${aliasSeguro}</strong> ha cerrado su permuta.
      </p>
      <p style="margin:0 0 16px 0;">
        Estabais en
        <strong>${numeroAfectadas === 1 ? "una cadena posible" : `${numeroAfectadas} cadenas posibles`}</strong>
        en <strong>${cuerpoSeguro}</strong>. Como ya consiguió su plaza,
        ${numeroAfectadas === 1 ? "esa cadena ya no es viable" : "esas cadenas ya no son viables"}:
      </p>
      <ul style="margin:0 0 18px 18px;padding:0;color:#374151;font-size:13.5px;">
        ${recorridosLista}
      </ul>
      ${
        opts.cadenasRestantes > 0
          ? `<div style="margin:0 0 22px 0;padding:12px 16px;background:#e1f5ee;border-left:3px solid #0d4a3a;border-radius:6px;">
              <p style="margin:0;color:#0d4a3a;">
                <strong>Buenas noticias:</strong> sigues teniendo
                <strong>${opts.cadenasRestantes}</strong>
                ${opts.cadenasRestantes === 1 ? "cadena posible" : "cadenas posibles"}
                con tu anuncio.
              </p>
            </div>`
          : `<p style="margin:0 0 22px 0;color:#64748b;">
              Por ahora no tienes otras cadenas posibles abiertas. En cuanto
              haya un anuncio compatible nuevo te avisaremos.
            </p>`
      }
      <p style="margin:0 0 22px 0;">
        <a href="${enlace}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:14px;">
          Ver mis cadenas actuales →
        </a>
      </p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">
        Si el botón no funciona: <span style="color:#0f6e56;">${enlace}</span>
      </p>
    `,
  });

  const text =
    `${opts.aliasQueCerro} ha cerrado su permuta.\n\n` +
    `Estabais en ${numeroAfectadas === 1 ? "una cadena posible" : `${numeroAfectadas} cadenas posibles`} en ${opts.cuerpoTexto}, ` +
    `${numeroAfectadas === 1 ? "ya no es viable" : "ya no son viables"}:\n\n` +
    opts.recorridosAfectados.map((r) => `  - ${r}`).join("\n") +
    `\n\n` +
    (opts.cadenasRestantes > 0
      ? `Sigues teniendo ${opts.cadenasRestantes} cadena${opts.cadenasRestantes === 1 ? "" : "s"} posible${opts.cadenasRestantes === 1 ? "" : "s"} con tu anuncio.\n\n`
      : `Por ahora no tienes otras cadenas posibles abiertas.\n\n`) +
    `Ver mis cadenas: ${enlace}\n`;

  return {
    subject:
      numeroAfectadas === 1
        ? `Una cadena de PermutaES se ha cerrado`
        : `${numeroAfectadas} cadenas de PermutaES se han cerrado`,
    html,
    text,
  };
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

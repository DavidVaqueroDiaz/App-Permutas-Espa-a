/**
 * Plantillas HTML simples para los emails transaccionales de PermutaES.
 *
 * Las dejamos en un único módulo para poder iterar el copy/diseño
 * sin tener que tocar la lógica que las dispara.
 */

import { SITE_URL } from "@/lib/site-url";

const BASE_URL = SITE_URL;

/** Texto seguro para meter dentro del HTML. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tipoPermuta(longitud: number): string {
  return longitud === 2 ? "Permuta directa" : longitud === 3 ? "Permuta a 3" : "Permuta a 4";
}

/** "Ana", "Ana y Luis", "Ana, Luis y Marta". */
export function listaNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/** Quita los elementos que se verian igual en el correo (por ejemplo, dos
 *  cadenas con un anuncio duplicado de la otra persona). */
export function sinRepetir<T>(items: T[], clave: (x: T) => string): T[] {
  const vistas = new Set<string>();
  return items.filter((x) => {
    const k = clave(x);
    if (vistas.has(k)) return false;
    vistas.add(k);
    return true;
  });
}

function boton(enlace: string, texto: string): string {
  return `<a href="${esc(enlace)}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:14px;">${esc(texto)}</a>`;
}

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
                Recibes este email porque tienes una cuenta en PermutaES.
                Si ya no quieres avisos de un anuncio, ciérralo o elimínalo desde
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
  const enlace = `${BASE_URL}/mis-cadenas`;
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
        Hemos encontrado una <strong>${tipoLabel.toLowerCase()}</strong>
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
          Ver la cadena y contactar →
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

export type CadenaParaCorreo = {
  longitud: 2 | 3 | 4;
  /** Municipios desde el de quien recibe el correo, cerrando el ciclo. */
  recorrido: string[];
  aliasOtros: string[];
  cuerpoTexto: string;
};

/**
 * Aviso de cadenas nuevas: un solo correo por persona aunque aparezcan
 * varias cadenas a la vez (por ejemplo, en la revision diaria).
 */
export function plantillaCadenasNuevas(opts: {
  cadenas: CadenaParaCorreo[];
}): { subject: string; html: string; text: string } {
  const cadenas = sinRepetir(opts.cadenas, (c) =>
    [c.longitud, c.recorrido.join(">"), c.aliasOtros.join(","), c.cuerpoTexto].join("|"),
  );
  if (cadenas.length === 1) return plantillaCadenaNueva(cadenas[0]);

  const enlace = `${BASE_URL}/mis-cadenas`;
  const n = cadenas.length;
  const bloques = cadenas
    .map(
      (c) => `
      <div style="margin:0 0 12px 0;padding:12px 16px;background:#e1f5ee;border-left:3px solid #0d4a3a;border-radius:6px;">
        <p style="margin:0;font-size:11px;font-weight:600;color:#0f6e56;text-transform:uppercase;letter-spacing:0.5px;">
          ${esc(tipoPermuta(c.longitud))} · ${esc(c.cuerpoTexto)}
        </p>
        <p style="margin:6px 0 0 0;font-size:15px;color:#0d4a3a;font-weight:600;">
          ${c.recorrido.map(esc).join(" → ")}
        </p>
        <p style="margin:4px 0 0 0;font-size:13px;color:#374151;">
          Con ${esc(listaNombres(c.aliasOtros))}
        </p>
      </div>`,
    )
    .join("");

  const html = envoltura({
    titulo: "Permutas posibles",
    contenido: `
      <p style="margin:0 0 12px 0;font-size:16px;">
        🎉 <strong style="color:#0d4a3a;">¡Hay ${n} cadenas posibles que te incluyen!</strong>
      </p>
      <p style="margin:0 0 16px 0;">
        Hemos encontrado estas permutas entre tus anuncios y los de otras personas:
      </p>
      ${bloques}
      <p style="margin:10px 0 22px 0;">
        ${boton(enlace, "Ver mis cadenas y contactar →")}
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
    `🎉 ¡Hay ${n} cadenas posibles que te incluyen!\n\n` +
    cadenas
      .map(
        (c) =>
          `${tipoPermuta(c.longitud)} (${c.cuerpoTexto})\n` +
          `  Recorrido: ${c.recorrido.join(" → ")}\n` +
          `  Con: ${listaNombres(c.aliasOtros)}\n`,
      )
      .join("\n") +
    `\nVer y contactar: ${enlace}\n\n` +
    `Recuerda verificar las reglas legales personales antes de tramitar.\n`;

  return {
    subject: `🎉 ${n} permutas posibles para ti en PermutaES`,
    html,
    text,
  };
}

export type SeguimientoParaCorreo = {
  anuncioId: string;
  longitud: 2 | 3 | 4;
  recorrido: string[];
  /** Personas de la cadena con las que se ha escrito. */
  aliasHablados: string[];
  cuerpoTexto: string;
  /** 1: a los 30 dias; 2: recordatorio a los 90. */
  numero: 1 | 2;
};

/**
 * «¿Conseguisteis la permuta?»: se envia cuando dos personas de una
 * cadena llevan un mes escribiendose, y una sola vez mas a los 90 dias
 * si no han marcado nada. El boton lleva al anuncio en Mi cuenta, donde
 * esta «He conseguido la permuta» (no se marca nada desde el correo: los
 * filtros de correo abren los enlaces solos).
 */
export function plantillaSeguimientoPermuta(opts: {
  alias: string;
  items: SeguimientoParaCorreo[];
}): { subject: string; html: string; text: string } {
  const items = sinRepetir(opts.items, (i) =>
    [i.longitud, i.recorrido.join(">"), i.aliasHablados.join(","), i.cuerpoTexto].join("|"),
  );
  const primero = items[0];
  const enlace = `${BASE_URL}/mi-cuenta#anuncio-${primero.anuncioId}`;
  const soloRecordatorio = opts.items.every((i) => i.numero === 2);
  const hace = soloRecordatorio ? "Hace ya unos meses" : "Hace más de un mes";
  const varios = items.length > 1;

  const intro = varios
    ? `${hace} que encontramos estas permutas y has hablado por PermutaES con otras personas de tus cadenas:`
    : `${hace} que encontramos esta permuta y ${listaNombres(primero.aliasHablados)} y tú habéis hablado por PermutaES:`;

  // Si en el mismo correo van una pregunta y un recordatorio, se marca
  // cuál es el último aviso sobre esa permuta.
  const ultimoAviso = (i: SeguimientoParaCorreo) => varios && !soloRecordatorio && i.numero === 2;

  const bloques = items
    .map(
      (i) => `
      <div style="margin:0 0 12px 0;padding:12px 16px;background:#e1f5ee;border-left:3px solid #0d4a3a;border-radius:6px;">
        <p style="margin:0;font-size:11px;font-weight:600;color:#0f6e56;text-transform:uppercase;letter-spacing:0.5px;">
          ${esc(tipoPermuta(i.longitud))} · ${esc(i.cuerpoTexto)}
        </p>
        <p style="margin:6px 0 0 0;font-size:15px;color:#0d4a3a;font-weight:600;">
          ${i.recorrido.map(esc).join(" → ")}
        </p>
        ${varios ? `<p style="margin:4px 0 0 0;font-size:13px;color:#374151;">Hablando con ${esc(listaNombres(i.aliasHablados))}</p>` : ""}
        ${ultimoAviso(i) ? `<p style="margin:4px 0 0 0;font-size:12px;color:#64748b;">Es el último correo que te enviamos sobre esta permuta.</p>` : ""}
      </div>`,
    )
    .join("");

  const html = envoltura({
    titulo: "Seguimiento de tu permuta",
    contenido: `
      <p style="margin:0 0 12px 0;font-size:16px;">
        Hola <strong style="color:#0d4a3a;">${esc(opts.alias)}</strong>,
      </p>
      <p style="margin:0 0 16px 0;">${esc(intro)}</p>
      ${bloques}
      <p style="margin:18px 0 8px 0;font-size:16px;">
        <strong style="color:#0d4a3a;">¿Conseguisteis la permuta?</strong>
      </p>
      <p style="margin:0 0 18px 0;">
        Si ya está hecha, entra en tu cuenta y pulsa
        <strong>«He conseguido la permuta»</strong> junto a tu anuncio.
        Así deja de salir en las búsquedas, avisamos a las demás personas
        con las que tenías cadenas y sabemos cuántas permutas salen
        gracias a PermutaES.
      </p>
      <p style="margin:0 0 22px 0;">
        ${boton(enlace, "Marcar mi permuta →")}
      </p>
      <p style="margin:0 0 8px 0;color:#374151;font-size:13.5px;">
        Si seguís con los trámites, no tienes que hacer nada. Si ya no te
        interesa permutar, puedes eliminar el anuncio desde tu cuenta.
      </p>
      ${
        soloRecordatorio
          ? `<p style="margin:0 0 8px 0;color:#64748b;font-size:13px;">Es el último correo que te enviamos sobre ${varios ? "estas permutas" : "esta permuta"}.</p>`
          : ""
      }
      <p style="margin:18px 0 0 0;color:#94a3b8;font-size:12px;">
        Si el botón no funciona: <span style="color:#0f6e56;">${esc(enlace)}</span>
      </p>
    `,
  });

  const text =
    `Hola ${opts.alias},\n\n` +
    `${intro}\n\n` +
    items
      .map(
        (i) =>
          `${tipoPermuta(i.longitud)} (${i.cuerpoTexto})\n` +
          `  Recorrido: ${i.recorrido.join(" → ")}\n` +
          (varios ? `  Hablando con: ${listaNombres(i.aliasHablados)}\n` : "") +
          (ultimoAviso(i) ? `  Es el último correo que te enviamos sobre esta permuta.\n` : ""),
      )
      .join("\n") +
    `\n¿Conseguisteis la permuta?\n\n` +
    `Si ya está hecha, entra en tu cuenta y pulsa «He conseguido la permuta» junto a tu anuncio:\n${enlace}\n\n` +
    `Si seguís con los trámites, no tienes que hacer nada. Si ya no te interesa permutar, puedes eliminar el anuncio desde tu cuenta.\n` +
    (soloRecordatorio
      ? `\nEs el último correo que te enviamos sobre ${varios ? "estas permutas" : "esta permuta"}.\n`
      : "");

  return {
    subject: soloRecordatorio
      ? "Recordatorio: ¿conseguisteis la permuta?"
      : "¿Conseguisteis la permuta?",
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
  const enlaceMiCuenta = `${BASE_URL}/mi-cuenta#anuncio-${opts.anuncioId}`;

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
          <strong>¿Sigues queriendo permutar?</strong> Entra en tu cuenta
          y pulsa <strong>«Renovar 6 meses»</strong> junto al anuncio.
          Guardar cambios en el anuncio también lo renueva.
        </p>
      </div>
      <p style="margin:0 0 22px 0;">
        <a href="${enlaceMiCuenta}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px;font-size:14px;">
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
        Si el botón no funciona: <span style="color:#0f6e56;">${enlaceMiCuenta}</span>
      </p>
    `,
  });

  const text =
    `Hola ${opts.alias},\n\n` +
    `Tu anuncio de ${opts.cuerpoTexto} en ${opts.municipio} caduca en ${opts.diasRestantes} ${opts.diasRestantes === 1 ? "día" : "días"}.\n\n` +
    `Si sigues queriendo permutar, entra en tu cuenta y pulsa "Renovar 6 meses":\n${enlaceMiCuenta}\n\n` +
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
  const enlace = `${BASE_URL}/mis-cadenas`;
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
      <p style="margin:0 0 18px 0;color:#374151;font-size:13.5px;">
        Si la permuta ha sido contigo, marca también tu anuncio con
        <strong>«He conseguido la permuta»</strong> desde
        <a href="${BASE_URL}/mi-cuenta" style="color:#0f6e56;">tu cuenta</a>
        para que deje de salir en las búsquedas.
      </p>
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
    `Si la permuta ha sido contigo, marca también tu anuncio con "He conseguido la permuta" desde tu cuenta (${BASE_URL}/mi-cuenta) para que deje de salir en las búsquedas.\n\n` +
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

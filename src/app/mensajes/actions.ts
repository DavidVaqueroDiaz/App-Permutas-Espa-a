"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/email/resend";
import { plantillaMensajeNuevo } from "@/lib/email/plantillas";
import { aplicarRateLimit } from "@/lib/rate-limit";

export type ConversacionResumen = {
  id: string;
  otro_usuario_id: string;
  otro_alias: string;
  ultimo_mensaje_texto: string | null;
  ultimo_mensaje_el: string;
  no_leidos: number;
  creado_el: string;
};

export type Mensaje = {
  id: string;
  remitente_id: string;
  contenido: string;
  creado_el: string;
};

export type AnuncioContexto = {
  id: string;
  estado: string;
  cuerpo_texto: string;
  especialidad_texto: string | null;
  municipio: string;
};

export type ConversacionDetalle = {
  id: string;
  yo_soy_a: boolean;
  otro_usuario_id: string;
  otro_alias: string;
  mi_anuncio_id: string | null;
  su_anuncio_id: string | null;
  /** Anuncio del otro usuario (el que motivo la conversacion). */
  su_anuncio: AnuncioContexto | null;
  mensajes: Mensaje[];
};

/**
 * Inicia (o recupera, si ya existe) una conversación entre el usuario
 * autenticado y `otroUsuarioId`. Llama a la función SECURITY DEFINER
 * `public.iniciar_conversacion`, que hace todas las validaciones.
 *
 * Si tienes el contexto de qué anuncios os emparejaron, pásalos para
 * que queden registrados en la fila — es informativo, no bloqueante.
 */
export async function iniciarConversacion(
  otroUsuarioId: string,
  miAnuncioId: string | null = null,
  suAnuncioId: string | null = null,
): Promise<{ ok: true; conversacion_id: string } | { ok: false; mensaje: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("iniciar_conversacion", {
    otro_usuario: otroUsuarioId,
    mi_anuncio_id: miAnuncioId,
    su_anuncio_id: suAnuncioId,
  });

  if (error) {
    return { ok: false, mensaje: error.message };
  }
  if (!data) {
    return { ok: false, mensaje: "No se pudo iniciar la conversación." };
  }

  revalidatePath("/mensajes");
  return { ok: true, conversacion_id: data as string };
}

/**
 * Inicia (o recupera) una conversación a partir del id del anuncio
 * con el que quieres contactar. Resuelve el `usuario_id` del otro
 * lado en el servidor (no exponemos auth.users.id al cliente).
 *
 * Si el llamante no pasa `miAnuncioId`, intentamos buscar uno suyo
 * activo en la misma taxonomía profesional para enlazarlo a la
 * conversación. Si no tiene ninguno, la RPC fallará con un mensaje
 * claro.
 */
export async function iniciarConversacionDesdeAnuncio(
  otroAnuncioId: string,
  miAnuncioId: string | null = null,
): Promise<{ ok: true; conversacion_id: string } | { ok: false; mensaje: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, mensaje: "Tienes que iniciar sesión para contactar." };
  }

  // Resolver el usuario_id (y la taxonomía) del otro anuncio.
  const { data: otroRow } = await supabase
    .from("anuncios")
    .select("usuario_id, sector_codigo, cuerpo_id, especialidad_id")
    .eq("id", otroAnuncioId)
    .maybeSingle();
  if (!otroRow) {
    return { ok: false, mensaje: "Anuncio no encontrado." };
  }
  type OtroRow = {
    usuario_id: string;
    sector_codigo: string;
    cuerpo_id: string;
    especialidad_id: string | null;
  };
  const otro = otroRow as OtroRow;

  if (otro.usuario_id === user.id) {
    return { ok: false, mensaje: "No puedes contactar contigo mismo." };
  }

  // Rechazar contacto con anuncios DEMO (importados de PermutaDoc).
  // Esos perfiles tienen alias `permutadoc_NNNN` y no corresponden a
  // usuarios reales activos en la plataforma — estan como semilla
  // para que el matcher genere cadenas de muestra.
  const { data: perfilOtroRow } = await supabase
    .from("perfiles_publicos")
    .select("alias_publico")
    .eq("id", otro.usuario_id)
    .maybeSingle();
  const aliasOtro =
    (perfilOtroRow as { alias_publico: string } | null)?.alias_publico ?? "";
  if (/^permutadoc_\d+$/i.test(aliasOtro)) {
    return {
      ok: false,
      mensaje:
        "Este es un anuncio de demostración importado de PermutaDoc. La persona ya no usa esta plataforma.",
    };
  }

  // Rate limit: 20 conversaciones nuevas por hora. Una persona normal
  // abre 2-3 al dia; 20/h bloquea bots y abuso sin molestar a nadie.
  const rl = await aplicarRateLimit({
    clave: `conv:${user.id}`,
    ventanaSegundos: 3600,
    max: 20,
    mensajeBloqueado:
      "Has abierto demasiadas conversaciones en la última hora. Espera un poco antes de contactar a más personas.",
  });
  if (!rl.permitido) return { ok: false, mensaje: rl.mensaje };

  // Si no se especificó cuál de mis anuncios usar, busco uno activo
  // con la misma taxonomía. Esto cubre el caso de que el usuario
  // tenga varios y uno solo encaje.
  let miAnuncioFinal = miAnuncioId;
  if (!miAnuncioFinal) {
    let miQ = supabase
      .from("anuncios")
      .select("id")
      .eq("usuario_id", user.id)
      .eq("estado", "activo")
      .eq("sector_codigo", otro.sector_codigo)
      .eq("cuerpo_id", otro.cuerpo_id);
    if (otro.especialidad_id) miQ = miQ.eq("especialidad_id", otro.especialidad_id);
    else miQ = miQ.is("especialidad_id", null);
    const { data: mio } = await miQ.limit(1).maybeSingle();
    if (mio) miAnuncioFinal = (mio as { id: string }).id;
  }

  return iniciarConversacion(otro.usuario_id, miAnuncioFinal, otroAnuncioId);
}

/**
 * Envía un mensaje en una conversación existente. RLS comprueba que
 * el usuario es participante y remitente.
 */
export async function enviarMensaje(
  conversacionId: string,
  contenido: string,
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const texto = contenido.trim();
  if (texto.length === 0) {
    return { ok: false, mensaje: "El mensaje no puede estar vacío." };
  }
  if (texto.length > 2000) {
    return { ok: false, mensaje: "El mensaje no puede pasar de 2000 caracteres." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, mensaje: "Tienes que iniciar sesión." };
  }

  // Rate limit: 30 mensajes por usuario por minuto. Suficiente para
  // conversaciones reales, bloquea spam automatizado.
  const rl = await aplicarRateLimit({
    clave: `mensaje:${user.id}`,
    ventanaSegundos: 60,
    max: 30,
    mensajeBloqueado:
      "Has enviado demasiados mensajes en el último minuto. Espera un poco antes de seguir.",
  });
  if (!rl.permitido) return { ok: false, mensaje: rl.mensaje };

  const { error } = await supabase.from("mensajes").insert({
    conversacion_id: conversacionId,
    remitente_id: user.id,
    contenido: texto,
  });

  if (error) {
    return { ok: false, mensaje: error.message };
  }

  // Aviso por email al destinatario. Best-effort: si falla no
  // bloqueamos el envío del mensaje, solo lo registramos. Cuando
  // tengamos cron de reintento, recogerá las notificaciones que
  // se quedaron sin `enviada_email_el`.
  await dispararEmailDestinatario(supabase, conversacionId, texto);

  revalidatePath(`/mensajes/${conversacionId}`);
  revalidatePath("/mensajes");
  return { ok: true };
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Resuelve email + alias del destinatario y dispara la plantilla
 * "mensaje nuevo". No interrumpe el flujo si el email falla.
 */
async function dispararEmailDestinatario(
  supabase: SupabaseServerClient,
  conversacionId: string,
  contenidoMensaje: string,
): Promise<void> {
  try {
    const { data: filas } = await supabase.rpc(
      "datos_email_destinatario_mensaje",
      { conv_id: conversacionId },
    );
    if (!filas || (Array.isArray(filas) && filas.length === 0)) return;
    type Fila = {
      email: string | null;
      alias_destinatario: string | null;
      alias_remitente: string | null;
      notificacion_id: string | null;
    };
    const f = (Array.isArray(filas) ? filas[0] : filas) as Fila;

    if (!f.email) return;
    // Evitar enviar emails a las cuentas sintéticas de prueba importadas
    // de PermutaDoc — su TLD .test no se entrega y Resend devolvería
    // error innecesariamente.
    if (f.email.endsWith("@permutaes.test")) return;

    const fragmento =
      contenidoMensaje.length > 220
        ? contenidoMensaje.slice(0, 217) + "…"
        : contenidoMensaje;

    const plantilla = plantillaMensajeNuevo({
      remitenteAlias: f.alias_remitente ?? "Alguien",
      fragmentoMensaje: fragmento,
      conversacionId,
    });

    const r = await enviarEmail({
      to: f.email,
      subject: plantilla.subject,
      html: plantilla.html,
      text: plantilla.text,
    });

    if (r.ok && f.notificacion_id) {
      await supabase.rpc("marcar_notificacion_email_enviada", {
        notif_id: f.notificacion_id,
      });
    }
  } catch (e) {
    console.warn("[mensajeria] error disparando email:", e);
  }
}

/**
 * Devuelve la bandeja de conversaciones del usuario autenticado,
 * ordenadas por actividad reciente. Cada fila trae también el alias
 * de la otra persona y el número de mensajes no leídos.
 */
export async function listarMisConversaciones(): Promise<ConversacionResumen[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: convs } = await supabase
    .from("conversaciones")
    .select(
      "id, usuario_a_id, usuario_b_id, creado_el, ultimo_mensaje_el, ultimo_visto_a_el, ultimo_visto_b_el",
    )
    .or(`usuario_a_id.eq.${user.id},usuario_b_id.eq.${user.id}`)
    .order("ultimo_mensaje_el", { ascending: false });

  if (!convs || convs.length === 0) return [];

  type ConvRow = {
    id: string;
    usuario_a_id: string;
    usuario_b_id: string;
    creado_el: string;
    ultimo_mensaje_el: string;
    ultimo_visto_a_el: string;
    ultimo_visto_b_el: string;
  };

  const rows = convs as ConvRow[];

  // Resolver alias del otro usuario
  const otrosIds = Array.from(
    new Set(
      rows.map((c) => (c.usuario_a_id === user.id ? c.usuario_b_id : c.usuario_a_id)),
    ),
  );

  const { data: perfiles } = await supabase
    .from("perfiles_publicos")
    .select("id, alias_publico")
    .in("id", otrosIds);
  const aliasPorId = new Map<string, string>(
    (perfiles ?? []).map((p) => [
      (p as { id: string }).id,
      (p as { alias_publico: string }).alias_publico,
    ]),
  );

  // Último mensaje (texto) y conteo de no leídos por conversación
  const { data: ultimosMensajes } = await supabase
    .from("mensajes")
    .select("conversacion_id, contenido, creado_el, remitente_id")
    .in(
      "conversacion_id",
      rows.map((r) => r.id),
    )
    .order("creado_el", { ascending: false });

  type MsgRow = {
    conversacion_id: string;
    contenido: string;
    creado_el: string;
    remitente_id: string;
  };
  const msgs = (ultimosMensajes ?? []) as MsgRow[];
  const ultimoPorConv = new Map<string, MsgRow>();
  for (const m of msgs) {
    if (!ultimoPorConv.has(m.conversacion_id)) {
      ultimoPorConv.set(m.conversacion_id, m);
    }
  }

  return rows.map((c) => {
    const yoSoyA = c.usuario_a_id === user.id;
    const otroId = yoSoyA ? c.usuario_b_id : c.usuario_a_id;
    const visto = yoSoyA ? c.ultimo_visto_a_el : c.ultimo_visto_b_el;
    const noLeidos = msgs.filter(
      (m) =>
        m.conversacion_id === c.id &&
        m.remitente_id !== user.id &&
        m.creado_el > visto,
    ).length;
    const ultimo = ultimoPorConv.get(c.id);

    return {
      id: c.id,
      otro_usuario_id: otroId,
      otro_alias: aliasPorId.get(otroId) ?? "—",
      ultimo_mensaje_texto: ultimo?.contenido ?? null,
      ultimo_mensaje_el: c.ultimo_mensaje_el,
      no_leidos: noLeidos,
      creado_el: c.creado_el,
    };
  });
}

/**
 * Devuelve el detalle de una conversación (cabecera + todos los
 * mensajes en orden cronológico) y, de paso, marca como vista para
 * el usuario actual.
 */
export async function leerConversacion(
  conversacionId: string,
): Promise<ConversacionDetalle | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conv } = await supabase
    .from("conversaciones")
    .select("id, usuario_a_id, usuario_b_id, anuncio_a_id, anuncio_b_id")
    .eq("id", conversacionId)
    .maybeSingle();

  if (!conv) return null;

  type ConvRow = {
    id: string;
    usuario_a_id: string;
    usuario_b_id: string;
    anuncio_a_id: string | null;
    anuncio_b_id: string | null;
  };
  const c = conv as ConvRow;

  const yoSoyA = c.usuario_a_id === user.id;
  if (!yoSoyA && c.usuario_b_id !== user.id) {
    // RLS lo impediría igualmente, pero por si acaso.
    return null;
  }
  const otroId = yoSoyA ? c.usuario_b_id : c.usuario_a_id;

  const { data: perfilOtro } = await supabase
    .from("perfiles_publicos")
    .select("alias_publico")
    .eq("id", otroId)
    .maybeSingle();
  const otroAlias = (perfilOtro as { alias_publico: string } | null)?.alias_publico ?? "—";

  const { data: mensajesData } = await supabase
    .from("mensajes")
    .select("id, remitente_id, contenido, creado_el")
    .eq("conversacion_id", conversacionId)
    .order("creado_el", { ascending: true });

  const mensajes = (mensajesData ?? []) as Mensaje[];

  // Datos del anuncio del OTRO (el que motivo la conversacion). Asi en
  // la cabecera del chat se ve "sobre Maestros 035 Musica en Sobrado"
  // en lugar de solo el alias generico.
  const suAnuncioId = yoSoyA ? c.anuncio_b_id : c.anuncio_a_id;
  let suAnuncio: AnuncioContexto | null = null;
  if (suAnuncioId) {
    const { data: anuncioRow } = await supabase
      .from("anuncios")
      .select(
        `id, estado,
         cuerpo:cuerpos(codigo_oficial, denominacion),
         especialidad:especialidades(codigo_oficial, denominacion),
         municipio:municipios!municipio_actual_codigo(nombre)`,
      )
      .eq("id", suAnuncioId)
      .maybeSingle();
    if (anuncioRow) {
      type AnuncioRow = {
        id: string;
        estado: string;
        cuerpo:
          | { codigo_oficial: string | null; denominacion: string }
          | { codigo_oficial: string | null; denominacion: string }[]
          | null;
        especialidad:
          | { codigo_oficial: string | null; denominacion: string }
          | { codigo_oficial: string | null; denominacion: string }[]
          | null;
        municipio:
          | { nombre: string }
          | { nombre: string }[]
          | null;
      };
      const a = anuncioRow as unknown as AnuncioRow;
      const c1 = Array.isArray(a.cuerpo) ? a.cuerpo[0] : a.cuerpo;
      const e1 = Array.isArray(a.especialidad) ? a.especialidad[0] : a.especialidad;
      const m1 = Array.isArray(a.municipio) ? a.municipio[0] : a.municipio;
      suAnuncio = {
        id: a.id,
        estado: a.estado,
        cuerpo_texto: c1
          ? `${c1.codigo_oficial ? c1.codigo_oficial + " · " : ""}${c1.denominacion}`
          : "Cuerpo desconocido",
        especialidad_texto: e1
          ? `${e1.codigo_oficial ? e1.codigo_oficial + " · " : ""}${e1.denominacion}`
          : null,
        municipio: m1?.nombre ?? "—",
      };
    }
  }

  // Marcar como vista (es server action, no necesita ser síncrona).
  await supabase.rpc("marcar_conversacion_vista", { conv_id: conversacionId });

  return {
    id: c.id,
    yo_soy_a: yoSoyA,
    otro_usuario_id: otroId,
    otro_alias: otroAlias,
    mi_anuncio_id: yoSoyA ? c.anuncio_a_id : c.anuncio_b_id,
    su_anuncio_id: suAnuncioId,
    su_anuncio: suAnuncio,
    mensajes,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

export type ConversacionDetalle = {
  id: string;
  yo_soy_a: boolean;
  otro_usuario_id: string;
  otro_alias: string;
  mi_anuncio_id: string | null;
  su_anuncio_id: string | null;
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

  const { error } = await supabase.from("mensajes").insert({
    conversacion_id: conversacionId,
    remitente_id: user.id,
    contenido: texto,
  });

  if (error) {
    return { ok: false, mensaje: error.message };
  }

  revalidatePath(`/mensajes/${conversacionId}`);
  revalidatePath("/mensajes");
  return { ok: true };
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

  // Marcar como vista (es server action, no necesita ser síncrona).
  await supabase.rpc("marcar_conversacion_vista", { conv_id: conversacionId });

  return {
    id: c.id,
    yo_soy_a: yoSoyA,
    otro_usuario_id: otroId,
    otro_alias: otroAlias,
    mi_anuncio_id: yoSoyA ? c.anuncio_a_id : c.anuncio_b_id,
    su_anuncio_id: yoSoyA ? c.anuncio_b_id : c.anuncio_a_id,
    mensajes,
  };
}

/**
 * Conversaciones entre personas de una cadena: quien ha escrito, cuantos
 * mensajes y cuando. Lo usan el panel de admin y el correo de
 * seguimiento. Solo se leen recuentos y fechas, nunca el contenido.
 * Siempre con el cliente de servidor.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { leerPorLotes, leerTodo } from "./universo";

export type ConversacionFila = {
  id: string;
  usuario_a_id: string;
  usuario_b_id: string;
  creado_el: string;
};

export type ActividadConversacion = {
  porRemitente: Map<string, number>;
  /** Primer mensaje de cada persona. */
  primeroDe: Map<string, string>;
  ultimo: string | null;
};

/** Las conversaciones guardan siempre el par ordenado (a < b). */
export function clavePar(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Momento en que las dos personas ya se habian escrito (null si alguna
 *  no ha escrito todavia). */
export function inicioMutuo(
  act: ActividadConversacion | undefined,
  a: string,
  b: string,
): string | null {
  const pa = act?.primeroDe.get(a);
  const pb = act?.primeroDe.get(b);
  if (!pa || !pb) return null;
  return pa > pb ? pa : pb;
}

/** Conversaciones reales (no de demostracion) de estas personas. */
export async function cargarConversaciones(
  sb: SupabaseClient,
  usuarioIds: string[],
): Promise<ConversacionFila[]> {
  const filas = await leerPorLotes<ConversacionFila>(usuarioIds, (lote, desde, hasta) =>
    sb
      .from("conversaciones")
      .select("id, usuario_a_id, usuario_b_id, creado_el")
      .eq("es_demo", false)
      .or(`usuario_a_id.in.(${lote.join(",")}),usuario_b_id.in.(${lote.join(",")})`)
      .order("id")
      .range(desde, hasta),
  );
  return Array.from(new Map(filas.map((f) => [f.id, f])).values());
}

export async function cargarActividad(
  sb: SupabaseClient,
  conversacionIds: string[],
): Promise<Map<string, ActividadConversacion>> {
  const filas = await leerPorLotes<{
    id: string;
    conversacion_id: string;
    remitente_id: string;
    creado_el: string;
  }>(conversacionIds, (lote, desde, hasta) =>
    sb
      .from("mensajes")
      .select("id, conversacion_id, remitente_id, creado_el")
      .in("conversacion_id", lote)
      .eq("es_sistema", false)
      .order("id")
      .range(desde, hasta),
  );
  const mapa = new Map<string, ActividadConversacion>();
  for (const m of filas) {
    const a = mapa.get(m.conversacion_id) ?? {
      porRemitente: new Map<string, number>(),
      primeroDe: new Map<string, string>(),
      ultimo: null,
    };
    a.porRemitente.set(m.remitente_id, (a.porRemitente.get(m.remitente_id) ?? 0) + 1);
    const primero = a.primeroDe.get(m.remitente_id);
    if (!primero || m.creado_el < primero) a.primeroDe.set(m.remitente_id, m.creado_el);
    if (!a.ultimo || m.creado_el > a.ultimo) a.ultimo = m.creado_el;
    mapa.set(m.conversacion_id, a);
  }
  return mapa;
}

/** Cuentas de administrador: sus conversaciones son pruebas o soporte. */
export async function cargarAdmins(sb: SupabaseClient): Promise<Set<string>> {
  const filas = await leerTodo<{ id: string }>((desde, hasta) =>
    sb.from("perfiles_usuario").select("id").eq("es_admin", true).order("id").range(desde, hasta),
  );
  return new Set(filas.map((f) => f.id));
}

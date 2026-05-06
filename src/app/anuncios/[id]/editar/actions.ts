"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  expandirAtajos,
  type AtajoEntrada,
} from "@/app/anuncios/nuevo/actions";
import { notificarCadenasNuevas } from "@/lib/cadenas/notificar";

export type ActualizarAnuncioInput = {
  fecha_toma_posesion_definitiva: string;
  anyos_servicio_totales: number;
  permuta_anterior_fecha: string | null;
  observaciones: string;
  plazas_deseadas: string[];
  atajos: AtajoEntrada[];
};

export type ActualizarAnuncioResultado =
  | { ok: true }
  | { ok: false; mensaje: string };

export async function actualizarAnuncio(
  id: string,
  input: ActualizarAnuncioInput,
): Promise<ActualizarAnuncioResultado> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "No tienes sesión activa." };

  // Verifica que el anuncio existe y pertenece al usuario.
  const { data: existing, error: errFetch } = await supabase
    .from("anuncios")
    .select("id, usuario_id, municipio_actual_codigo")
    .eq("id", id)
    .maybeSingle();

  if (errFetch || !existing) {
    return { ok: false, mensaje: "Anuncio no encontrado." };
  }
  if (existing.usuario_id !== user.id) {
    return { ok: false, mensaje: "No puedes editar este anuncio." };
  }

  // Validaciones
  if (!input.fecha_toma_posesion_definitiva)
    return { ok: false, mensaje: "Falta la fecha de toma de posesión." };
  if (
    typeof input.anyos_servicio_totales !== "number" ||
    input.anyos_servicio_totales < 0 ||
    input.anyos_servicio_totales > 50
  )
    return { ok: false, mensaje: "Los años de servicio deben estar entre 0 y 50." };
  if (input.observaciones && input.observaciones.length > 500)
    return { ok: false, mensaje: "Las observaciones superan los 500 caracteres." };
  if (input.plazas_deseadas.length === 0)
    return { ok: false, mensaje: "Tienes que indicar al menos un municipio deseado." };
  if (input.plazas_deseadas.includes(existing.municipio_actual_codigo as string))
    return {
      ok: false,
      mensaje: "El municipio actual no puede estar entre las plazas deseadas.",
    };

  // 1) UPDATE anuncio
  const { error: errUpd } = await supabase
    .from("anuncios")
    .update({
      fecha_toma_posesion_definitiva: input.fecha_toma_posesion_definitiva,
      anyos_servicio_totales: input.anyos_servicio_totales,
      permuta_anterior_fecha: input.permuta_anterior_fecha,
      observaciones: input.observaciones || null,
    })
    .eq("id", id);

  if (errUpd) return { ok: false, mensaje: errUpd.message };

  // 2) Reemplazar plazas deseadas (DELETE + INSERT)
  await supabase.from("anuncio_plazas_deseadas").delete().eq("anuncio_id", id);
  const { error: errPlazas } = await supabase
    .from("anuncio_plazas_deseadas")
    .insert(
      input.plazas_deseadas.map((cod) => ({
        anuncio_id: id,
        municipio_codigo: cod,
      })),
    );
  if (errPlazas) return { ok: false, mensaje: errPlazas.message };

  // 3) Reemplazar atajos
  await supabase.from("anuncio_atajos").delete().eq("anuncio_id", id);
  if (input.atajos.length > 0) {
    await supabase.from("anuncio_atajos").insert(
      input.atajos.map((a) => ({
        anuncio_id: id,
        tipo: a.tipo,
        valor: a.valor,
      })),
    );
  }

  // 4) Notificación de cadenas nuevas (best-effort). Como editar puede
  // descubrir cadenas distintas a las que había con la versión anterior,
  // disparamos también aquí. La RPC `tomar_email_para_notificar_cadena`
  // deduplica por huella, así que cadenas ya notificadas no se reenvían.
  await notificarCadenasNuevas(id);

  revalidatePath("/mi-cuenta");
  revalidatePath("/anuncios");
  return { ok: true };
}

export async function actualizarAnuncioYRedirigir(
  id: string,
  input: ActualizarAnuncioInput,
) {
  const r = await actualizarAnuncio(id, input);
  if (!r.ok) return r;
  redirect("/mi-cuenta?actualizado=1");
}

export async function eliminarAnuncio(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, mensaje: "No autenticado." };

  const { error } = await supabase
    .from("anuncios")
    .update({ estado: "eliminado" })
    .eq("id", id)
    .eq("usuario_id", user.id);

  if (error) return { ok: false as const, mensaje: error.message };
  revalidatePath("/mi-cuenta");
  revalidatePath("/anuncios");
  return { ok: true as const };
}

/**
 * Marca el anuncio como "permuta conseguida".
 *
 * - Cambia estado a 'permutado' y registra `permutado_el = now()`.
 * - Solo se permite si el anuncio actual estaba 'activo' (no se puede
 *   "reabrir" un anuncio ya cerrado o eliminado por esta via).
 * - Una vez permutado, el matcher (`detectarCadenas`) deja de incluirlo
 *   en cadenas porque filtra por `estado = 'activo'`.
 *
 * Es responsabilidad del usuario marcarlo cuando el trato esta cerrado;
 * la app no detecta cierres automaticamente.
 */
export async function marcarPermutaConseguida(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, mensaje: "No autenticado." };

  // Verifica que es del usuario y esta en estado activo.
  const { data: existing, error: errFetch } = await supabase
    .from("anuncios")
    .select("id, usuario_id, estado")
    .eq("id", id)
    .maybeSingle();

  if (errFetch || !existing) {
    return { ok: false as const, mensaje: "Anuncio no encontrado." };
  }
  if (existing.usuario_id !== user.id) {
    return { ok: false as const, mensaje: "Este anuncio no es tuyo." };
  }
  if (existing.estado !== "activo") {
    return {
      ok: false as const,
      mensaje: `El anuncio esta en estado "${existing.estado}", no se puede marcar como permutado.`,
    };
  }

  const { error } = await supabase
    .from("anuncios")
    .update({
      estado: "permutado",
      permutado_el: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("usuario_id", user.id);

  if (error) return { ok: false as const, mensaje: error.message };

  revalidatePath("/mi-cuenta");
  revalidatePath("/anuncios");
  revalidatePath("/auto-permutas");
  return { ok: true as const };
}

// Vuelve a expandir los atajos guardados a la lista plana de municipios.
// Usado por la página de edición para precargar el estado actual.
export async function expandirAtajosDeAnuncio(
  atajos: AtajoEntrada[],
): Promise<string[]> {
  return expandirAtajos(atajos);
}

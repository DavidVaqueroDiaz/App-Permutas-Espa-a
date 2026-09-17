"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  expandirAtajos,
  type AtajoEntrada,
} from "@/app/anuncios/nuevo/actions";
import {
  notificarCadenasNuevas,
  notificarCadenaCerradaPorPermuta,
} from "@/lib/cadenas/notificar";
import { atajosValidos, unirPlazas } from "@/lib/cadenas/plazas";

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
    .select("id, usuario_id, municipio_actual_codigo, estado")
    .eq("id", id)
    .maybeSingle();

  if (errFetch || !existing) {
    return { ok: false, mensaje: "Anuncio no encontrado." };
  }
  if (existing.usuario_id !== user.id) {
    return { ok: false, mensaje: "No puedes editar este anuncio." };
  }
  if (existing.estado !== "activo" && existing.estado !== "caducado") {
    return { ok: false, mensaje: "Este anuncio ya está cerrado y no se puede editar." };
  }
  const municipioActual = existing.municipio_actual_codigo as string;

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
  if (input.plazas_deseadas.includes(municipioActual))
    return {
      ok: false,
      mensaje: "El municipio actual no puede estar entre las plazas deseadas.",
    };

  // Lista definitiva: lo que llega del navegador mas lo que sale de los
  // atajos. Antes la pagina de edicion solo cargaba 1000 municipios y al
  // guardar se perdian los demas.
  const atajos = atajosValidos(input.atajos);
  let plazasFinal: string[];
  try {
    plazasFinal = unirPlazas(input.plazas_deseadas, await expandirAtajos(atajos), municipioActual);
  } catch (e) {
    console.warn("[actualizarAnuncio] no se pudieron expandir los atajos:", e);
    return {
      ok: false,
      mensaje: "No se pudo preparar la lista de municipios. Inténtalo de nuevo en unos segundos.",
    };
  }
  if (plazasFinal.length === 0)
    return { ok: false, mensaje: "Tienes que indicar al menos un municipio deseado." };

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

  // 2) Reemplazar plazas deseadas en una sola transaccion: si algo falla,
  // la lista anterior queda intacta.
  const { error: errPlazas } = await supabase.rpc("reemplazar_plazas_deseadas", {
    p_anuncio_id: id,
    p_codigos: plazasFinal,
  });
  if (errPlazas) return { ok: false, mensaje: errPlazas.message };

  // 3) Reemplazar atajos
  await supabase.from("anuncio_atajos").delete().eq("anuncio_id", id);
  if (atajos.length > 0) {
    await supabase.from("anuncio_atajos").insert(
      atajos.map((a) => ({
        anuncio_id: id,
        tipo: a.tipo,
        valor: a.valor,
      })),
    );
  }

  // 4) Guardar tambien renueva 6 meses (y reactiva si habia caducado),
  // como promete el correo de caducidad.
  const { error: errRenovar } = await supabase.rpc("renovar_anuncio", { p_anuncio_id: id });
  if (errRenovar) {
    console.warn("[actualizarAnuncio] no se pudo renovar:", errRenovar.message);
    return {
      ok: false,
      mensaje:
        "Los cambios se han guardado, pero no se pudo renovar el anuncio. Pulsa «Renovar 6 meses» en tu cuenta o inténtalo de nuevo.",
    };
  }

  // 5) Notificación de cadenas nuevas (best-effort). Editar o reactivar
  // puede descubrir cadenas nuevas; las ya avisadas no se repiten.
  await notificarCadenasNuevas(id);

  revalidatePath("/mi-cuenta");
  revalidatePath("/mis-cadenas");
  revalidatePath("/anuncios");
  return { ok: true };
}

/**
 * Renueva el anuncio 6 meses desde hoy. Si habia caducado, vuelve a
 * publicarse y se buscan cadenas nuevas con el.
 */
export async function renovarAnuncio(
  id: string,
): Promise<{ ok: true; caduca_el: string } | { ok: false; mensaje: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "No tienes sesión activa." };

  const { data, error } = await supabase.rpc("renovar_anuncio", { p_anuncio_id: id });
  if (error || !data) {
    return { ok: false, mensaje: "No se pudo renovar este anuncio." };
  }

  await notificarCadenasNuevas(id);

  revalidatePath("/mi-cuenta");
  revalidatePath("/mis-cadenas");
  revalidatePath("/anuncios");
  return { ok: true, caduca_el: data as string };
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

  // Best-effort: avisar a los otros participantes de cadenas que ya
  // no son viables. Si falla, no rompe la accion (el cierre ya se
  // ha aplicado en BD).
  await notificarCadenaCerradaPorPermuta(id);

  revalidatePath("/mi-cuenta");
  revalidatePath("/mis-cadenas");
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

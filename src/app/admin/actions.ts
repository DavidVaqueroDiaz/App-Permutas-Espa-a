"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Comprueba si el usuario autenticado es administrador. Lo usamos en
 * las server actions del admin panel para devolver siempre un error
 * coherente si alguien intenta llamarlas sin permisos (aunque la BD
 * también lo verifica via SQL).
 */
export async function esAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("es_admin_actual");
  return data === true;
}

/**
 * Borra cualquier anuncio (ajeno o propio) como administrador.
 * El check de permiso lo hace la propia función SQL
 * `borrar_anuncio_admin` — si el usuario no es admin, lanza excepción.
 */
export async function eliminarAnuncioAdmin(
  anuncioId: string,
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("borrar_anuncio_admin", {
    anuncio_id: anuncioId,
  });
  if (error) return { ok: false, mensaje: error.message };
  if (data !== true) {
    return { ok: false, mensaje: "Anuncio no encontrado." };
  }
  revalidatePath("/admin");
  revalidatePath("/anuncios");
  revalidatePath("/");
  return { ok: true };
}

/**
 * Resuelve un reporte (admin). accion = 'eliminar' marca el anuncio
 * como eliminado y cierra TODOS los reportes pendientes de ese anuncio.
 * accion = 'ignorar' solo cierra este reporte.
 */
export async function resolverReporteAdmin(
  reporteId: string,
  accion: "eliminar" | "ignorar",
): Promise<{ ok: true } | { ok: false; mensaje: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("resolver_reporte", {
    reporte_id: reporteId,
    accion,
  });
  if (error) return { ok: false, mensaje: error.message };
  if (data !== true) {
    return { ok: false, mensaje: "Reporte no encontrado o ya resuelto." };
  }
  revalidatePath("/admin");
  revalidatePath("/anuncios");
  return { ok: true };
}

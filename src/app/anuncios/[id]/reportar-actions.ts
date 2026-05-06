"use server";

import { createClient } from "@/lib/supabase/server";
import { aplicarRateLimit } from "@/lib/rate-limit";

export type MotivoReporte =
  | "spam"
  | "datos_falsos"
  | "suplantacion"
  | "lenguaje_inapropiado"
  | "duplicado"
  | "otro";

const MOTIVOS_VALIDOS: MotivoReporte[] = [
  "spam",
  "datos_falsos",
  "suplantacion",
  "lenguaje_inapropiado",
  "duplicado",
  "otro",
];

export type ReportarResultado =
  | { ok: true }
  | { ok: false; mensaje: string };

/**
 * Reporta un anuncio. Cualquier usuario autenticado puede hacerlo,
 * excepto sobre su propio anuncio. Si ya tiene un reporte pendiente
 * para ese anuncio, devuelve un mensaje claro (la unique constraint
 * lo impide a nivel BD).
 */
export async function reportarAnuncio(input: {
  anuncioId: string;
  motivo: MotivoReporte;
  comentario: string;
}): Promise<ReportarResultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, mensaje: "Tienes que iniciar sesion para reportar." };
  }
  if (!MOTIVOS_VALIDOS.includes(input.motivo)) {
    return { ok: false, mensaje: "Motivo invalido." };
  }
  const comentario = input.comentario.trim();
  if (comentario.length > 500) {
    return {
      ok: false,
      mensaje: "El comentario no puede superar los 500 caracteres.",
    };
  }

  // Rate limit: 10 reportes/usuario/hora. Si alguien tiene mas de 10
  // motivos legitimos de reporte en una hora, hay otro problema.
  const rl = await aplicarRateLimit({
    clave: `reporte:${user.id}`,
    ventanaSegundos: 3600,
    max: 10,
    mensajeBloqueado:
      "Has enviado demasiados reportes en la última hora. Espera un poco antes de seguir.",
  });
  if (!rl.permitido) return { ok: false, mensaje: rl.mensaje };

  // No puedes reportar tu propio anuncio.
  const { data: anuncio } = await supabase
    .from("anuncios")
    .select("id, usuario_id")
    .eq("id", input.anuncioId)
    .maybeSingle();
  if (!anuncio) {
    return { ok: false, mensaje: "Anuncio no encontrado." };
  }
  if ((anuncio as { usuario_id: string }).usuario_id === user.id) {
    return { ok: false, mensaje: "No puedes reportar tu propio anuncio." };
  }

  const { error } = await supabase.from("reportes_anuncios").insert({
    anuncio_id: input.anuncioId,
    reportado_por: user.id,
    motivo: input.motivo,
    comentario: comentario || null,
  });

  if (error) {
    // 23505 = unique_violation. Significa que ya tiene reporte pendiente.
    if (error.code === "23505") {
      return {
        ok: false,
        mensaje:
          "Ya tienes un reporte pendiente sobre este anuncio. Espera a que lo revisemos.",
      };
    }
    return { ok: false, mensaje: error.message };
  }

  return { ok: true };
}

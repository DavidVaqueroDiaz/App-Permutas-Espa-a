"use server";

import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-url";
import { leerPorLotes, leerTodo } from "@/lib/cadenas/universo";
import {
  construirExportacion,
  nombreArchivoExportacion,
  type AtajoExportado,
  type PlazaExportada,
  type Registro,
} from "@/lib/rgpd/exportacion";

// ===========================================================================
// Derecho de acceso (art. 15) + portabilidad (art. 20):
// devuelve un objeto JSON estructurado con TODOS los datos personales del
// usuario que llama. El cliente se encarga de descargarlo como archivo.
//
// Lo que SI exportamos:
//   - Perfil (alias, ano nacimiento, fechas, version politica privacidad).
//   - Email y email_confirmed_at (de auth.users via la sesion).
//   - Anuncios (incluyendo eliminados/permutados; el usuario tiene derecho
//     a ver todo lo que se guarda, no solo lo activo).
//   - Plazas deseadas y atajos asociados a cada anuncio.
//   - Conversaciones donde participa.
//   - Mensajes que ha enviado o recibido.
//   - Reportes de anuncios que ha hecho.
//   - Notificaciones de cadena recibidas y correos de seguimiento.
//
// Lo que NO incluimos:
//   - Datos de OTROS usuarios (perfiles ajenos, anuncios ajenos).
//   - Datos del sistema (rate_limit, cadenas_detectadas, etc.) que no
//     son personales en el sentido del RGPD.
//
// TODAS las consultas pasan por `leerTodo` / `leerPorLotes`: la API
// devuelve como mucho 1000 filas por peticion, paginar sin un orden
// estable puede saltarse filas y un filtro `in (...)` con unos 400
// identificadores revienta la peticion. Se leen con la sesion del usuario
// (con RLS), nunca con el cliente de servidor. Si una lectura falla no se
// entrega un archivo a medias: se devuelve error para que lo repita.
// ===========================================================================

export type ExportarDatosResultado =
  | { ok: true; json: string; filename: string }
  | { ok: false; mensaje: string };

export async function exportarMisDatos(): Promise<ExportarDatosResultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "No autenticado." };

  try {
    const { data: perfil, error: errPerfil } = await supabase
      .from("perfiles_usuario")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (errPerfil) throw new Error(errPerfil.message);

    const [anuncios, conversaciones, mensajesEnviados, reportes, cadenasNotificadas, seguimientos] =
      await Promise.all([
        leerTodo<Registro>((desde, hasta) =>
          supabase
            .from("anuncios")
            .select("*")
            .eq("usuario_id", user.id)
            .order("id")
            .range(desde, hasta),
        ),
        leerTodo<Registro>((desde, hasta) =>
          supabase
            .from("conversaciones")
            .select("*")
            .or(`usuario_a_id.eq.${user.id},usuario_b_id.eq.${user.id}`)
            .order("id")
            .range(desde, hasta),
        ),
        leerTodo<Registro>((desde, hasta) =>
          supabase
            .from("mensajes")
            .select("*")
            .eq("remitente_id", user.id)
            .order("id")
            .range(desde, hasta),
        ),
        leerTodo<Registro>((desde, hasta) =>
          supabase
            .from("reportes_anuncios")
            .select("*")
            .eq("reportado_por", user.id)
            .order("id")
            .range(desde, hasta),
        ),
        leerTodo<Registro>((desde, hasta) =>
          supabase
            .from("cadenas_notificadas")
            .select("*")
            .eq("usuario_id", user.id)
            .order("id")
            .range(desde, hasta),
        ),
        leerTodo<Registro>((desde, hasta) =>
          supabase
            .from("seguimientos_permuta")
            .select("*")
            .eq("usuario_id", user.id)
            .order("id")
            .range(desde, hasta),
        ),
      ]);

    const idsAnuncios = anuncios.map((a) => String((a as { id?: unknown }).id ?? ""));
    const idsConversaciones = conversaciones.map((c) => String((c as { id?: unknown }).id ?? ""));

    // Mensajes recibidos: los de mis conversaciones que no he escrito yo.
    const [plazas, atajos, mensajesRecibidos] = await Promise.all([
      leerPorLotes<PlazaExportada>(idsAnuncios, (lote, desde, hasta) =>
        supabase
          .from("anuncio_plazas_deseadas")
          .select("anuncio_id, municipio_codigo")
          .in("anuncio_id", lote)
          .order("anuncio_id")
          .order("municipio_codigo")
          .range(desde, hasta),
      ),
      leerPorLotes<AtajoExportado>(idsAnuncios, (lote, desde, hasta) =>
        supabase
          .from("anuncio_atajos")
          .select("anuncio_id, tipo, valor, creado_el")
          .in("anuncio_id", lote)
          .order("id")
          .range(desde, hasta),
      ),
      leerPorLotes<Registro>(idsConversaciones, (lote, desde, hasta) =>
        supabase
          .from("mensajes")
          .select("*")
          .in("conversacion_id", lote)
          .neq("remitente_id", user.id)
          .order("id")
          .range(desde, hasta),
      ),
    ]);

    const ahora = new Date();
    const exportado = construirExportacion({
      cuenta: {
        id: user.id,
        email: user.email ?? null,
        email_confirmed_at: user.email_confirmed_at ?? null,
        created_at: user.created_at ?? null,
        last_sign_in_at: user.last_sign_in_at ?? null,
      },
      perfil: (perfil as Registro | null) ?? null,
      anuncios,
      plazas,
      atajos,
      conversaciones,
      mensajesEnviados,
      mensajesRecibidos,
      reportes,
      cadenasNotificadas,
      seguimientos,
      sitioUrl: SITE_URL,
      ahora,
    });

    return {
      ok: true,
      json: JSON.stringify(exportado, null, 2),
      filename: nombreArchivoExportacion(ahora),
    };
  } catch (e) {
    // Mejor no dar nada que dar un archivo incompleto: el usuario tiene
    // derecho a TODOS sus datos.
    console.warn("[rgpd] no se pudieron reunir todos los datos:", e);
    return {
      ok: false,
      mensaje:
        "No hemos podido reunir todos tus datos ahora mismo. Vuelve a intentarlo en unos minutos; si sigue fallando, escríbenos y te los enviamos a mano.",
    };
  }
}

// ===========================================================================
// Derecho al olvido (art. 17): elimina la cuenta y todos los datos
// asociados via la RPC `eliminar_mi_cuenta` (migracion 0020).
// ===========================================================================

export type EliminarCuentaResultado =
  | { ok: true }
  | { ok: false; mensaje: string };

/**
 * Re-autentica al usuario antes de eliminar. La accion es irreversible y
 * queremos asegurarnos de que no es un robo de cookie ni alguien que
 * quedo logueado en un equipo prestado.
 */
export async function eliminarMiCuenta(
  passwordActual: string,
): Promise<EliminarCuentaResultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "No autenticado." };
  if (!user.email) return { ok: false, mensaje: "Tu cuenta no tiene email asociado." };

  // 1) Verificacion de password: probamos a iniciar sesion con la misma
  //    cuenta+pass. Si falla, no avanzamos.
  const { error: errSign } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: passwordActual,
  });
  if (errSign) {
    return {
      ok: false,
      mensaje: "La contrasena no es correcta. Por seguridad, no eliminamos la cuenta.",
    };
  }

  // 2) Borrar via RPC (security definer). En cascada elimina todos los
  //    datos asociados.
  const { error: errBorrar } = await supabase.rpc("eliminar_mi_cuenta");
  if (errBorrar) {
    return {
      ok: false,
      mensaje: `No se pudo eliminar la cuenta: ${errBorrar.message}`,
    };
  }

  // 3) Cerrar la sesion del lado cliente. La cookie ya no es valida porque
  //    el usuario ya no existe, pero el SDK necesita saberlo.
  await supabase.auth.signOut();

  return { ok: true };
}

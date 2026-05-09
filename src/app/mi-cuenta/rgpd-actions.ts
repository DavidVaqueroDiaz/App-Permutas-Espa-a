"use server";

import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site-url";

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
//   - Notificaciones de cadena recibidas.
//
// Lo que NO incluimos:
//   - Datos de OTROS usuarios (perfiles ajenos, anuncios ajenos).
//   - Datos del sistema (rate_limit, cadenas_detectadas, etc.) que no
//     son personales en el sentido del RGPD.
// ===========================================================================

export type ExportarDatosResultado =
  | { ok: true; json: string; filename: string }
  | { ok: false; mensaje: string };

export async function exportarMisDatos(): Promise<ExportarDatosResultado> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "No autenticado." };

  const [
    perfilRes,
    anunciosRes,
    plazasRes,
    atajosRes,
    convsRes,
    mensajesRes,
    reportesRes,
    cadenasNotifRes,
  ] = await Promise.all([
    supabase
      .from("perfiles_usuario")
      .select("*")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("anuncios")
      .select("*")
      .eq("usuario_id", user.id),
    // Plazas deseadas: las traemos juntando por anuncio_id mas tarde.
    supabase
      .from("anuncio_plazas_deseadas")
      .select("anuncio_id, municipio_codigo")
      .in(
        "anuncio_id",
        // subselect inline no funciona desde supabase-js; las recogemos
        // tras tener la lista de anuncios.
        // Usamos un placeholder que filtramos luego.
        ["00000000-0000-0000-0000-000000000000"],
      ),
    supabase
      .from("anuncio_atajos")
      .select("anuncio_id, tipo, valor, creado_el")
      .in("anuncio_id", ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("conversaciones")
      .select("*")
      .or(`usuario_a_id.eq.${user.id},usuario_b_id.eq.${user.id}`),
    supabase
      .from("mensajes")
      .select("*")
      .eq("remitente_id", user.id),
    supabase
      .from("reportes_anuncios")
      .select("*")
      .eq("reportado_por", user.id),
    supabase
      .from("cadenas_notificadas")
      .select("*")
      .eq("usuario_id", user.id),
  ]);

  // Vuelta a por las plazas y atajos con los IDs reales.
  // RGPD: tenemos OBLIGACION LEGAL de devolver todos los datos.
  // PostgREST trunca a 1000 filas — paginamos para garantizarlo.
  const anuncios = anunciosRes.data ?? [];
  const ids = anuncios.map((a) => (a as { id: string }).id);
  let plazas: unknown[] = [];
  let atajos: unknown[] = [];
  if (ids.length > 0) {
    async function paginarPorAnuncioId<T>(tabla: string, columnas: string): Promise<T[]> {
      const PAGE = 1000;
      let offset = 0;
      const todas: T[] = [];
      while (true) {
        const { data } = await supabase
          .from(tabla)
          .select(columnas)
          .in("anuncio_id", ids)
          .range(offset, offset + PAGE - 1);
        if (!data || data.length === 0) break;
        todas.push(...(data as T[]));
        if (data.length < PAGE) break;
        offset += PAGE;
        if (offset > 100_000) break;
      }
      return todas;
    }
    const [plData, atData] = await Promise.all([
      paginarPorAnuncioId<{ anuncio_id: string; municipio_codigo: string }>(
        "anuncio_plazas_deseadas",
        "anuncio_id, municipio_codigo",
      ),
      paginarPorAnuncioId<{ anuncio_id: string; tipo: string; valor: string; creado_el: string }>(
        "anuncio_atajos",
        "anuncio_id, tipo, valor, creado_el",
      ),
    ]);
    plazas = plData;
    atajos = atData;
  }

  // Mensajes recibidos: aquellos en conversaciones donde participo y NO
  // soy el remitente. Necesitamos la lista de conversaciones primero.
  const convs = (convsRes.data ?? []) as { id: string }[];
  const convIds = convs.map((c) => c.id);
  let mensajesRecibidos: unknown[] = [];
  if (convIds.length > 0) {
    const r = await supabase
      .from("mensajes")
      .select("*")
      .in("conversacion_id", convIds)
      .neq("remitente_id", user.id);
    mensajesRecibidos = r.data ?? [];
  }

  // Voids of the placeholders we used:
  void plazasRes;
  void atajosRes;

  const exportado = {
    metadata: {
      exportado_el: new Date().toISOString(),
      politica_privacidad_url: `${SITE_URL}/politica-privacidad`,
      formato: "json",
      version: 1,
    },
    cuenta: {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    perfil: perfilRes.data,
    anuncios: anuncios.map((a) => ({
      ...a,
      plazas_deseadas: (plazas as { anuncio_id: string; municipio_codigo: string }[])
        .filter((p) => p.anuncio_id === (a as { id: string }).id)
        .map((p) => p.municipio_codigo),
      atajos: (atajos as { anuncio_id: string; tipo: string; valor: string; creado_el: string }[])
        .filter((at) => at.anuncio_id === (a as { id: string }).id)
        .map(({ tipo, valor, creado_el }) => ({ tipo, valor, creado_el })),
    })),
    conversaciones: convs,
    mensajes_enviados: mensajesRes.data ?? [],
    mensajes_recibidos: mensajesRecibidos,
    reportes_que_he_hecho: reportesRes.data ?? [],
    cadenas_notificadas: cadenasNotifRes.data ?? [],
  };

  const fechaCorta = new Date().toISOString().slice(0, 10);
  return {
    ok: true,
    json: JSON.stringify(exportado, null, 2),
    filename: `permutaes-mis-datos-${fechaCorta}.json`,
  };
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

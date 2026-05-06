"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notificarCadenasNuevas } from "@/lib/cadenas/notificar";
import { aplicarRateLimit } from "@/lib/rate-limit";

// ----------------------------------------------------------------------
// Búsqueda de municipios para autocompletado
// ----------------------------------------------------------------------

export type MunicipioBusqueda = {
  codigo_ine: string;
  nombre: string;
  provincia_codigo: string;
  provincia_nombre: string;
};

export async function buscarMunicipios(
  query: string,
  limit = 20,
): Promise<MunicipioBusqueda[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();

  // ilike '%q%' es suficiente para 8132 municipios. El nombre tiene un
  // índice GIN (FTS) creado en la migración 0001 que acelera mucho la
  // búsqueda. Usamos ilike para permitir matches parciales también.
  const { data, error } = await supabase
    .from("municipios")
    .select("codigo_ine, nombre, provincia_codigo, provincias!inner(nombre)")
    .ilike("nombre", `%${q}%`)
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    codigo_ine: row.codigo_ine as string,
    nombre: row.nombre as string,
    provincia_codigo: row.provincia_codigo as string,
    provincia_nombre:
      (row.provincias as unknown as { nombre: string } | { nombre: string }[])
        ?.constructor === Array
        ? (row.provincias as unknown as { nombre: string }[])[0]?.nombre ?? ""
        : (row.provincias as unknown as { nombre: string })?.nombre ?? "",
  }));
}

// ----------------------------------------------------------------------
// Expansión de atajos a lista de municipios
// ----------------------------------------------------------------------

export type AtajoEntrada =
  | { tipo: "ccaa"; valor: string }
  | { tipo: "provincia"; valor: string }
  | { tipo: "municipio_individual"; valor: string };

/**
 * Expande una lista de atajos a la lista plana de códigos INE de municipios.
 * El usuario añade un atajo (toda Galicia, toda la provincia de Pontevedra,
 * Vigo individualmente...) y la app calcula los municipios resultantes.
 */
export async function expandirAtajos(
  atajos: AtajoEntrada[],
): Promise<string[]> {
  if (atajos.length === 0) return [];

  const supabase = await createClient();
  const conjunto = new Set<string>();

  // Acumulamos los códigos de provincias resultantes (los CCAA se expanden a
  // sus provincias y luego a sus municipios).
  const ccaaCodes = atajos.filter((a) => a.tipo === "ccaa").map((a) => a.valor);
  const provinciaCodes = atajos
    .filter((a) => a.tipo === "provincia")
    .map((a) => a.valor);
  const municipioCodes = atajos
    .filter((a) => a.tipo === "municipio_individual")
    .map((a) => a.valor);

  if (ccaaCodes.length > 0) {
    const { data } = await supabase
      .from("provincias")
      .select("codigo_ine")
      .in("ccaa_codigo", ccaaCodes);
    for (const row of data ?? []) {
      provinciaCodes.push(row.codigo_ine as string);
    }
  }

  if (provinciaCodes.length > 0) {
    const { data } = await supabase
      .from("municipios")
      .select("codigo_ine")
      .in("provincia_codigo", provinciaCodes);
    for (const row of data ?? []) {
      conjunto.add(row.codigo_ine as string);
    }
  }

  for (const m of municipioCodes) conjunto.add(m);

  return Array.from(conjunto);
}

// ----------------------------------------------------------------------
// Crear anuncio (acción final del wizard)
// ----------------------------------------------------------------------

export type CrearAnuncioInput = {
  cuerpo_id: string;
  especialidad_id: string | null;
  // Solo aplica al sector sanitario_sns. Para otros sectores debe ser null.
  servicio_salud_codigo: string | null;
  municipio_actual_codigo: string;
  fecha_toma_posesion_definitiva: string; // YYYY-MM-DD
  anyos_servicio_totales: number;
  permuta_anterior_fecha: string | null;
  observaciones: string;
  plazas_deseadas: string[];
  atajos: AtajoEntrada[];
};

export type CrearAnuncioResultado =
  | { ok: true; anuncio_id: string }
  | { ok: false; mensaje: string };

export async function crearAnuncio(
  input: CrearAnuncioInput,
): Promise<CrearAnuncioResultado> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "No tienes sesión activa." };
  if (!user.email_confirmed_at) {
    return { ok: false, mensaje: "Tienes que confirmar tu email antes de publicar." };
  }

  // Rate limit: 5 anuncios por usuario por dia. Una persona normal
  // publica 1-2 (uno por cuerpo si es el caso). Mas de 5 al dia sugiere
  // bot o abuso.
  const rl = await aplicarRateLimit({
    clave: `anuncio_nuevo:${user.id}`,
    ventanaSegundos: 86400,
    max: 5,
    mensajeBloqueado:
      "Has publicado demasiados anuncios hoy. Espera 24 horas antes de seguir.",
  });
  if (!rl.permitido) return { ok: false, mensaje: rl.mensaje };

  // Validaciones básicas (la lógica fina ya la aplica el cliente; esto es
  // la red de seguridad por si alguien manipula el envío).
  if (!input.cuerpo_id) return { ok: false, mensaje: "Falta el cuerpo." };
  if (!input.municipio_actual_codigo)
    return { ok: false, mensaje: "Falta la plaza actual." };
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
  if (input.plazas_deseadas.includes(input.municipio_actual_codigo))
    return {
      ok: false,
      mensaje: "El municipio actual no puede estar entre las plazas deseadas.",
    };

  // Resolver CCAA del municipio actual (la guardamos en el anuncio para
  // acelerar las queries de matching intra-CCAA).
  const { data: muniRow } = await supabase
    .from("municipios")
    .select("provincia_codigo, provincias!inner(ccaa_codigo)")
    .eq("codigo_ine", input.municipio_actual_codigo)
    .maybeSingle();

  type ProvJoin = { ccaa_codigo: string } | { ccaa_codigo: string }[];
  const provincias = (muniRow as unknown as { provincias: ProvJoin } | null)
    ?.provincias;
  const ccaa_codigo = Array.isArray(provincias)
    ? provincias[0]?.ccaa_codigo
    : provincias?.ccaa_codigo;

  if (!ccaa_codigo) {
    return { ok: false, mensaje: "El municipio actual no es válido." };
  }

  // Sector: lo deducimos del cuerpo elegido.
  const { data: cuerpoRow } = await supabase
    .from("cuerpos")
    .select("sector_codigo")
    .eq("id", input.cuerpo_id)
    .maybeSingle();
  if (!cuerpoRow) return { ok: false, mensaje: "El cuerpo seleccionado no existe." };
  const sector_codigo = (cuerpoRow as { sector_codigo: string }).sector_codigo;

  // Reglas servicio_salud_codigo: obligatorio si SNS, prohibido si no.
  if (sector_codigo === "sanitario_sns" && !input.servicio_salud_codigo) {
    return {
      ok: false,
      mensaje:
        "Los anuncios sanitarios necesitan un Servicio de Salud (SAS, SERGAS, SACYL, etc.).",
    };
  }
  if (sector_codigo !== "sanitario_sns" && input.servicio_salud_codigo) {
    return {
      ok: false,
      mensaje: "El campo Servicio de Salud solo aplica al sector sanitario.",
    };
  }

  // 1) INSERT anuncio
  const { data: anuncioInsert, error: errAnuncio } = await supabase
    .from("anuncios")
    .insert({
      usuario_id: user.id,
      sector_codigo,
      cuerpo_id: input.cuerpo_id,
      especialidad_id: input.especialidad_id,
      servicio_salud_codigo: input.servicio_salud_codigo,
      municipio_actual_codigo: input.municipio_actual_codigo,
      ccaa_codigo,
      fecha_toma_posesion_definitiva: input.fecha_toma_posesion_definitiva,
      anyos_servicio_totales: input.anyos_servicio_totales,
      permuta_anterior_fecha: input.permuta_anterior_fecha,
      observaciones: input.observaciones || null,
    })
    .select("id")
    .single();

  if (errAnuncio || !anuncioInsert) {
    return {
      ok: false,
      mensaje: errAnuncio?.message ?? "No se pudo crear el anuncio.",
    };
  }

  const anuncio_id = anuncioInsert.id as string;

  // 2) INSERT plazas deseadas
  const { error: errPlazas } = await supabase
    .from("anuncio_plazas_deseadas")
    .insert(
      input.plazas_deseadas.map((cod) => ({
        anuncio_id,
        municipio_codigo: cod,
      })),
    );

  if (errPlazas) {
    // Compensación: borramos el anuncio para no dejar basura.
    await supabase.from("anuncios").delete().eq("id", anuncio_id);
    return { ok: false, mensaje: errPlazas.message };
  }

  // 3) INSERT atajos (no crítico — si falla, el anuncio sigue siendo válido).
  if (input.atajos.length > 0) {
    await supabase.from("anuncio_atajos").insert(
      input.atajos.map((a) => ({
        anuncio_id,
        tipo: a.tipo,
        valor: a.valor,
      })),
    );
  }

  // 4) Notificación de cadenas nuevas: lanzamos el matcher con este
  // anuncio como origen y emitimos email a los otros participantes
  // de las cadenas detectadas (deduplicado contra cadenas_notificadas).
  // Best-effort: si falla no rompe la creación.
  await notificarCadenasNuevas(anuncio_id);

  return { ok: true, anuncio_id };
}

/**
 * Variante de `crearAnuncio` que, al terminar, redirige al usuario.
 * Se usa desde el componente cliente del wizard.
 */
export async function crearAnuncioYRedirigir(input: CrearAnuncioInput) {
  const r = await crearAnuncio(input);
  if (!r.ok) return r;
  redirect("/mi-cuenta?creado=1");
}

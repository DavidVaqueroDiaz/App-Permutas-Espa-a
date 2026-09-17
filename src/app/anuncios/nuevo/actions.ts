"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notificarCadenasNuevas } from "@/lib/cadenas/notificar";
import { atajosValidos, unirPlazas } from "@/lib/cadenas/plazas";
import { leerTodo } from "@/lib/cadenas/universo";
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

/**
 * Quita tildes y baja a minusculas para comparar nombres ignorando
 * acentos. "Coruña" y "coruna" deben matchear igual.
 */
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export async function buscarMunicipios(
  query: string,
  limit = 20,
): Promise<MunicipioBusqueda[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Escape de wildcards de SQL LIKE: `%`, `_` y `\`. Sin esto, un usuario
  // (o atacante) podria mandar "%%%%a" para forzar al planner a un full
  // table scan extremadamente costoso (slow-query DoS). Supabase JS ya
  // parametriza el query, asi que NO hay inyeccion SQL — solo abuso de
  // patron LIKE. PostgreSQL acepta `\` como caracter de escape por
  // defecto en ILIKE.
  const qSafe = q.replace(/[%_\\]/g, "\\$&");

  const supabase = await createClient();

  // Pedimos hasta 80 candidatos por `ilike` y los reordenamos en
  // memoria por relevancia: (1) coincidencia exacta, (2) startsWith,
  // (3) contains. Antes con un simple ilike y orden alfabetico,
  // buscar "Madrid" devolvia "Valmadrid" antes que "Madrid".
  const { data, error } = await supabase
    .from("municipios")
    .select("codigo_ine, nombre, provincia_codigo, provincias!inner(nombre)")
    .ilike("nombre", `%${qSafe}%`)
    .limit(80);

  if (error || !data) return [];

  type Row = {
    codigo_ine: string;
    nombre: string;
    provincia_codigo: string;
    provincias: { nombre: string } | { nombre: string }[];
  };
  const filas = data as unknown as Row[];

  const qNorm = normalizar(q);

  // Score: 0 = exacto, 1 = startsWith, 2 = contains. Menor = mas relevante.
  function score(nombre: string): number {
    const n = normalizar(nombre);
    if (n === qNorm) return 0;
    if (n.startsWith(qNorm)) return 1;
    return 2;
  }

  const ordenados = filas
    .map((r) => ({ row: r, s: score(r.nombre) }))
    .sort((a, b) => {
      if (a.s !== b.s) return a.s - b.s;
      // Dentro del mismo score, alfabetico por nombre.
      return a.row.nombre.localeCompare(b.row.nombre, "es");
    })
    .slice(0, limit);

  return ordenados.map(({ row }) => {
    const prov = Array.isArray(row.provincias) ? row.provincias[0] : row.provincias;
    return {
      codigo_ine: row.codigo_ine,
      nombre: row.nombre,
      provincia_codigo: row.provincia_codigo,
      provincia_nombre: prov?.nombre ?? "",
    };
  });
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
  atajosEntrada: AtajoEntrada[],
): Promise<string[]> {
  const atajos = atajosValidos(atajosEntrada);
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
    const { data, error } = await supabase
      .from("provincias")
      .select("codigo_ine")
      .in("ccaa_codigo", ccaaCodes);
    if (error) throw new Error(`No se pudieron cargar las provincias: ${error.message}`);
    for (const row of data ?? []) {
      provinciaCodes.push(row.codigo_ine as string);
    }
  }

  if (provinciaCodes.length > 0) {
    // Una CCAA grande (Castilla y Leon: 2248 municipios) supera las 1000
    // filas que devuelve la API por consulta: se pagina, con orden fijo
    // para no saltarse filas, y un fallo lanza error en vez de quedarse
    // con la lista a medias.
    const filas = await leerTodo<{ codigo_ine: string }>((desde, hasta) =>
      supabase
        .from("municipios")
        .select("codigo_ine")
        .in("provincia_codigo", Array.from(new Set(provinciaCodes)))
        .order("codigo_ine")
        .range(desde, hasta),
    );
    for (const row of filas) conjunto.add(row.codigo_ine);
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

  // Especialidad: obligatoria si el cuerpo tiene especialidades, y debe
  // ser de ese cuerpo. Sin esto, un anuncio "sin especialidad" en un
  // cuerpo que las tiene nunca coincidiria con nadie.
  const { data: espsCuerpo, error: errEsps } = await supabase
    .from("especialidades")
    .select("id")
    .eq("cuerpo_id", input.cuerpo_id);
  if (errEsps) return { ok: false, mensaje: "No se pudo comprobar la especialidad. Inténtalo de nuevo." };
  const idsEsp = new Set((espsCuerpo ?? []).map((e) => e.id as string));
  if (idsEsp.size > 0 && (!input.especialidad_id || !idsEsp.has(input.especialidad_id))) {
    return { ok: false, mensaje: "Elige la especialidad de tu cuerpo." };
  }
  if (idsEsp.size === 0 && input.especialidad_id) {
    return { ok: false, mensaje: "Ese cuerpo no tiene especialidades." };
  }

  // Un solo anuncio por persona, plaza y especialidad: dos iguales hacen
  // que la misma permuta salga repetida (y se avise dos veces).
  let qRepetido = supabase
    .from("anuncios")
    .select("id")
    .eq("usuario_id", user.id)
    .in("estado", ["activo", "caducado"])
    .eq("cuerpo_id", input.cuerpo_id)
    .eq("municipio_actual_codigo", input.municipio_actual_codigo);
  qRepetido = input.especialidad_id
    ? qRepetido.eq("especialidad_id", input.especialidad_id)
    : qRepetido.is("especialidad_id", null);
  const { data: repetido, error: errRepetido } = await qRepetido.limit(1);
  if (errRepetido) {
    return { ok: false, mensaje: "No se pudo comprobar tus anuncios. Inténtalo de nuevo." };
  }
  if (repetido && repetido.length > 0) {
    return {
      ok: false,
      mensaje:
        "Ya tienes un anuncio para esta plaza y especialidad. Edítalo o renuévalo desde «Mi cuenta» en lugar de publicar otro.",
    };
  }

  // Lista definitiva de municipios: lo elegido mas lo que sale de los
  // atajos (toda una CCAA o provincia), por si la del navegador llega
  // incompleta.
  const atajos = atajosValidos(input.atajos);
  let plazasFinal: string[];
  try {
    plazasFinal = unirPlazas(
      input.plazas_deseadas,
      await expandirAtajos(atajos),
      input.municipio_actual_codigo,
    );
  } catch (e) {
    console.warn("[crearAnuncio] no se pudieron expandir los atajos:", e);
    return {
      ok: false,
      mensaje: "No se pudo preparar la lista de municipios. Inténtalo de nuevo en unos segundos.",
    };
  }
  if (plazasFinal.length === 0) {
    return { ok: false, mensaje: "Tienes que indicar al menos un municipio deseado." };
  }

  // Rate limit: 5 anuncios por usuario por dia. Una persona normal
  // publica 1-2 (uno por cuerpo si es el caso). Mas de 5 al dia sugiere
  // bot o abuso. Va despues de las validaciones para que un intento
  // rechazado no gaste cupo.
  const rl = await aplicarRateLimit({
    clave: `anuncio_nuevo:${user.id}`,
    ventanaSegundos: 86400,
    max: 5,
    mensajeBloqueado:
      "Has publicado demasiados anuncios hoy. Espera 24 horas antes de seguir.",
  });
  if (!rl.permitido) return { ok: false, mensaje: rl.mensaje };

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

  // 2) Plazas deseadas, en una sola transaccion (funcion SQL).
  const { error: errPlazas } = await supabase.rpc("reemplazar_plazas_deseadas", {
    p_anuncio_id: anuncio_id,
    p_codigos: plazasFinal,
  });

  if (errPlazas) {
    // Compensación: borramos el anuncio para no dejar basura.
    await supabase.from("anuncios").delete().eq("id", anuncio_id);
    return { ok: false, mensaje: errPlazas.message };
  }

  // 3) INSERT atajos (no crítico — si falla, el anuncio sigue siendo válido).
  if (atajos.length > 0) {
    await supabase.from("anuncio_atajos").insert(
      atajos.map((a) => ({
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

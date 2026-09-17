/**
 * Lectura del "universo" de anuncios con el que trabaja el motor de
 * cadenas (avisos por email, Mi cuenta, Mis cadenas, buscador y panel).
 *
 * Todo pasa por aqui para no repetir tres trampas que ya hicieron perder
 * cadenas reales sin ningun error visible:
 *   1. La API devuelve como mucho 1000 filas por consulta: se pagina.
 *   2. Paginar sin orden puede saltarse o repetir filas: se ordena.
 *   3. Un filtro `in (...)` con unos 400 identificadores revienta la
 *      longitud de la peticion: se trocea en lotes.
 * Y si una lectura falla se lanza un error, en vez de seguir con datos a
 * medias (que el motor tomaria por "no hay cadenas").
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnuncioMatching } from "@/lib/matching";

export const LOTE_IDS = 100;
export const FILAS_POR_PAGINA = 1000;
const MAX_FILAS = 300_000;

export function trocear<T>(lista: T[], tam: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < lista.length; i += tam) lotes.push(lista.slice(i, i + tam));
  return lotes;
}

type RespuestaPagina = PromiseLike<{
  data: unknown[] | null;
  error: { message: string } | null;
}>;

/**
 * Lee todas las filas de una consulta paginando. La consulta que devuelve
 * `pagina` debe llevar un orden estable. Avanza segun las filas que
 * realmente llegan y solo para con una pagina vacia: si algun dia se
 * baja el maximo de filas de la API por debajo de 1000, no se pierde nada.
 */
export async function leerTodo<T>(
  pagina: (desde: number, hasta: number) => RespuestaPagina,
): Promise<T[]> {
  const todas: T[] = [];
  let desde = 0;
  while (desde < MAX_FILAS) {
    const { data, error } = await pagina(desde, desde + FILAS_POR_PAGINA - 1);
    if (error) throw new Error(error.message);
    const filas = (data ?? []) as T[];
    if (filas.length === 0) return todas;
    todas.push(...filas);
    desde += filas.length;
  }
  throw new Error(`Consulta con mas de ${MAX_FILAS} filas`);
}

/** Como `leerTodo`, pero repartiendo una lista de IDs en lotes. */
export async function leerPorLotes<T>(
  ids: string[],
  pagina: (lote: string[], desde: number, hasta: number) => RespuestaPagina,
): Promise<T[]> {
  const unicos = Array.from(new Set(ids));
  const todas: T[] = [];
  for (const lote of trocear(unicos, LOTE_IDS)) {
    todas.push(...(await leerTodo<T>((desde, hasta) => pagina(lote, desde, hasta))));
  }
  return todas;
}

export async function cargarPlazasPorAnuncio(
  sb: SupabaseClient,
  anuncioIds: string[],
): Promise<Map<string, Set<string>>> {
  const filas = await leerPorLotes<{ anuncio_id: string; municipio_codigo: string }>(
    anuncioIds,
    (lote, desde, hasta) =>
      sb
        .from("anuncio_plazas_deseadas")
        .select("anuncio_id, municipio_codigo")
        .in("anuncio_id", lote)
        .order("anuncio_id")
        .order("municipio_codigo")
        .range(desde, hasta),
  );
  const mapa = new Map<string, Set<string>>();
  for (const f of filas) {
    let s = mapa.get(f.anuncio_id);
    if (!s) {
      s = new Set<string>();
      mapa.set(f.anuncio_id, s);
    }
    s.add(f.municipio_codigo);
  }
  return mapa;
}

export type PerfilPublico = { alias_publico: string; ano_nacimiento: number };

export async function cargarPerfilesPublicos(
  sb: SupabaseClient,
  usuarioIds: string[],
): Promise<Map<string, PerfilPublico>> {
  const filas = await leerPorLotes<{ id: string } & PerfilPublico>(
    usuarioIds,
    (lote, desde, hasta) =>
      sb
        .from("perfiles_publicos")
        .select("id, alias_publico, ano_nacimiento")
        .in("id", lote)
        .order("id")
        .range(desde, hasta),
  );
  return new Map(
    filas.map((p) => [p.id, { alias_publico: p.alias_publico, ano_nacimiento: p.ano_nacimiento }]),
  );
}

export type MunicipioInfo = {
  nombre: string;
  provincia_nombre: string;
  lat: number | null;
  lon: number | null;
};

export async function cargarMunicipios(
  sb: SupabaseClient,
  codigos: string[],
): Promise<Map<string, MunicipioInfo>> {
  type Fila = {
    codigo_ine: string;
    nombre: string;
    latitud: number | null;
    longitud: number | null;
    provincias: { nombre: string } | { nombre: string }[] | null;
  };
  const filas = await leerPorLotes<Fila>(codigos, (lote, desde, hasta) =>
    sb
      .from("municipios")
      .select("codigo_ine, nombre, latitud, longitud, provincias!inner(nombre)")
      .in("codigo_ine", lote)
      .order("codigo_ine")
      .range(desde, hasta),
  );
  const mapa = new Map<string, MunicipioInfo>();
  for (const m of filas) {
    const prov = Array.isArray(m.provincias) ? m.provincias[0] : m.provincias;
    mapa.set(m.codigo_ine, {
      nombre: m.nombre,
      provincia_nombre: prov?.nombre ?? "",
      lat: m.latitud,
      lon: m.longitud,
    });
  }
  return mapa;
}

export type ComboTaxonomia = {
  sector_codigo: string;
  cuerpo_id: string;
  especialidad_id: string | null;
};

export function claveCombo(c: ComboTaxonomia): string {
  return `${c.sector_codigo}|${c.cuerpo_id}|${c.especialidad_id ?? ""}`;
}

export type FilaAnuncio = ComboTaxonomia & {
  id: string;
  usuario_id: string;
  municipio_actual_codigo: string;
  ccaa_codigo: string;
  servicio_salud_codigo: string | null;
  fecha_toma_posesion_definitiva: string;
  anyos_servicio_totales: number;
  permuta_anterior_fecha: string | null;
  observaciones: string | null;
  estado: string;
  creado_el: string;
  actualizado_el: string;
  caduca_el: string;
};

export const COLUMNAS_ANUNCIO =
  "id, usuario_id, sector_codigo, cuerpo_id, especialidad_id, municipio_actual_codigo, ccaa_codigo, servicio_salud_codigo, fecha_toma_posesion_definitiva, anyos_servicio_totales, permuta_anterior_fecha, observaciones, estado, creado_el, actualizado_el, caduca_el";

/**
 * Anuncios que pueden formar cadenas: activos, sin caducar y reales (los
 * de demostracion solo existen para el modo demo del buscador). Con
 * `combo`, solo los de esa categoria profesional.
 */
export async function cargarAnunciosActivos(
  sb: SupabaseClient,
  combo?: ComboTaxonomia,
): Promise<FilaAnuncio[]> {
  const ahora = new Date().toISOString();
  return leerTodo<FilaAnuncio>((desde, hasta) => {
    let q = sb
      .from("anuncios")
      .select(COLUMNAS_ANUNCIO)
      .eq("estado", "activo")
      .eq("es_demo", false)
      .gt("caduca_el", ahora);
    if (combo) {
      q = q.eq("sector_codigo", combo.sector_codigo).eq("cuerpo_id", combo.cuerpo_id);
      q = combo.especialidad_id
        ? q.eq("especialidad_id", combo.especialidad_id)
        : q.is("especialidad_id", null);
    }
    return q.order("id").range(desde, hasta);
  });
}

export type AnuncioDelUniverso = AnuncioMatching & { fila: FilaAnuncio };

/**
 * Completa las filas con sus plazas deseadas y el perfil publico del
 * dueno. Los anuncios de cuentas eliminadas se descartan.
 */
export async function aAnunciosMatching(
  sb: SupabaseClient,
  filas: FilaAnuncio[],
): Promise<AnuncioDelUniverso[]> {
  if (filas.length === 0) return [];
  const [plazas, perfiles] = await Promise.all([
    cargarPlazasPorAnuncio(sb, filas.map((f) => f.id)),
    cargarPerfilesPublicos(sb, filas.map((f) => f.usuario_id)),
  ]);
  const resultado: AnuncioDelUniverso[] = [];
  for (const f of filas) {
    const perfil = perfiles.get(f.usuario_id);
    if (!perfil) continue;
    resultado.push({
      id: f.id,
      usuario_id: f.usuario_id,
      sector_codigo: f.sector_codigo,
      cuerpo_id: f.cuerpo_id,
      especialidad_id: f.especialidad_id,
      municipio_actual_codigo: f.municipio_actual_codigo,
      ccaa_codigo: f.ccaa_codigo,
      servicio_salud_codigo: f.servicio_salud_codigo,
      fecha_toma_posesion_definitiva: f.fecha_toma_posesion_definitiva,
      anyos_servicio_totales: f.anyos_servicio_totales,
      permuta_anterior_fecha: f.permuta_anterior_fecha,
      ano_nacimiento: perfil.ano_nacimiento,
      alias_publico: perfil.alias_publico,
      plazas_deseadas: plazas.get(f.id) ?? new Set<string>(),
      fila: f,
    });
  }
  return resultado;
}

export async function cargarUniversoCombo(
  sb: SupabaseClient,
  combo: ComboTaxonomia,
): Promise<AnuncioDelUniverso[]> {
  return aAnunciosMatching(sb, await cargarAnunciosActivos(sb, combo));
}

/** Texto "597 · Maestros (Educación Física)" de una categoria. */
export async function textoCategoria(
  sb: SupabaseClient,
  combo: Pick<ComboTaxonomia, "cuerpo_id" | "especialidad_id">,
  separador = " · ",
): Promise<{ cuerpo: string; especialidad: string | null }> {
  const [cuerpoRes, espRes] = await Promise.all([
    sb.from("cuerpos").select("codigo_oficial, denominacion").eq("id", combo.cuerpo_id).maybeSingle(),
    combo.especialidad_id
      ? sb
          .from("especialidades")
          .select("codigo_oficial, denominacion")
          .eq("id", combo.especialidad_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  type Tax = { codigo_oficial: string | null; denominacion: string } | null;
  const c = cuerpoRes.data as Tax;
  const e = espRes.data as Tax;
  const fmt = (t: NonNullable<Tax>) =>
    `${t.codigo_oficial ? t.codigo_oficial + separador : ""}${t.denominacion}`;
  return { cuerpo: c ? fmt(c) : "—", especialidad: e ? fmt(e) : null };
}

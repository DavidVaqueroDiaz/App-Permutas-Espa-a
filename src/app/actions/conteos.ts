"use server";

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ConteoPorCcaa = Record<string, number>;

/**
 * Implementacion REAL (sin cache) — se llama desde el wrapper cacheado
 * de mas abajo y desde el cliente del mapa cuando filtra por sector.
 */
async function _obtenerConteosPorCcaaImpl(
  sectorCodigo?: string,
): Promise<ConteoPorCcaa> {
  const supabase = await createClient();

  let query = supabase
    .from("anuncios")
    .select("ccaa_codigo")
    .eq("estado", "activo");

  if (sectorCodigo) {
    query = query.eq("sector_codigo", sectorCodigo);
  }

  const { data, error } = await query;
  if (error || !data) {
    return {};
  }

  const counts: ConteoPorCcaa = {};
  for (const row of data) {
    const codigo = row.ccaa_codigo as string;
    counts[codigo] = (counts[codigo] ?? 0) + 1;
  }
  return counts;
}

// Cacheamos el conteo "todos los sectores" durante 5 minutos. Es el
// valor que se renderiza en la home; los filtros por sector no se
// cachean (se calculan al vuelo cuando el usuario cambia el select).
const _conteosCacheado = unstable_cache(
  () => _obtenerConteosPorCcaaImpl(undefined),
  ["conteos-por-ccaa-global"],
  { revalidate: 300, tags: ["conteos"] },
);

/**
 * Devuelve cuántos anuncios ACTIVOS hay en cada CCAA, opcionalmente
 * filtrados por sector. La clave es el código INE de la CCAA (2 dígitos).
 *
 * Si NO se pasa sector, usa cache de 5 min (es la version que pinta
 * la home en cada request). Si se pasa sector, va directo a Supabase
 * porque es una interaccion del cliente (cambio de filtro).
 */
export async function obtenerConteosPorCcaa(
  sectorCodigo?: string,
): Promise<ConteoPorCcaa> {
  if (sectorCodigo) {
    return _obtenerConteosPorCcaaImpl(sectorCodigo);
  }
  return _conteosCacheado();
}

/**
 * Lista de sectores que tienen al menos un anuncio activo (para llenar
 * el desplegable solo con sectores reales).
 */
export type SectorOpcion = {
  codigo: string;
  nombre: string;
  total: number;
};

async function _obtenerSectoresConAnunciosImpl(): Promise<SectorOpcion[]> {
  const supabase = await createClient();

  const [sectoresRes, anunciosRes] = await Promise.all([
    supabase.from("sectores").select("codigo, nombre"),
    supabase.from("anuncios").select("sector_codigo").eq("estado", "activo"),
  ]);

  const sectores = sectoresRes.data ?? [];
  const anuncios = anunciosRes.data ?? [];

  const totalesPorSector: Record<string, number> = {};
  for (const a of anuncios) {
    const c = a.sector_codigo as string;
    totalesPorSector[c] = (totalesPorSector[c] ?? 0) + 1;
  }

  const opciones: SectorOpcion[] = sectores
    .filter((s) => (totalesPorSector[s.codigo as string] ?? 0) > 0)
    .map((s) => ({
      codigo: s.codigo as string,
      nombre: s.nombre as string,
      total: totalesPorSector[s.codigo as string] ?? 0,
    }))
    .sort((a, b) => b.total - a.total);

  return opciones;
}

const _sectoresCacheado = unstable_cache(
  _obtenerSectoresConAnunciosImpl,
  ["sectores-con-anuncios"],
  { revalidate: 300, tags: ["conteos"] },
);

export async function obtenerSectoresConAnuncios(): Promise<SectorOpcion[]> {
  return _sectoresCacheado();
}

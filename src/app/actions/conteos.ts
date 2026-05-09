"use server";

import { createClient } from "@/lib/supabase/server";
import { modoDemoActivo } from "@/lib/demo";

export type ConteoPorCcaa = Record<string, number>;

/**
 * Devuelve cuántos anuncios ACTIVOS hay en cada CCAA, opcionalmente
 * filtrados por sector. La clave es el código INE de la CCAA (2 dígitos).
 *
 * Si el visitante NO tiene el modo demo activado, los anuncios marcados
 * como `es_demo=true` se excluyen del conteo.
 */
export async function obtenerConteosPorCcaa(
  sectorCodigo?: string,
): Promise<ConteoPorCcaa> {
  const supabase = await createClient();
  const incluirDemos = await modoDemoActivo();

  // Usamos la RPC que agrega en SQL. Antes hacia SELECT + count en JS,
  // pero con el limite por defecto de 1000 filas de PostgREST, en
  // cuanto la app pase de 1000 anuncios los conteos se truncaban
  // silenciosamente. La RPC devuelve solo ~19 filas (una por CCAA).
  const { data, error } = await supabase.rpc("conteos_anuncios_por_ccaa", {
    p_incluir_demos: incluirDemos,
    p_sector_codigo: sectorCodigo ?? null,
  });
  if (error || !data) {
    return {};
  }

  const counts: ConteoPorCcaa = {};
  for (const row of data as { ccaa_codigo: string; total: number }[]) {
    counts[row.ccaa_codigo] = row.total;
  }
  return counts;
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

export async function obtenerSectoresConAnuncios(): Promise<SectorOpcion[]> {
  const supabase = await createClient();
  const incluirDemos = await modoDemoActivo();

  // RPC con agregacion SQL (no sujeta al limite de 1000 filas).
  const [sectoresRes, conteosRes] = await Promise.all([
    supabase.from("sectores").select("codigo, nombre"),
    supabase.rpc("conteos_anuncios_por_sector", { p_incluir_demos: incluirDemos }),
  ]);

  const sectores = sectoresRes.data ?? [];
  const conteos = (conteosRes.data ?? []) as { sector_codigo: string; total: number }[];

  const totalesPorSector: Record<string, number> = {};
  for (const c of conteos) totalesPorSector[c.sector_codigo] = c.total;

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

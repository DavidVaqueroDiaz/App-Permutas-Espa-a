"use server";

import { createClient } from "@/lib/supabase/server";

export type SugerenciaMunicipio = {
  codigo_ine: string;
  nombre: string;
  provincia_nombre: string;
  ccaa_codigo: string;
};

export type SugerenciaCuerpo = {
  id: string;
  codigo_oficial: string | null;
  denominacion: string;
  sector_codigo: string;
};

export type SugerenciaEspecialidad = {
  id: string;
  codigo_oficial: string | null;
  denominacion: string;
  cuerpo_id: string;
};

export type Sugerencias = {
  municipios: SugerenciaMunicipio[];
  cuerpos: SugerenciaCuerpo[];
  especialidades: SugerenciaEspecialidad[];
};

/**
 * Devuelve sugerencias de municipios, cuerpos y especialidades que
 * coinciden con `query` (búsqueda parcial, case insensitive). Sirve
 * para el desplegable inteligente del buscador de /anuncios: el usuario
 * teclea y ve directamente los filtros que puede aplicar.
 */
export async function sugerenciasBusqueda(query: string): Promise<Sugerencias> {
  const q = query.trim();
  if (q.length < 2) {
    return { municipios: [], cuerpos: [], especialidades: [] };
  }

  const supabase = await createClient();
  const ilike = `%${q}%`;

  const [muniRes, cuerpoRes, espRes] = await Promise.all([
    supabase
      .from("municipios")
      .select("codigo_ine, nombre, provincias!inner(nombre, ccaa_codigo)")
      .ilike("nombre", ilike)
      .order("nombre")
      .limit(6),
    supabase
      .from("cuerpos")
      .select("id, codigo_oficial, denominacion, sector_codigo")
      .ilike("denominacion", ilike)
      .order("codigo_oficial")
      .limit(5),
    supabase
      .from("especialidades")
      .select("id, codigo_oficial, denominacion, cuerpo_id")
      .ilike("denominacion", ilike)
      .order("codigo_oficial")
      .limit(5),
  ]);

  type MuniRow = {
    codigo_ine: string;
    nombre: string;
    provincias: { nombre: string; ccaa_codigo: string } | { nombre: string; ccaa_codigo: string }[];
  };
  const municipios: SugerenciaMunicipio[] = ((muniRes.data ?? []) as MuniRow[]).map(
    (m) => {
      const prov = Array.isArray(m.provincias) ? m.provincias[0] : m.provincias;
      return {
        codigo_ine: m.codigo_ine,
        nombre: m.nombre,
        provincia_nombre: prov?.nombre ?? "",
        ccaa_codigo: prov?.ccaa_codigo ?? "",
      };
    },
  );

  return {
    municipios,
    cuerpos: (cuerpoRes.data ?? []) as SugerenciaCuerpo[],
    especialidades: (espRes.data ?? []) as SugerenciaEspecialidad[],
  };
}

/**
 * Búsqueda específica de municipios dentro de una CCAA (cuando el
 * usuario ya ha filtrado por CCAA y quiere afinar a un municipio
 * concreto en esa misma CCAA).
 */
export async function buscarMunicipiosEnCcaa(
  query: string,
  ccaa: string,
): Promise<SugerenciaMunicipio[]> {
  const q = query.trim();
  if (q.length < 1 || !ccaa) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("municipios")
    .select("codigo_ine, nombre, provincias!inner(nombre, ccaa_codigo)")
    .ilike("nombre", `%${q}%`)
    .eq("provincias.ccaa_codigo", ccaa)
    .order("nombre")
    .limit(10);

  type MuniRow = {
    codigo_ine: string;
    nombre: string;
    provincias: { nombre: string; ccaa_codigo: string } | { nombre: string; ccaa_codigo: string }[];
  };
  return ((data ?? []) as MuniRow[]).map((m) => {
    const prov = Array.isArray(m.provincias) ? m.provincias[0] : m.provincias;
    return {
      codigo_ine: m.codigo_ine,
      nombre: m.nombre,
      provincia_nombre: prov?.nombre ?? "",
      ccaa_codigo: prov?.ccaa_codigo ?? "",
    };
  });
}

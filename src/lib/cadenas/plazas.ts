/**
 * Reglas puras para la lista de municipios deseados de un anuncio.
 *
 * La lista que manda el navegador puede llegar incompleta (la pagina de
 * edicion solo cargaba 1000 municipios; una consulta fallida se tomaba
 * por "no hay mas"). Por eso el servidor la une SIEMPRE con lo que
 * resulta de expandir los atajos elegidos (toda una CCAA, toda una
 * provincia, municipios sueltos).
 */

export type AtajoPlaza = {
  tipo: "ccaa" | "provincia" | "municipio_individual";
  valor: string;
};

const FORMATO: Record<AtajoPlaza["tipo"], RegExp> = {
  ccaa: /^\d{2}$/,
  provincia: /^\d{2}$/,
  municipio_individual: /^\d{5}$/,
};

export function esCodigoMunicipio(c: unknown): c is string {
  return typeof c === "string" && /^\d{5}$/.test(c);
}

/** Descarta atajos mal formados (el navegador podria mandar cualquier cosa). */
export function atajosValidos(atajos: unknown): AtajoPlaza[] {
  if (!Array.isArray(atajos)) return [];
  const vistos = new Set<string>();
  const salida: AtajoPlaza[] = [];
  for (const a of atajos) {
    if (!a || typeof a !== "object") continue;
    const { tipo, valor } = a as { tipo?: unknown; valor?: unknown };
    if (tipo !== "ccaa" && tipo !== "provincia" && tipo !== "municipio_individual") continue;
    if (typeof valor !== "string" || !FORMATO[tipo].test(valor)) continue;
    const clave = `${tipo}:${valor}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({ tipo, valor });
  }
  return salida;
}

/**
 * Lista final: lo elegido a mano mas lo que sale de los atajos, sin
 * repetidos, sin codigos raros y sin el municipio actual del anuncio.
 */
export function unirPlazas(
  elegidas: readonly string[],
  deAtajos: readonly string[],
  municipioActual: string,
): string[] {
  const conjunto = new Set<string>();
  for (const c of [...elegidas, ...deAtajos]) {
    if (esCodigoMunicipio(c) && c !== municipioActual) conjunto.add(c);
  }
  return Array.from(conjunto).sort();
}

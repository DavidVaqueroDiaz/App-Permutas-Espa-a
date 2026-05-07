/**
 * Helper para humanizar los aliases de los usuarios importados de
 * PermutaDoc (formato `permutadoc_NNNN`). Esos aliases auto-generados
 * son robóticos y dificultan saber con quien estas hablando en la
 * mensajeria.
 *
 * - Si el alias NO es de PermutaDoc, lo devuelve tal cual.
 * - Si es de PermutaDoc Y tenemos contexto profesional, devuelve algo
 *   util ("Maestro/a en Sobrado" o similar).
 * - Si es de PermutaDoc sin contexto, devuelve "Usuario PermutaDoc #N".
 */

export type ContextoAlias = {
  /** Cuerpo (denominacion sin codigo). Ej: "Maestros" */
  cuerpo?: string | null;
  /** Especialidad (si la hay). Ej: "Música" */
  especialidad?: string | null;
  /** Municipio donde tiene plaza actualmente. */
  municipio?: string | null;
};

/**
 * Detecta si un alias proviene de la importacion de PermutaDoc.
 * Convencion: empieza por `permutadoc_` seguido de digitos.
 */
export function esAliasImportado(alias: string | null | undefined): boolean {
  if (!alias) return false;
  return /^permutadoc_\d+$/i.test(alias);
}

/**
 * Devuelve el alias para mostrar al usuario:
 *   - Si no es importado: el alias original (un humano lo eligio).
 *   - Si es importado y hay contexto: una descripcion profesional
 *     (ej. "Maestros · Sobrado" o "Maestros · Música · Sobrado").
 *   - Si es importado sin contexto: "Usuario PermutaDoc #N".
 */
export function aliasMostrable(
  alias: string | null | undefined,
  contexto?: ContextoAlias,
): string {
  if (!alias) return "—";
  if (!esAliasImportado(alias)) return alias;

  // Es alias importado. Intentamos humanizarlo con el contexto.
  if (contexto) {
    const partes: string[] = [];
    if (contexto.cuerpo) partes.push(contexto.cuerpo);
    if (contexto.especialidad) partes.push(contexto.especialidad);
    if (contexto.municipio) partes.push(`en ${contexto.municipio}`);
    if (partes.length > 0) return partes.join(" · ");
  }

  // Sin contexto: extraer el numero y mostrar versión amistosa.
  const m = alias.match(/^permutadoc_(\d+)$/i);
  const num = m ? m[1] : "?";
  return `Usuario PermutaDoc #${num}`;
}

/**
 * Helpers para el "modo demo".
 *
 * El modo demo permite al visitante ver anuncios sinteticos en la app
 * para hacerse una idea del flujo, antes de que la plataforma este
 * llena de usuarios reales.
 *
 * Estado:
 * - Cookie `permutaes-demo` con valor "1" o "0". Esto permite que las
 *   queries del servidor sepan si tienen que incluir demos o no, sin
 *   tener que pasar el flag por todos los componentes.
 * - localStorage `permutaes-demo` (espejo de la cookie) para que el
 *   client component pueda renderizar el toggle sin parpadeos.
 *
 * Kill-switch global:
 * - `NEXT_PUBLIC_DEMO_DISPONIBLE`: si vale "0", el toggle se oculta y
 *   los demos NO se muestran nunca, ni aunque el usuario tenga la
 *   cookie a "1". Util cuando la plataforma este llena de reales y
 *   queramos retirar los demos sin tocar codigo.
 */
import { cookies } from "next/headers";

export const COOKIE_DEMO = "permutaes-demo";

/**
 * Lee si el modo demo esta DISPONIBLE globalmente. Cuando esta a "0",
 * los demos quedan ocultos para todos los visitantes (kill-switch).
 * Por defecto, disponible.
 */
export function modoDemoDisponible(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_DISPONIBLE !== "0";
}

/**
 * Lee si el visitante actual tiene el modo demo activado, leyendo la
 * cookie. Solo devuelve true si ademas el modo demo esta disponible
 * globalmente (kill-switch).
 */
export async function modoDemoActivo(): Promise<boolean> {
  if (!modoDemoDisponible()) return false;
  const c = await cookies();
  return c.get(COOKIE_DEMO)?.value === "1";
}

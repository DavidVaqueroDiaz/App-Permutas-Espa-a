/**
 * URL base canonica del sitio. Resuelve en este orden:
 *
 *   1. `NEXT_PUBLIC_SITE_URL` -> en Vercel se define manualmente con el
 *      dominio definitivo (`https://permutaes.es`). En produccion deberia
 *      estar SIEMPRE definida.
 *   2. `VERCEL_URL` -> Vercel lo inyecta automatico en cada deploy con
 *      el dominio del deploy (preview branches, etc.). Util en preview
 *      deploys donde la URL cambia.
 *   3. Fallback `https://permutaes.vercel.app` para builds locales y
 *      por si todas las vars fallan.
 *
 * Toda la app debe importar de aqui en lugar de hardcodear la URL,
 * asi cuando se active el dominio definitivo basta con cambiar
 * `NEXT_PUBLIC_SITE_URL` en Vercel y todo se actualiza.
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "https://permutaes.vercel.app";
}

/** Constante derivada de getSiteUrl, util para usar en metadata. */
export const SITE_URL = getSiteUrl();

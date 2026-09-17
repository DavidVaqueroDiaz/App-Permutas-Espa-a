/**
 * Devuelve `valor` si es una ruta interna segura a la que llevar a alguien
 * despues de iniciar sesion ("/mis-cadenas", "/mensajes/abc?x=1"), o null.
 * Bloquea las que sacarian de la web ("//otra.com", "https://...",
 * "/\otra.com", "/.//otra.com") y las que harian un bucle con el login.
 */
export function rutaInterna(valor: unknown): string | null {
  if (typeof valor !== "string" || valor.length === 0 || valor.length > 300) return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return null;
  for (let i = 0; i < valor.length; i++) {
    const c = valor.charCodeAt(i);
    if (c < 32 || c === 127) return null;
  }
  try {
    const base = "https://permutaes.invalid";
    const url = new URL(valor, base);
    if (url.origin !== base) return null;
    const ruta = url.pathname + url.search + url.hash;
    if (!ruta.startsWith("/") || ruta.startsWith("//")) return null;
    if (url.pathname === "/login" || url.pathname === "/logout" || url.pathname.startsWith("/auth/")) {
      return null;
    }
    return ruta;
  } catch {
    return null;
  }
}

/** Fragmento seguro ("#anuncio-123"), o cadena vacia. */
export function fragmentoSeguro(valor: unknown): string {
  return typeof valor === "string" && /^#[A-Za-z0-9_-]{1,100}$/.test(valor) ? valor : "";
}

/**
 * Helper de rate limiting basado en la RPC `chequear_rate_limit` de
 * Supabase (migracion 0018).
 *
 * Uso desde una server action:
 *
 *   const limite = await aplicarRateLimit({
 *     clave: `mensaje:${user.id}`,
 *     ventanaSegundos: 60,
 *     max: 30,
 *   });
 *   if (!limite.permitido) return { ok: false, mensaje: limite.mensaje };
 *
 * La clave la compone el caller para que sea util identificar usuario o
 * IP. Si la RPC falla (problema de red, etc.) devolvemos `permitido =
 * true` para no romper la accion principal por un fallo del rate limit.
 * Es una decision deliberada: preferimos un falso negativo de
 * rate-limit a un falso positivo.
 *
 * La RPC se llama con el cliente de servidor: si cualquiera pudiera
 * llamarla, podria gastar el cupo de otra persona (la clave lleva su id,
 * que es publico) y dejarla sin publicar anuncios durante un dia.
 */
import { createAdminClient } from "@/lib/supabase/admin";

export type ResultadoRateLimit = {
  permitido: boolean;
  contador: number;
  /** Mensaje listo para devolver al usuario cuando NO esta permitido. */
  mensaje: string;
};

export async function aplicarRateLimit(opts: {
  clave: string;
  ventanaSegundos: number;
  max: number;
  /** Mensaje que se devuelve cuando esta bloqueado. Custom por caller. */
  mensajeBloqueado?: string;
}): Promise<ResultadoRateLimit> {
  let data: unknown = null;
  let error: { message: string } | null = null;
  try {
    const r = await createAdminClient()
      .rpc("chequear_rate_limit", {
        clave: opts.clave,
        ventana_segundos: opts.ventanaSegundos,
        max_eventos: opts.max,
      })
      .single();
    data = r.data;
    error = r.error;
  } catch (e) {
    error = { message: e instanceof Error ? e.message : String(e) };
  }

  if (error || !data) {
    console.warn("[rate-limit] RPC fallo, permitiendo accion:", error?.message);
    return { permitido: true, contador: 0, mensaje: "" };
  }

  const row = data as { permitido: boolean; contador: number };
  if (row.permitido) {
    return { permitido: true, contador: row.contador, mensaje: "" };
  }

  return {
    permitido: false,
    contador: row.contador,
    mensaje:
      opts.mensajeBloqueado ??
      `Has hecho demasiadas peticiones. Espera unos minutos antes de volver a intentarlo.`,
  };
}

/**
 * Saca la IP del cliente de las cabeceras de Vercel/Next. Util para
 * limitar acciones de usuarios anonimos (registro). Si no puede,
 * devuelve "unknown" -- mejor que romper.
 */
export function ipDesdeHeaders(headers: Headers): string {
  // Vercel: x-forwarded-for; el primer valor es la IP del cliente real.
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const primera = fwd.split(",")[0]?.trim();
    if (primera) return primera;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

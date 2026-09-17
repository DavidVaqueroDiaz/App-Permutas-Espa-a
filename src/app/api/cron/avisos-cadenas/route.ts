/**
 * Cron diario de seguridad para los avisos de cadenas.
 *
 * Los avisos salen en el momento en que alguien publica, edita o renueva
 * un anuncio. Esta tarea recalcula cada dia TODAS las cadenas y avisa a
 * quien aun no tenga su aviso (correos que fallaron, cadenas que aparecen
 * sin que nadie publique, cualquier fallo puntual). Asi ninguna cadena
 * posible se queda sin avisar mas de un dia.
 *
 * Igual que el cron de recordatorios: exige `Authorization: Bearer
 * <CRON_SECRET>` (Vercel lo manda solo) y sin CRON_SECRET responde 401.
 */
import { NextResponse } from "next/server";
import { revisarAvisosPendientes } from "@/lib/cadenas/notificar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const esperado = process.env.CRON_SECRET;
  if (!esperado) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET no configurado en Vercel." },
      { status: 401 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${esperado}`) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const resultado = await revisarAvisosPendientes();
    if (resultado.fallidos > 0 || resultado.gruposConError > 0 || resultado.sinTerminar) {
      console.warn("[cron-avisos-cadenas] revision incompleta:", resultado);
    }
    return NextResponse.json({ ok: resultado.gruposConError === 0, ...resultado });
  } catch (e) {
    console.error("[cron-avisos-cadenas] error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

/**
 * Cron diario del correo «¿Conseguisteis la permuta?».
 *
 * A las personas de una cadena que se han escrito les pregunta, a los 30
 * dias, si consiguieron la permuta (con un boton para marcarla), y una
 * sola vez mas a los 90 si no han marcado nada. Ver
 * `src/lib/cadenas/seguimiento.ts`.
 *
 * Igual que los demas crons: exige `Authorization: Bearer <CRON_SECRET>`
 * (Vercel lo manda solo) y sin CRON_SECRET responde 401.
 */
import { NextResponse } from "next/server";
import { enviarSeguimientos } from "@/lib/cadenas/seguimiento";

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
    const resultado = await enviarSeguimientos();
    if (resultado.fallidos > 0 || resultado.sinTerminar) {
      console.warn("[cron-seguimiento] revision incompleta:", resultado);
    }
    return NextResponse.json({ ok: resultado.fallidos === 0, ...resultado });
  } catch (e) {
    console.error("[cron-seguimiento] error:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

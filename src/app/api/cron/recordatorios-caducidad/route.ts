/**
 * Cron diario que envia emails de recordatorio a los duenos de
 * anuncios que caducan en menos de 30 dias y no han recibido todavia
 * el aviso.
 *
 * Lo invoca Vercel Cron (configurado en vercel.json) una vez al dia.
 * Para evitar que cualquiera lo dispare desde fuera, requerimos un
 * header `Authorization: Bearer <CRON_SECRET>`. Vercel lo manda
 * automaticamente cuando ejecuta sus crons internos.
 *
 * Si CRON_SECRET no esta configurada, el endpoint devuelve 401 a
 * todo lo que llega (modo seguro por defecto).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarEmail } from "@/lib/email/resend";
import { plantillaRecordatorioCaducidad } from "@/lib/email/plantillas";

export const dynamic = "force-dynamic";

type Candidato = {
  anuncio_id: string;
  usuario_email: string;
  alias_publico: string;
  caduca_el: string;
  cuerpo_texto: string | null;
  municipio: string | null;
};

export async function GET(request: Request) {
  // 1) Auth
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET no configurado en Vercel." },
      { status: 401 },
    );
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json(
      { ok: false, error: "No autorizado." },
      { status: 401 },
    );
  }

  // 2) Candidatos
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "candidatos_recordatorio_caducidad",
  );
  if (error) {
    console.error("[cron-caducidad] RPC fallo:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const candidatos = (data ?? []) as Candidato[];

  // 3) Por cada candidato, enviar email y marcar como enviado.
  const resultados = {
    procesados: 0,
    enviados: 0,
    fallos: 0,
  };
  for (const c of candidatos) {
    resultados.procesados++;
    const diasRestantes = Math.max(
      1,
      Math.ceil(
        (new Date(c.caduca_el).getTime() - Date.now()) / (24 * 3600 * 1000),
      ),
    );
    const plantilla = plantillaRecordatorioCaducidad({
      alias: c.alias_publico,
      cuerpoTexto: c.cuerpo_texto ?? "—",
      municipio: c.municipio ?? "—",
      diasRestantes,
      anuncioId: c.anuncio_id,
    });
    const r = await enviarEmail({
      to: c.usuario_email,
      subject: plantilla.subject,
      html: plantilla.html,
      text: plantilla.text,
    });
    if (r.ok) {
      resultados.enviados++;
      // Marcar como enviado SOLO si el envio fue OK. Si Resend fallo,
      // dejamos el registro vacio y el siguiente cron lo reintenta.
      const { error: errMark } = await supabase.rpc(
        "marcar_recordatorio_enviado",
        { p_anuncio_id: c.anuncio_id },
      );
      if (errMark) {
        console.warn(
          "[cron-caducidad] Email enviado pero falló marcar:",
          c.anuncio_id,
          errMark,
        );
      }
    } else {
      resultados.fallos++;
      console.warn("[cron-caducidad] Email fallo:", c.anuncio_id);
    }
  }

  return NextResponse.json({ ok: true, ...resultados });
}

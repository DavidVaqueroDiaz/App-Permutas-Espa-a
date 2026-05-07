/**
 * Helper para enviar el email de bienvenida la primera vez que un
 * usuario confirma su cuenta y entra en la app.
 *
 * Se invoca desde el callback de auth (`/auth/callback/route.ts`)
 * tras `exchangeCodeForSession` con exito. Best-effort: si algo falla
 * (Resend caido, perfil no encontrado, etc.) lo logueamos y seguimos
 * — el usuario no tiene por que esperar a que el email se mande.
 *
 * Deduplicacion: el campo `perfiles_usuario.bienvenida_enviada_el`
 * (migracion 0023) se rellena tras envio exitoso. Si esta no-null, no
 * volvemos a enviar.
 */
import { createClient } from "@/lib/supabase/server";
import { enviarEmail } from "./resend";
import { plantillaEmailBienvenida } from "./plantillas";

export async function enviarEmailBienvenidaSiProcede(
  userId: string,
): Promise<void> {
  try {
    const supabase = await createClient();

    // 1) Cargar perfil + email del usuario.
    //    Usamos auth.getUser para garantizar que estamos en la sesion del
    //    propio usuario (RLS dejara leer su perfil).
    const { data: perfilRow } = await supabase
      .from("perfiles_usuario")
      .select("alias_publico, bienvenida_enviada_el")
      .eq("id", userId)
      .maybeSingle();
    if (!perfilRow) return; // sin perfil, nada que hacer

    const perfil = perfilRow as {
      alias_publico: string;
      bienvenida_enviada_el: string | null;
    };

    // 2) Dedupe: si ya se envio antes, no repetir.
    if (perfil.bienvenida_enviada_el) return;

    // 3) Email del usuario (de auth.users via la sesion actual).
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId || !user.email) return;
    if (!user.email_confirmed_at) return; // solo si confirmo

    // 4) Excluir cuentas test sinteticas (PermutaDoc).
    if (user.email.endsWith("@permutaes.test")) return;

    // 5) Enviar.
    const plantilla = plantillaEmailBienvenida({
      alias: perfil.alias_publico,
    });
    const r = await enviarEmail({
      to: user.email,
      subject: plantilla.subject,
      html: plantilla.html,
      text: plantilla.text,
    });
    if (!r.ok) return;

    // 6) Marcar como enviado.
    await supabase
      .from("perfiles_usuario")
      .update({ bienvenida_enviada_el: new Date().toISOString() })
      .eq("id", userId);
  } catch (e) {
    console.warn("[bienvenida] error best-effort:", e);
  }
}

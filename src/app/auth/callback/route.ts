import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarEmailBienvenidaSiProcede } from "@/lib/email/bienvenida";

/**
 * Callback de Supabase Auth.
 *
 * Esta ruta recibe los códigos de confirmación que vienen en los emails
 * de:
 *   - confirmación de cuenta tras signUp
 *   - recuperación de contraseña
 *   - cambio de email
 *
 * Intercambia el código por una sesión real, dispara (best-effort) el
 * email de bienvenida si es la primera vez del usuario, y redirige al
 * destino indicado por el parámetro `next` (por defecto `/mi-cuenta`).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/mi-cuenta";
  const errorDescription = url.searchParams.get("error_description");

  if (errorDescription) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  // Best-effort: si es la primera vez que entra (email recien confirmado),
  // disparamos el email de bienvenida nuestro. La funcion deduplica via
  // `perfiles_usuario.bienvenida_enviada_el`, asi que aunque se llame en
  // logins posteriores no se repite.
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await enviarEmailBienvenidaSiProcede(user.id);
  }

  return NextResponse.redirect(new URL(next, request.url));
}

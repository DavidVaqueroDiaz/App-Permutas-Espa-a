import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback de Supabase Auth.
 *
 * Esta ruta recibe los códigos de confirmación que vienen en los emails
 * de:
 *   - confirmación de cuenta tras signUp
 *   - recuperación de contraseña
 *   - cambio de email
 *
 * Intercambia el código por una sesión real y redirige al usuario al
 * destino indicado por el parámetro `next` (o, por defecto, a /mi-cuenta).
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

  return NextResponse.redirect(new URL(next, request.url));
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Cierre de sesión. Soporta tanto POST (desde el form del Header)
 * como GET (cuando el usuario teclea /logout directo en el navegador
 * o pulsa un enlace plano). Ambos hacen lo mismo: cerrar sesión y
 * redirigir a la home.
 */
async function cerrarSesion(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

export const POST = cerrarSesion;
export const GET = cerrarSesion;

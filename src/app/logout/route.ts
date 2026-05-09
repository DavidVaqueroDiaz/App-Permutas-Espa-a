import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Cierre de sesión. Soporta tanto POST (desde el form del Header)
 * como GET (cuando el usuario teclea /logout directo o pulsa un
 * enlace plano). Ambos hacen lo mismo: cerrar sesión y redirigir a
 * la home.
 *
 * IMPORTANTE: usamos un cliente Supabase aparte (no el helper
 * `createClient` general) porque necesitamos copiar las cookies de
 * borrado a la respuesta de redirect que devolvemos. Con el helper
 * normal, el cookieStore borraba las cookies dentro del scope del
 * request pero NO viajaban en la `NextResponse.redirect`, dejando al
 * usuario "deslogueado en server" pero con las cookies de auth
 * todavia en el navegador. La siguiente request restauraba la sesion
 * via refresh-token.
 */
async function cerrarSesion(request: Request) {
  // Construimos la respuesta de redirect ANTES de signOut para que el
  // cliente Supabase pueda escribir los `Set-Cookie` directamente sobre
  // ella.
  const response = NextResponse.redirect(new URL("/", request.url), {
    status: 303,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Leemos las cookies actuales del request entrante.
          return (
            request.headers
              .get("cookie")
              ?.split(";")
              .map((c) => c.trim())
              .filter(Boolean)
              .map((c) => {
                const idx = c.indexOf("=");
                return {
                  name: idx === -1 ? c : c.slice(0, idx),
                  value: idx === -1 ? "" : decodeURIComponent(c.slice(idx + 1)),
                };
              }) ?? []
          );
        },
        setAll(cookiesToSet) {
          // Escribimos las cookies (las de borrado tras signOut)
          // directamente sobre la respuesta de redirect — asi el
          // navegador las recibe y limpia su almacen.
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.signOut();

  return response;
}

export const POST = cerrarSesion;
export const GET = cerrarSesion;

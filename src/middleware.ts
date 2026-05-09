import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware global de Next.js que se ejecuta en cada request.
 *
 * Su única misión es refrescar la sesión de Supabase si está caducada,
 * para que el usuario no se desloguee inesperadamente.
 *
 * No debe contener lógica de redirección de auth — eso vivirá en cada
 * página o layout según el flujo concreto.
 *
 * Optimización: si la request no trae ninguna cookie de Supabase
 * auth, el usuario es anónimo y no hay sesión que refrescar — saltamos
 * la llamada a `getUser()` (que hace round-trip a Supabase) y dejamos
 * pasar la request directamente. Esto ahorra ~50-200 ms en CADA pageview
 * de visitantes no logueados (la inmensa mayoría del tráfico SEO).
 */
export async function middleware(request: NextRequest) {
  // Cookies de auth de Supabase tienen prefijos `sb-` o el legacy
  // `supabase-auth-token`. Si no hay ninguna, no perdemos tiempo.
  const tieneCookieAuth = request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.startsWith("sb-") || c.name === "supabase-auth-token",
    );

  if (!tieneCookieAuth) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: NO eliminar getUser(). Esta llamada es la que dispara
  // el refresco automático de la cookie de sesión.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Excluir del middleware:
     *   _next/static, _next/image: archivos optimizados servidos por Next.
     *   favicon.ico, robots.txt, sitemap.xml, llms.txt: archivos especiales.
     *   *.svg, *.png, *.jpg, *.jpeg, *.gif, *.webp: imágenes estáticas.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

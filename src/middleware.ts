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
 */
export async function middleware(request: NextRequest) {
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

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para uso en Server Components,
 * Server Actions y Route Handlers.
 *
 * Lee y escribe cookies a través de la API de Next.js para
 * mantener la sesión del usuario.
 *
 * Para uso en componentes de navegador (componentes "use client"),
 * usa el cliente de `./client.ts` en su lugar.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // El método setAll fue llamado desde un Server Component.
            // Se puede ignorar si tienes un middleware que refresca
            // las sesiones de usuario (lo tenemos: src/middleware.ts).
          }
        },
      },
    },
  );
}

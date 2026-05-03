import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para uso en componentes de navegador
 * (componentes marcados con "use client").
 *
 * Para uso en Server Components, Server Actions o Route Handlers,
 * usa el cliente de `./server.ts` en su lugar.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

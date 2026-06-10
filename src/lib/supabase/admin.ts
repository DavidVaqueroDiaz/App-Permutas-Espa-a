import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con la SECRET KEY (equivale a service_role): SALTA
 * RLS y tiene permisos completos.
 *
 * SOLO para uso en servidor en operaciones internas que lo requieren
 * legitimamente y que NO actuan en nombre de un usuario concreto:
 *   - el cron de recordatorios de caducidad (lee emails de usuarios),
 *   - el generador de demos sinteticos.
 *
 * NUNCA importar desde un componente cliente, ni usarlo con datos de un
 * usuario sin filtrar a mano: salta toda la seguridad RLS. La key vive
 * en SUPABASE_SECRET_KEY (variable de servidor, SIN prefijo
 * NEXT_PUBLIC), por lo que Next.js no la incluye en el bundle del
 * navegador: aunque por error se importara desde cliente, la key seria
 * undefined alli y nunca se filtraria.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY para el cliente admin.",
    );
  }
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

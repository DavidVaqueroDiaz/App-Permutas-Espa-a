import { createClient } from "@/lib/supabase/server";
import { MensajesRealtime } from "./MensajesRealtime";
import { HeaderClient, type HeaderUser } from "./HeaderClient";

/**
 * Cabecera global de la aplicación.
 *
 * Server Component: lee el usuario actual desde Supabase Auth y los
 * conteos (no leídos, admin) en una sola pasada de servidor, y los
 * delega a `HeaderClient` para que gestione el estado de UI (menú
 * hamburguesa en móvil).
 */
export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let datosUser: HeaderUser = null;
  if (user) {
    const [noLeidosRes, adminRes] = await Promise.all([
      supabase.rpc("contar_conversaciones_con_no_leidos"),
      supabase.rpc("es_admin_actual"),
    ]);
    datosUser = {
      emailConfirmed: !!user.email_confirmed_at,
      noLeidos: (noLeidosRes.data as number) ?? 0,
      esAdmin: adminRes.data === true,
    };
  }

  return (
    <>
      {/* Listener Realtime global: refresca el badge cuando llega un
          mensaje, estés donde estés. Solo se monta si hay sesión. */}
      {user && <MensajesRealtime />}
      <HeaderClient user={datosUser} />
    </>
  );
}

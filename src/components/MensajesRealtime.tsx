"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Componente invisible (return null) que vive en el Header global.
 * Se suscribe a INSERTs en la tabla `mensajes` (Realtime) y, cuando
 * llega uno, llama a `router.refresh()`.
 *
 * Eso hace que se actualicen sin recargar la página:
 *  - El badge de mensajes no leídos del Header.
 *  - La bandeja `/mensajes` (si el usuario está allí), gracias a que
 *    su lista se calcula en un Server Component y `router.refresh`
 *    re-ejecuta la cadena de Server Components.
 *  - Cualquier otra parte del árbol que dependa del estado de
 *    mensajes en el servidor.
 *
 * RLS garantiza que solo recibimos eventos de mensajes que podemos
 * leer (los de nuestras conversaciones), así que no filtramos en el
 * cliente.
 */
export function MensajesRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel("global-mensajes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes" },
        () => {
          // Pequeño delay para que los triggers (ultimo_mensaje_el,
          // notificaciones) terminen antes del refetch.
          setTimeout(() => router.refresh(), 200);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [router]);

  return null;
}

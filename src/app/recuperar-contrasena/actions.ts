"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { aplicarRateLimit, ipDesdeHeaders } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";

export type RecuperarState = {
  ok: boolean;
  message: string;
} | null;

export async function solicitarRecuperacion(
  _prev: RecuperarState,
  formData: FormData,
): Promise<RecuperarState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { ok: false, message: "Introduce un email válido." };
  }

  // Rate-limit por IP para evitar el bombardeo de emails de recuperacion
  // a una victima conocida (email bombing) y el abuso de cuota. 5/hora
  // basta para un usuario legitimo que se equivoca varias veces.
  const ip = ipDesdeHeaders(await headers());
  const rl = await aplicarRateLimit({
    clave: `recuperar:${ip}`,
    ventanaSegundos: 3600,
    max: 5,
    mensajeBloqueado:
      "Has solicitado recuperar la contraseña demasiadas veces. Espera una hora antes de volver a intentarlo.",
  });
  if (!rl.permitido) {
    return { ok: false, message: rl.mensaje };
  }

  const supabase = await createClient();

  // El flujo es: Supabase manda email con un link a /auth/callback?code=...
  // El callback intercambia el code por una sesión y redirige al `next`,
  // que aquí es /restablecer-contrasena.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/restablecer-contrasena`,
  });

  // Mensaje genérico (no confirmamos si el email existe o no, por seguridad).
  if (error) {
    console.error("[recuperar] error:", error.message);
  }

  return {
    ok: true,
    message:
      "Si ese email pertenece a una cuenta registrada, te hemos enviado un enlace para crear una nueva contraseña. Revisa tu bandeja de entrada y la carpeta de spam.",
  };
}

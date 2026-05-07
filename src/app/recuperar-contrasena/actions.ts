"use server";

import { createClient } from "@/lib/supabase/server";
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

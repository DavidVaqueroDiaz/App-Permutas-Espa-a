"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RestablecerState = {
  ok: boolean;
  message: string;
} | null;

export async function restablecerContrasena(
  _prev: RestablecerState,
  formData: FormData,
): Promise<RestablecerState> {
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");

  if (password.length < 8) {
    return { ok: false, message: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== password2) {
    return { ok: false, message: "Las dos contraseñas no coinciden." };
  }

  const supabase = await createClient();

  // Para llegar a esta página, el usuario ya tiene una sesión activa
  // generada por /auth/callback al intercambiar el code del email.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      message: "El enlace ha caducado o no es válido. Vuelve a solicitar un nuevo email de recuperación.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect("/mi-cuenta");
}

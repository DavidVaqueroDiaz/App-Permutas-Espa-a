"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  ok: boolean;
  message: string;
} | null;

export async function iniciarSesion(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, message: "Email y contraseña son obligatorios." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensaje genérico por seguridad, no distinguimos email vs contraseña.
    return { ok: false, message: "Email o contraseña incorrectos." };
  }

  redirect("/mi-cuenta");
}

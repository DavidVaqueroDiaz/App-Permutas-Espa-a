"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;
const AÑO_ACTUAL = new Date().getFullYear();
const AÑO_MIN = 1940;
const AÑO_MAX = AÑO_ACTUAL - 18;

export type ActionState = {
  ok: boolean;
  message: string;
} | null;

export async function actualizarPerfil(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const alias = String(formData.get("alias_publico") ?? "").trim();
  const anoStr = String(formData.get("ano_nacimiento") ?? "").trim();

  if (!ALIAS_REGEX.test(alias)) {
    return {
      ok: false,
      message: "El alias debe tener entre 3 y 20 caracteres (letras, números, guiones).",
    };
  }
  const ano = Number.parseInt(anoStr, 10);
  if (Number.isNaN(ano) || ano < AÑO_MIN || ano > AÑO_MAX) {
    return {
      ok: false,
      message: `El año de nacimiento debe estar entre ${AÑO_MIN} y ${AÑO_MAX}.`,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "No tienes sesión activa. Vuelve a iniciar sesión." };
  }

  const { error } = await supabase
    .from("perfiles_usuario")
    .update({ alias_publico: alias, ano_nacimiento: ano })
    .eq("id", user.id);

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { ok: false, message: "Ese alias ya está cogido. Prueba otro." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/mi-cuenta");
  return { ok: true, message: "Perfil actualizado." };
}

export async function cambiarContrasena(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");

  if (password.length < 8) {
    return { ok: false, message: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== password2) {
    return { ok: false, message: "Las dos contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "Contraseña actualizada." };
}

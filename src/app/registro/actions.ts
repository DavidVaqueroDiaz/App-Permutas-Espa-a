"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { aplicarRateLimit, ipDesdeHeaders } from "@/lib/rate-limit";

export type RegistroState = {
  ok: boolean;
  message: string;
} | null;

const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;
const AÑO_ACTUAL = new Date().getFullYear();
const AÑO_MIN = 1940;
const AÑO_MAX = AÑO_ACTUAL - 18;

export async function registrarUsuario(
  _prev: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  const alias = String(formData.get("alias_publico") ?? "").trim();
  const anoStr = String(formData.get("ano_nacimiento") ?? "").trim();
  const aceptaPrivacidad = formData.get("acepta_privacidad") === "on";
  const aceptaCondiciones = formData.get("acepta_condiciones") === "on";

  if (!email || !password || !alias || !anoStr) {
    return { ok: false, message: "Faltan campos obligatorios." };
  }
  if (!email.includes("@")) {
    return { ok: false, message: "El email no tiene formato válido." };
  }
  if (password.length < 8) {
    return { ok: false, message: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== password2) {
    return { ok: false, message: "Las dos contraseñas no coinciden." };
  }
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
  if (!aceptaPrivacidad || !aceptaCondiciones) {
    return {
      ok: false,
      message: "Debes aceptar la política de privacidad y las condiciones de uso.",
    };
  }

  // Rate limit por IP: 5 registros nuevos por hora desde la misma IP.
  // Una persona razonable crea 1 cuenta. Una pareja o familia 2-3.
  // Mas de 5/h en una IP huele a abuso.
  const ip = ipDesdeHeaders(await headers());
  const rl = await aplicarRateLimit({
    clave: `registro:${ip}`,
    ventanaSegundos: 3600,
    max: 5,
    mensajeBloqueado:
      "Demasiados registros desde tu conexión en la última hora. Inténtalo más tarde.",
  });
  if (!rl.permitido) return { ok: false, message: rl.mensaje };

  const supabase = await createClient();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://permutaes.vercel.app";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/mi-cuenta?bienvenido=1")}`,
      data: {
        alias_publico: alias,
        ano_nacimiento: ano,
        politica_privacidad_version: "v1",
      },
    },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      return {
        ok: false,
        message: "Ya existe una cuenta con ese email. ¿Has olvidado la contraseña?",
      };
    }
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message:
      "Cuenta creada. Te hemos enviado un email para confirmar la dirección. Revisa tu bandeja (y la carpeta de spam, por si acaso).",
  };
}

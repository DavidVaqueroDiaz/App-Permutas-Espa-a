"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { aplicarRateLimit, ipDesdeHeaders } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/site-url";

/**
 * Estado del formulario de registro tras una accion.
 *
 * Cuando hay error, ademas del mensaje devolvemos los valores que el
 * usuario habia escrito (excepto las contrasenas, que NO se devuelven
 * por seguridad — se vacian siempre tras submit). Asi el RegistroForm
 * puede ponerlos en defaultValue y NO se pierde lo escrito.
 */
export type RegistroState =
  | { ok: true; message: string }
  | {
      ok: false;
      message: string;
      campoConError?: "email" | "password" | "password2" | "alias_publico" | "ano_nacimiento" | "checkboxes";
      valoresEnviados?: {
        email: string;
        alias_publico: string;
        ano_nacimiento: string;
      };
    }
  | null;

const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;
const AÑO_ACTUAL = new Date().getFullYear();
const AÑO_MIN = 1940;
const AÑO_MAX = AÑO_ACTUAL - 18;

/**
 * Mapea los mensajes de error tipicos de Supabase Auth (en ingles) a
 * mensajes claros en espanol. Cualquier mensaje que no reconozcamos
 * cae al default ("Error al crear la cuenta. Intentalo de nuevo.").
 */
function traducirErrorSupabase(mensajeIngles: string): string {
  const m = mensajeIngles.toLowerCase();
  if (m.includes("already registered") || m.includes("user already")) {
    return "Ya existe una cuenta con ese email. Si la has olvidado, recupera la contraseña en /recuperar-contrasena.";
  }
  if (m.includes("invalid") && m.includes("email")) {
    return "El email no tiene un formato válido.";
  }
  if (m.includes("password") && (m.includes("short") || m.includes("least") || m.includes("characters"))) {
    return "La contraseña no cumple los requisitos. Mínimo 8 caracteres.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Has hecho demasiados intentos. Espera unos minutos antes de volver a intentarlo.";
  }
  if (m.includes("signup") && m.includes("disabled")) {
    return "El registro está temporalmente cerrado. Intentalo de nuevo más tarde.";
  }
  // Fallback: mensaje amigable sin exponer la cadena tecnica original.
  return "No hemos podido crear la cuenta. Intentalo de nuevo en unos minutos.";
}

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

  // Estos valores los devolvemos siempre que haya error (NUNCA password).
  const valoresEnviados = {
    email,
    alias_publico: alias,
    ano_nacimiento: anoStr,
  };

  if (!email || !password || !alias || !anoStr) {
    return {
      ok: false,
      message: "Faltan campos obligatorios.",
      valoresEnviados,
    };
  }
  if (!email.includes("@")) {
    return {
      ok: false,
      message: "El email no tiene formato válido.",
      campoConError: "email",
      valoresEnviados,
    };
  }
  if (password.length < 8) {
    return {
      ok: false,
      message: "La contraseña debe tener al menos 8 caracteres.",
      campoConError: "password",
      valoresEnviados,
    };
  }
  if (password !== password2) {
    return {
      ok: false,
      message: "Las dos contraseñas no coinciden.",
      campoConError: "password2",
      valoresEnviados,
    };
  }
  if (!ALIAS_REGEX.test(alias)) {
    return {
      ok: false,
      message: "El alias debe tener entre 3 y 20 caracteres (letras, números, guiones o guion bajo).",
      campoConError: "alias_publico",
      valoresEnviados,
    };
  }
  const ano = Number.parseInt(anoStr, 10);
  if (Number.isNaN(ano) || ano < AÑO_MIN || ano > AÑO_MAX) {
    return {
      ok: false,
      message: `El año de nacimiento debe estar entre ${AÑO_MIN} y ${AÑO_MAX}.`,
      campoConError: "ano_nacimiento",
      valoresEnviados,
    };
  }
  if (!aceptaPrivacidad || !aceptaCondiciones) {
    return {
      ok: false,
      message: "Tienes que aceptar la política de privacidad y las condiciones de uso para continuar.",
      campoConError: "checkboxes",
      valoresEnviados,
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
  if (!rl.permitido) {
    return { ok: false, message: rl.mensaje, valoresEnviados };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent("/mi-cuenta?bienvenido=1")}`,
      data: {
        alias_publico: alias,
        ano_nacimiento: ano,
        politica_privacidad_version: "v1",
      },
    },
  });

  if (error) {
    return {
      ok: false,
      message: traducirErrorSupabase(error.message),
      valoresEnviados,
    };
  }

  return {
    ok: true,
    message:
      "Cuenta creada. Te hemos enviado un email para confirmar la dirección. Revisa tu bandeja (y la carpeta de spam, por si acaso).",
  };
}

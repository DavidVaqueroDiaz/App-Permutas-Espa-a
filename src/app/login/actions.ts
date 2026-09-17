"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { aplicarRateLimit, ipDesdeHeaders } from "@/lib/rate-limit";
import { fragmentoSeguro, rutaInterna } from "@/lib/rutas";

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

  // Rate-limit por (IP + email) para evitar bruteforce de contrasenas.
  // 8 intentos cada 10 minutos. Usuario legitimo que se equivoca varias
  // veces no llega aqui; atacante que prueba contrasenas si.
  // Misma estrategia que `registro/actions.ts`: si el rate-limit RPC
  // falla, deja pasar (preferimos falso negativo a falso positivo).
  const ip = ipDesdeHeaders(await headers());
  const rl = await aplicarRateLimit({
    clave: `login:${ip}:${email}`,
    ventanaSegundos: 600,
    max: 8,
    mensajeBloqueado:
      "Demasiados intentos de inicio de sesion. Espera 10 minutos antes de volver a intentarlo.",
  });
  if (!rl.permitido) {
    return { ok: false, message: rl.mensaje };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensaje genérico por seguridad, no distinguimos email vs contraseña.
    return { ok: false, message: "Email o contraseña incorrectos." };
  }

  // Vuelve a la pagina que pidio iniciar sesion (solo rutas de la web).
  const destino = rutaInterna(formData.get("redirect")) ?? "/mi-cuenta";
  redirect(destino.includes("#") ? destino : destino + fragmentoSeguro(formData.get("fragmento")));
}

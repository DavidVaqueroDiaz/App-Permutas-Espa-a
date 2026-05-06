import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RestablecerForm } from "./RestablecerForm";

export const metadata: Metadata = {
  title: "Crear nueva contraseña",
  description: "Crea una nueva contraseña para tu cuenta de PermutaES.",
  robots: { index: false, follow: false },
};

export default async function RestablecerPage() {
  // Esta pantalla solo se llega tras pinchar el enlace del email de
  // recuperación. /auth/callback ya intercambió el code por una sesión
  // activa antes de redirigir aquí. Si alguien entra directamente sin
  // sesión, lo mandamos a "Recuperar contraseña" para reiniciar el flujo.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/recuperar-contrasena");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Nueva contraseña
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Crea una nueva contraseña para acceder a tu cuenta.
      </p>

      <div className="mt-8">
        <RestablecerForm />
      </div>
    </main>
  );
}

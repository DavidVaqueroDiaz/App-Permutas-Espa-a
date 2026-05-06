import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Inicia sesión en PermutaES para gestionar tus anuncios y mensajes.",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect("/mi-cuenta");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Iniciar sesión
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Bienvenido de vuelta.
      </p>

      <div className="mt-8">
        <LoginForm />
      </div>
    </main>
  );
}

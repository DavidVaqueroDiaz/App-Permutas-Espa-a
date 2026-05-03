import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegistroForm } from "./RegistroForm";

export const metadata: Metadata = {
  title: "Crear cuenta",
  description:
    "Regístrate gratis en PermutaES y publica tu anuncio para encontrar cadenas de permuta de plaza compatibles.",
};

export default async function RegistroPage() {
  // Si ya está logueado, no tiene sentido ver registro.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect("/mi-cuenta");
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Crear cuenta
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Es gratis. Solo te pedimos los datos imprescindibles para que puedas publicar tu anuncio y nada más.
      </p>

      <div className="mt-8">
        <RegistroForm />
      </div>
    </main>
  );
}

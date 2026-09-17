import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { rutaInterna } from "@/lib/rutas";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Inicia sesión en PermutaES para gestionar tus anuncios y mensajes.",
};

type SearchParams = Promise<{
  redirect?: string | string[];
  error?: string | string[];
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const destino = rutaInterna(Array.isArray(params.redirect) ? params.redirect[0] : params.redirect);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    redirect(destino ?? "/mi-cuenta");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Iniciar sesión
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Bienvenido de vuelta.
      </p>

      {params.error && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No se ha podido completar el acceso con ese enlace; puede que haya
          caducado. Inicia sesión o pide un enlace nuevo.
        </div>
      )}

      <div className="mt-8">
        <LoginForm destino={destino} />
      </div>
    </main>
  );
}

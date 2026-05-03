import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};

type Perfil = {
  alias_publico: string;
  ano_nacimiento: number;
  creado_el: string;
};

export default async function MiCuentaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("perfiles_usuario")
    .select("alias_publico, ano_nacimiento, creado_el")
    .eq("id", user.id)
    .maybeSingle<Perfil>();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Mi cuenta
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Estos son los datos básicos de tu cuenta. Más adelante podrás editarlos y gestionar tus anuncios desde aquí.
      </p>

      <dl className="mt-8 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white text-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex justify-between px-4 py-3">
          <dt className="font-medium text-slate-700 dark:text-slate-300">Email</dt>
          <dd className="text-slate-900 dark:text-slate-100">{user.email}</dd>
        </div>
        <div className="flex justify-between px-4 py-3">
          <dt className="font-medium text-slate-700 dark:text-slate-300">Email verificado</dt>
          <dd className="text-slate-900 dark:text-slate-100">
            {user.email_confirmed_at ? "Sí" : "Pendiente"}
          </dd>
        </div>
        {perfil && (
          <>
            <div className="flex justify-between px-4 py-3">
              <dt className="font-medium text-slate-700 dark:text-slate-300">Alias público</dt>
              <dd className="text-slate-900 dark:text-slate-100">{perfil.alias_publico}</dd>
            </div>
            <div className="flex justify-between px-4 py-3">
              <dt className="font-medium text-slate-700 dark:text-slate-300">Año de nacimiento</dt>
              <dd className="text-slate-900 dark:text-slate-100">{perfil.ano_nacimiento}</dd>
            </div>
            <div className="flex justify-between px-4 py-3">
              <dt className="font-medium text-slate-700 dark:text-slate-300">Cuenta creada</dt>
              <dd className="text-slate-900 dark:text-slate-100">
                {new Date(perfil.creado_el).toLocaleDateString("es-ES")}
              </dd>
            </div>
          </>
        )}
      </dl>

      {!user.email_confirmed_at && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
          <p className="font-medium">Confirma tu email</p>
          <p className="mt-1">
            Te hemos enviado un enlace de confirmación. Hasta que pinches en él, no podrás publicar anuncios ni
            recibir mensajes.
          </p>
        </div>
      )}

      <p className="mt-8 text-xs text-slate-500 dark:text-slate-400">
        El resto de funciones (editar alias, cambiar contraseña, gestionar anuncios, ver mensajes) llegarán en próximas fases del desarrollo.
      </p>
    </main>
  );
}

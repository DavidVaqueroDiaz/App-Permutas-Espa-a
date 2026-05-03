import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditarPerfilForm } from "./EditarPerfilForm";
import { CambiarContrasenaForm } from "./CambiarContrasenaForm";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};

type Perfil = {
  alias_publico: string;
  ano_nacimiento: number;
  creado_el: string;
};

type AnuncioListado = {
  id: string;
  estado: string;
  creado_el: string;
  caduca_el: string;
  observaciones: string | null;
  cuerpo: { codigo_oficial: string | null; denominacion: string } | null;
  especialidad: { codigo_oficial: string | null; denominacion: string } | null;
  municipio: { nombre: string } | null;
  total_plazas: number;
};

type SearchParams = Promise<{
  creado?: string;
  actualizado?: string;
  eliminado?: string;
}>;

export default async function MiCuentaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { creado, actualizado, eliminado } = await searchParams;

  const [perfilRes, anunciosRes] = await Promise.all([
    supabase
      .from("perfiles_usuario")
      .select("alias_publico, ano_nacimiento, creado_el")
      .eq("id", user.id)
      .maybeSingle<Perfil>(),
    supabase
      .from("anuncios")
      .select(
        `id, estado, creado_el, caduca_el, observaciones,
         cuerpo:cuerpos(codigo_oficial, denominacion),
         especialidad:especialidades(codigo_oficial, denominacion),
         municipio:municipios!municipio_actual_codigo(nombre),
         anuncio_plazas_deseadas(count)`,
      )
      .eq("usuario_id", user.id)
      .neq("estado", "eliminado")
      .order("creado_el", { ascending: false }),
  ]);

  const perfil = perfilRes.data;

  // Reformatear anuncios para tener total_plazas como número.
  const anuncios: AnuncioListado[] = (anunciosRes.data ?? []).map((a) => {
    const plazas = a.anuncio_plazas_deseadas as unknown as { count: number }[];
    return {
      id: a.id as string,
      estado: a.estado as string,
      creado_el: a.creado_el as string,
      caduca_el: a.caduca_el as string,
      observaciones: (a.observaciones as string | null) ?? null,
      cuerpo: Array.isArray(a.cuerpo) ? a.cuerpo[0] ?? null : (a.cuerpo as AnuncioListado["cuerpo"]),
      especialidad: Array.isArray(a.especialidad) ? a.especialidad[0] ?? null : (a.especialidad as AnuncioListado["especialidad"]),
      municipio: Array.isArray(a.municipio) ? a.municipio[0] ?? null : (a.municipio as AnuncioListado["municipio"]),
      total_plazas: plazas?.[0]?.count ?? 0,
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Mi cuenta
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Datos básicos de tu cuenta y tus anuncios.
      </p>

      {creado === "1" && (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
          ¡Anuncio publicado! Lo tienes abajo en "Mis anuncios".
        </div>
      )}
      {actualizado === "1" && (
        <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
          Anuncio actualizado correctamente.
        </div>
      )}
      {eliminado === "1" && (
        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Anuncio eliminado.
        </div>
      )}

      {!user.email_confirmed_at && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
          <p className="font-medium">Confirma tu email</p>
          <p className="mt-1">
            Te hemos enviado un enlace de confirmación. Hasta que pinches en él, no podrás publicar anuncios ni
            recibir mensajes.
          </p>
        </div>
      )}

      {user.email_confirmed_at && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Mis anuncios</h2>
            <a
              href="/anuncios/nuevo"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              + Publicar anuncio
            </a>
          </div>

          {anuncios.length === 0 ? (
            <p className="mt-3 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Aún no has publicado ningún anuncio. Pulsa el botón de arriba para crear el primero.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {anuncios.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {a.cuerpo?.codigo_oficial ? `${a.cuerpo.codigo_oficial} · ` : ""}
                        {a.cuerpo?.denominacion ?? "Cuerpo desconocido"}
                      </p>
                      {a.especialidad && (
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {a.especialidad.codigo_oficial ? `${a.especialidad.codigo_oficial} · ` : ""}
                          {a.especialidad.denominacion}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        Estás en <strong>{a.municipio?.nombre ?? "—"}</strong> · aceptarías irte a{" "}
                        <strong>{a.total_plazas} {a.total_plazas === 1 ? "municipio" : "municipios"}</strong>
                      </p>
                    </div>
                    <span className={
                      a.estado === "activo"
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }>
                      {a.estado}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Publicado el {new Date(a.creado_el).toLocaleDateString("es-ES")}
                      {" · "}
                      Caduca el {new Date(a.caduca_el).toLocaleDateString("es-ES")}
                    </p>
                    <a
                      href={`/anuncios/${a.id}/editar`}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Editar
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Datos de la cuenta</h2>
        <dl className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white text-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
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
            <div className="flex justify-between px-4 py-3">
              <dt className="font-medium text-slate-700 dark:text-slate-300">Cuenta creada</dt>
              <dd className="text-slate-900 dark:text-slate-100">
                {new Date(perfil.creado_el).toLocaleDateString("es-ES")}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {perfil && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Editar perfil</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Cambia tu alias público o tu año de nacimiento.
          </p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <EditarPerfilForm aliasInicial={perfil.alias_publico} anoInicial={perfil.ano_nacimiento} />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Cambiar contraseña</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Pon una nueva contraseña sin necesidad de pasar por el email de recuperación.
        </p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <CambiarContrasenaForm />
        </div>
      </section>

      <p className="mt-10 text-xs text-slate-500 dark:text-slate-400">
        Las funciones de mensajería y detección de cadenas de permuta llegarán en próximos bloques del desarrollo.
      </p>
    </main>
  );
}

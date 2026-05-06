import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditarPerfilForm } from "./EditarPerfilForm";
import { CambiarContrasenaForm } from "./CambiarContrasenaForm";
import { MiAnuncioCard, type AnuncioCardData } from "./MiAnuncioCard";
import { PrivacidadSeccion } from "./PrivacidadSeccion";
import { contarCadenasParaMisAnuncios } from "./actions";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: { index: false, follow: false },
};

type Perfil = {
  alias_publico: string;
  ano_nacimiento: number;
  creado_el: string;
};

type SearchParams = Promise<{
  creado?: string;
  actualizado?: string;
  eliminado?: string;
  bienvenido?: string;
  permutado?: string;
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

  const { creado, actualizado, eliminado, bienvenido, permutado } =
    await searchParams;

  const [perfilRes, anunciosRes, noLeidosRes, conteoCadenas] = await Promise.all([
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
    supabase.rpc("contar_conversaciones_con_no_leidos"),
    contarCadenasParaMisAnuncios(),
  ]);

  const perfil = perfilRes.data;
  const noLeidos = (noLeidosRes.data as number | null) ?? 0;

  // Reformatear anuncios para el componente cliente.
  type RawCuerpo = { codigo_oficial: string | null; denominacion: string };
  type RawEsp = { codigo_oficial: string | null; denominacion: string };
  const anuncios: AnuncioCardData[] = (anunciosRes.data ?? []).map((a) => {
    const plazas = a.anuncio_plazas_deseadas as unknown as { count: number }[];
    const cuerpo = Array.isArray(a.cuerpo) ? a.cuerpo[0] : (a.cuerpo as RawCuerpo | null);
    const esp = Array.isArray(a.especialidad)
      ? a.especialidad[0]
      : (a.especialidad as RawEsp | null);
    const muni = Array.isArray(a.municipio)
      ? a.municipio[0]
      : (a.municipio as { nombre: string } | null);
    return {
      id: a.id as string,
      estado: a.estado as string,
      creado_el: a.creado_el as string,
      caduca_el: a.caduca_el as string,
      cuerpo_label: cuerpo
        ? `${cuerpo.codigo_oficial ? cuerpo.codigo_oficial + " · " : ""}${cuerpo.denominacion}`
        : "Cuerpo desconocido",
      especialidad_label: esp
        ? `${esp.codigo_oficial ? esp.codigo_oficial + " · " : ""}${esp.denominacion}`
        : null,
      municipio_nombre: muni?.nombre ?? "—",
      total_plazas: plazas?.[0]?.count ?? 0,
    };
  });

  const anunciosActivos = anuncios.filter((a) => a.estado === "activo").length;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Mi cuenta
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Datos básicos de tu cuenta y tus anuncios.
      </p>

      {bienvenido === "1" && (
        <div className="mt-6 rounded-xl2 border-2 border-brand bg-brand-bg p-5 shadow-card-hover">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-text">
            🎉 Bienvenido a PermutaES
          </p>
          <h2 className="mt-1 font-head text-xl font-semibold text-brand">
            Tu email está confirmado
          </h2>
          <p className="mt-2 text-sm text-brand-text">
            Ya puedes publicar tu primer anuncio. Cuando lo hagas, cruzaremos tu
            plaza y tus destinos contra el resto de la plataforma para detectar
            cadenas de permuta a 2, 3 o 4 personas que te incluyan.
          </p>
        </div>
      )}

      {creado === "1" && (
        <div className="mt-6 rounded-md border border-brand-mint/40 bg-brand-bg p-4 text-sm text-brand-text">
          ¡Anuncio publicado! Lo tienes abajo en "Mis anuncios".
        </div>
      )}
      {actualizado === "1" && (
        <div className="mt-6 rounded-md border border-brand-mint/40 bg-brand-bg p-4 text-sm text-brand-text">
          Anuncio actualizado correctamente.
        </div>
      )}
      {eliminado === "1" && (
        <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Anuncio eliminado.
        </div>
      )}
      {permutado === "1" && (
        <div className="mt-6 rounded-xl2 border-2 border-brand bg-brand-bg p-5 shadow-card-hover">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-text">
            🎉 ¡Enhorabuena!
          </p>
          <h2 className="mt-1 font-head text-xl font-semibold text-brand">
            Permuta cerrada
          </h2>
          <p className="mt-2 text-sm text-brand-text">
            Tu anuncio ya no aparece en cadenas ni búsquedas.
            <strong> Recuérdale a la otra persona</strong> de la cadena que
            también marque el suyo como cerrado, así nadie verá cadenas
            falsas.
          </p>
          <p className="mt-3 text-xs text-brand-text/80">
            Gracias por confirmarlo en PermutaES — nos ayuda a mostrar
            estadísticas reales de éxito a otros funcionarios.
          </p>
        </div>
      )}

      {!user.email_confirmed_at && (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Confirma tu email</p>
          <p className="mt-1">
            Te hemos enviado un enlace de confirmación. Hasta que pinches en él, no podrás publicar anuncios ni
            recibir mensajes.
          </p>
        </div>
      )}

      {user.email_confirmed_at && anuncios.length === 0 && (
        <section className="mt-6 rounded-xl2 border-2 border-brand-mint bg-brand-bg p-5 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-text">
            👋 Tu siguiente paso
          </p>
          <h2 className="mt-1 font-head text-xl font-semibold text-brand">
            Publica tu primer anuncio
          </h2>
          <p className="mt-2 text-sm text-brand-text">
            Hasta que no publiques un anuncio con tu plaza actual y los destinos
            que buscas, <strong>no podemos detectar cadenas con tu perfil</strong>.
            Solo tarda un par de minutos.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/anuncios/nuevo"
              className="inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
            >
              + Publicar mi anuncio
            </a>
            <a
              href="/anuncios"
              className="inline-flex items-center rounded-md border border-brand-mint bg-white px-4 py-2 text-sm font-medium text-brand-text hover:bg-brand-bg/60"
            >
              Ver anuncios de otros
            </a>
          </div>
        </section>
      )}

      {user.email_confirmed_at && (
        <>
          {/* Stats personales: lo primero que ve el usuario al entrar */}
          <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
            <a
              href="/auto-permutas"
              className={
                "rounded-xl2 border p-4 shadow-card transition " +
                (conteoCadenas.total > 0
                  ? "border-brand bg-brand-bg hover:shadow-card-hover"
                  : "border-brand-mint bg-brand-bg/40 hover:bg-brand-bg")
              }
            >
              <p className="text-[11px] uppercase tracking-wide text-brand-text">
                Cadenas detectadas
              </p>
              <p className="mt-1 font-head text-2xl font-semibold text-brand">
                {conteoCadenas.total}
              </p>
              {conteoCadenas.total > 0 ? (
                <p className="mt-1 text-[11px] text-brand-text">
                  🎉 {conteoCadenas.porLongitud.directas} directas
                  {conteoCadenas.porLongitud.tres > 0 &&
                    ` · ${conteoCadenas.porLongitud.tres} a 3`}
                  {conteoCadenas.porLongitud.cuatro > 0 &&
                    ` · ${conteoCadenas.porLongitud.cuatro} a 4`}
                  <br />
                  Pulsa para verlas →
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-600">
                  Aún no hay cadenas con tu perfil. Prueba en Auto permutas con
                  más localidades objetivo →
                </p>
              )}
            </a>
            <a
              href="/mensajes"
              className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand-mint"
            >
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Mensajes sin leer
              </p>
              <p className="mt-1 font-head text-2xl font-semibold text-brand">
                {noLeidos}
              </p>
              {noLeidos > 0 ? (
                <p className="mt-1 text-[11px] text-brand-text">
                  Tienes mensajes nuevos →
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  Bandeja al día.
                </p>
              )}
            </a>
            <a
              href="/anuncios/nuevo"
              className="col-span-2 rounded-xl2 border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand-mint md:col-span-1"
            >
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Mis anuncios activos
              </p>
              <p className="mt-1 font-head text-2xl font-semibold text-brand">
                {anunciosActivos}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                + Publicar otro anuncio →
              </p>
            </a>
          </section>

          {/* Listado de anuncios propios */}
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Mis anuncios
              </h2>
              <a
                href="/anuncios/nuevo"
                className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
              >
                + Publicar anuncio
              </a>
            </div>

            {anuncios.length === 0 ? (
              <p className="mt-3 rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
                Aún no has publicado ningún anuncio. Pulsa el botón de arriba
                para crear el primero — sin él no podemos detectar cadenas que
                te incluyan.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {anuncios.map((a) => (
                  <MiAnuncioCard
                    key={a.id}
                    anuncio={a}
                    cadenasCount={conteoCadenas.porAnuncio[a.id] ?? 0}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Datos de la cuenta</h2>
        <dl className="mt-3 divide-y divide-slate-200 rounded-xl2 border border-slate-200 bg-white shadow-card text-sm">
          <div className="flex justify-between px-4 py-3">
            <dt className="font-medium text-slate-700">Email</dt>
            <dd className="text-slate-900">{user.email}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="font-medium text-slate-700">Email verificado</dt>
            <dd className="text-slate-900">
              {user.email_confirmed_at ? "Sí" : "Pendiente"}
            </dd>
          </div>
          {perfil && (
            <div className="flex justify-between px-4 py-3">
              <dt className="font-medium text-slate-700">Cuenta creada</dt>
              <dd className="text-slate-900">
                {new Date(perfil.creado_el).toLocaleDateString("es-ES")}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {perfil && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Editar perfil</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cambia tu alias público o tu año de nacimiento.
          </p>
          <div className="mt-4 rounded-xl2 border border-slate-200 bg-white shadow-card p-5">
            <EditarPerfilForm aliasInicial={perfil.alias_publico} anoInicial={perfil.ano_nacimiento} />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Cambiar contraseña</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pon una nueva contraseña sin necesidad de pasar por el email de recuperación.
        </p>
        <div className="mt-4 rounded-xl2 border border-slate-200 bg-white shadow-card p-5">
          <CambiarContrasenaForm />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">
          Privacidad y mis datos
        </h2>
        <div className="mt-4">
          <PrivacidadSeccion />
        </div>
      </section>

    </main>
  );
}

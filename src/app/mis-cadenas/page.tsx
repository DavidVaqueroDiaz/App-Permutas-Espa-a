import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  detallarCadenasDeUsuario,
  type CadenasDeAnuncio,
} from "@/lib/cadenas/mis-cadenas";
import { ListaMisCadenas } from "./ListaMisCadenas";

export const metadata: Metadata = {
  title: "Mis cadenas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Cadenas de permuta que incluyen los anuncios publicados del usuario.
 * Es a donde llevan el correo de "permuta posible" y el contador de
 * Mi cuenta: desde aqui se ve el recorrido y se contacta con cada
 * participante sin tener que rellenar el buscador.
 */
export default async function MisCadenasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/mis-cadenas");

  let grupos: CadenasDeAnuncio[] = [];
  let fallo = false;
  try {
    grupos = await detallarCadenasDeUsuario(supabase, user.id);
  } catch (e) {
    console.warn("[mis-cadenas] error cargando cadenas:", e);
    fallo = true;
  }

  const total = grupos.reduce((n, g) => n + g.cadenas.length, 0);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Mis cadenas
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Permutas posibles con tus anuncios publicados. Contacta con cada
        persona desde su tarjeta; para que la permuta salga tenéis que estar
        de acuerdo todos los de la cadena.
      </p>

      {fallo ? (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          No hemos podido cargar tus cadenas ahora mismo. Vuelve a intentarlo
          en unos minutos.
        </div>
      ) : total === 0 ? (
        <section className="mt-6 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-head text-lg font-semibold text-slate-900">
            Aún no hay cadenas con tus anuncios
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Te avisaremos por correo en cuanto alguien publique un anuncio que
            encaje. Mientras tanto puedes ampliar los municipios que aceptas en
            tus anuncios o probar otras zonas en el buscador.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/mi-cuenta"
              className="inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Ver mis anuncios
            </a>
            <a
              href="/auto-permutas"
              className="inline-flex items-center rounded-md border border-brand-mint bg-white px-4 py-2 text-sm font-medium text-brand-text hover:bg-brand-bg/60"
            >
              Ir al buscador
            </a>
          </div>
        </section>
      ) : (
        <ListaMisCadenas grupos={grupos} />
      )}
    </main>
  );
}

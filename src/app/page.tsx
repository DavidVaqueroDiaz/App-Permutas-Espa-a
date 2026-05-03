import { createClient } from "@/lib/supabase/server";
import {
  obtenerConteosPorCcaa,
  obtenerSectoresConAnuncios,
} from "./actions/conteos";
import { MapaHomeChoropleth } from "@/components/MapaHomeChoropleth";

type Sector = {
  codigo: string;
  nombre: string;
  descripcion: string | null;
};

async function getSectores(): Promise<Sector[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sectores")
    .select("codigo, nombre, descripcion")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("[home] Error leyendo sectores:", error.message);
    return [];
  }
  return data ?? [];
}

export default async function Home() {
  const [sectores, conteos, sectoresOpciones] = await Promise.all([
    getSectores(),
    obtenerConteosPorCcaa(),
    obtenerSectoresConAnuncios(),
  ]);

  const totalAnuncios = Object.values(conteos).reduce((a, b) => a + b, 0);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-slate-50 to-slate-100 px-6 py-12 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          En construcción · Lanzamiento próximamente
        </div>

        <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
          PermutaES
        </h1>

        <p className="mt-6 text-pretty text-lg leading-8 text-slate-700 dark:text-slate-300">
          La primera plataforma nacional para que cualquier funcionario público
          español encuentre cadenas de permuta de plaza compatibles, en toda
          España y en todos los sectores con permuta legalmente admitida.
        </p>

        {/* Mapa de actividad por CCAA */}
        <div className="mt-10">
          <MapaHomeChoropleth
            sectoresOpciones={sectoresOpciones}
            conteosIniciales={conteos}
            totalInicial={totalAnuncios}
          />
        </div>

        <h2 className="mt-12 text-xl font-semibold text-slate-900 dark:text-slate-50">
          ¿Qué cubrirá PermutaES?
        </h2>
        {sectores.length > 0 ? (
          <ul className="mt-4 grid gap-2 text-slate-700 dark:text-slate-300 sm:grid-cols-2">
            {sectores.map((sector) => (
              <li key={sector.codigo}>· {sector.nombre}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm italic text-slate-500 dark:text-slate-400">
            Cargando catálogo de sectores…
          </p>
        )}

        <h2 className="mt-12 text-xl font-semibold text-slate-900 dark:text-slate-50">
          ¿Cómo funcionará?
        </h2>
        <ol className="mt-4 space-y-2 text-slate-700 dark:text-slate-300">
          <li>
            <span className="font-semibold">1.</span> Te registras gratis y
            publicas tu anuncio: dónde tienes plaza ahora y a qué municipios
            aceptarías irte.
          </li>
          <li>
            <span className="font-semibold">2.</span> El motor detecta
            automáticamente cadenas de permuta posibles (directas, a 3 o a 4
            personas) que cumplan TODAS las reglas legales de tu sector.
          </li>
          <li>
            <span className="font-semibold">3.</span> Te avisamos por email
            cuando aparezca una coincidencia. Hablas con la otra parte por
            mensajería interna y, si hay acuerdo, tramitáis la permuta con
            vuestra administración.
          </li>
        </ol>

        <p className="mt-12 text-sm text-slate-500 dark:text-slate-400">
          Estamos terminando de construir la plataforma. Próximamente abriremos
          registro para los primeros usuarios.
        </p>
      </div>
    </main>
  );
}

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
    <main className="flex min-h-screen flex-col items-center px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 inline-flex items-center rounded-full bg-warn-bg px-3 py-1 text-xs font-medium text-warn-text">
          En construcción · Lanzamiento próximamente
        </div>

        <h1 className="text-balance font-head text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          PermutaES
        </h1>

        <p className="mt-6 text-pretty text-lg leading-8 text-slate-700">
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

        <h2 className="mt-12 font-head text-xl font-semibold text-brand">
          ¿Qué cubrirá PermutaES?
        </h2>
        {sectores.length > 0 ? (
          <ul className="mt-4 grid gap-2 text-slate-700 sm:grid-cols-2">
            {sectores.map((sector) => (
              <li key={sector.codigo}>· {sector.nombre}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm italic text-slate-500">
            Cargando catálogo de sectores…
          </p>
        )}

        <h2 className="mt-12 font-head text-xl font-semibold text-brand">
          ¿Cómo funcionará?
        </h2>
        <ol className="mt-4 space-y-2 text-slate-700">
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

        <h2 className="mt-12 font-head text-xl font-semibold text-brand">
          Más información
        </h2>
        <ul className="mt-4 space-y-1.5 text-slate-700">
          <li>
            →{" "}
            <a
              href="/que-es-una-permuta"
              className="font-medium text-brand-text hover:text-brand"
            >
              ¿Qué es una permuta de plaza entre funcionarios?
            </a>{" "}
            <span className="text-slate-500">
              — Guía completa con requisitos, cadenas y proceso.
            </span>
          </li>
          <li>
            →{" "}
            <a
              href="/permutas/docentes"
              className="font-medium text-brand-text hover:text-brand"
            >
              Permutas docentes en España
            </a>{" "}
            <span className="text-slate-500">
              — Cuerpos LOE, requisitos del RD 1834/2008 y casos prácticos.
            </span>
          </li>
          <li>
            →{" "}
            <a
              href="/auto-permutas"
              className="font-medium text-brand-text hover:text-brand"
            >
              Buscador de cadenas
            </a>{" "}
            <span className="text-slate-500">
              — Sin necesidad de registro.
            </span>
          </li>
        </ul>

        <p className="mt-12 text-sm text-slate-500">
          Estamos terminando de construir la plataforma. Próximamente abriremos
          registro para los primeros usuarios.
        </p>
      </div>
    </main>
  );
}

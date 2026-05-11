import { createClient } from "@/lib/supabase/server";
import {
  obtenerConteosPorCcaa,
  obtenerSectoresConAnuncios,
} from "./actions/conteos";
import { MapaHomeChoropleth } from "@/components/MapaHomeChoropleth";
import { BannerCuentaEliminada } from "@/components/BannerCuentaEliminada";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site-url";

/**
 * Nota sobre rendimiento: la home consulta Supabase en cada request
 * para los conteos de anuncios y permutas cerradas. La cache real
 * deberia hacerse con un cliente anonimo (sin cookies) envuelto en
 * `unstable_cache`, pero `createClient()` lee cookies internamente y
 * eso no es compatible con `unstable_cache`. Como mejora futura, crear
 * un cliente publico aparte para datos no-personales y cachearlo.
 *
 * El banner "cuenta eliminada" vive en un client component
 * (BannerCuentaEliminada) que lee `?cuenta_eliminada=1` desde el
 * navegador. Asi la pagina no recibe `searchParams` y queda lista
 * para optimizaciones futuras de cache.
 */

/**
 * Schema.org Organization + WebSite para la home. Le dice a Google
 * (y a los AI Overviews) cual es la entidad detras de la web, donde
 * encontrar mas info, y como se llama el sitio. Mejora la
 * presentacion en SERP y la inclusion en respuestas de IA.
 */
const SCHEMA_HOME = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PermutaES",
    alternateName: "PermutaES — Permutas de plaza para funcionarios",
    url: SITE_URL,
    logo: `${SITE_URL}/opengraph-image`,
    sameAs: ["https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a"],
    foundingDate: "2026",
    areaServed: { "@type": "Country", name: "España" },
    knowsAbout: [
      "Permutas de plaza entre funcionarios públicos",
      "Concursos de traslados",
      "Estatuto Marco del personal estatutario del SNS",
      "Real Decreto 1834/2008",
      "Estatuto Básico del Empleado Público (TREBEP)",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PermutaES",
    url: SITE_URL,
    inLanguage: "es-ES",
    description:
      "Plataforma nacional gratuita para detectar cadenas de permuta de plaza entre funcionarios públicos en España.",
  },
];

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

type PermutasContador = { total: number; ultimos_30_dias: number };

async function getPermutasConseguidas(): Promise<PermutasContador> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("contar_permutas_conseguidas")
    .single();
  if (error || !data) return { total: 0, ultimos_30_dias: 0 };
  const row = data as { total: number; ultimos_30_dias: number };
  return {
    total: Number(row.total) || 0,
    ultimos_30_dias: Number(row.ultimos_30_dias) || 0,
  };
}

export default async function Home() {
  const [sectores, conteos, sectoresOpciones, permutasConseguidas] =
    await Promise.all([
      getSectores(),
      obtenerConteosPorCcaa(),
      obtenerSectoresConAnuncios(),
      getPermutasConseguidas(),
    ]);

  const totalAnuncios = Object.values(conteos).reduce((a, b) => a + b, 0);

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-8 sm:px-6 sm:py-12">
      {SCHEMA_HOME.map((schema, i) => (
        <JsonLd key={i} data={schema} />
      ))}
      <div className="mx-auto w-full max-w-3xl">
        <BannerCuentaEliminada />

        {/* Hero — la PRIMERA cosa que ve el usuario al entrar.
            Empuja al buscador inteligente (auto-permutas), que es la
            herramienta más potente. El mapa queda más abajo como vía
            alternativa de descubrimiento. */}
        <section className="rounded-xl2 border border-brand-mint/40 bg-brand-bg/50 p-6 shadow-card md:p-8">
          <div className="mb-3 inline-flex items-center rounded-full bg-brand-mint/30 px-3 py-1 text-[11px] font-medium text-brand-text">
            Plataforma nacional · Para funcionarios públicos en toda España · 9 sectores activos
          </div>

          <h1 className="text-balance font-head text-4xl font-semibold tracking-tight text-brand sm:text-5xl">
            Encuentra tu permuta
          </h1>

          <p className="mt-4 text-pretty text-lg leading-8 text-slate-700">
            Plataforma nacional gratuita para funcionarios públicos: docencia,
            sanidad SNS, AGE, autonómicos, locales, habilitados nacionales,
            policía local, Policía Nacional y Guardia Civil. Cruzamos
            automáticamente los anuncios y detectamos{" "}
            <strong>cadenas de permuta directas, a 3 o a 4 personas</strong>{" "}
            que cumplen las reglas legales de tu sector.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="/auto-permutas"
              className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              Buscar permutas posibles →
            </a>
            <a
              href="/registro"
              className="inline-flex items-center gap-1 rounded-md border border-brand-mint bg-white px-4 py-3 text-sm font-medium text-brand-text transition hover:border-brand hover:text-brand"
            >
              Crear cuenta y publicar mi anuncio
            </a>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            <strong>Buscar y ver anuncios</strong> ya funciona sin registro.
            Solo necesitas crear cuenta para <strong>publicar tu anuncio</strong>{" "}
            o contactar con otros participantes.
          </p>
        </section>

        {/* Prueba social: solo se muestra si ya ha habido permutas reales */}
        {permutasConseguidas.total > 0 && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-xl2 border border-brand-mint/40 bg-white p-4 shadow-card">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-text">
                Permutas cerradas en PermutaES
              </p>
              <p className="mt-0.5 font-head text-2xl font-semibold text-brand">
                {permutasConseguidas.total}
                {permutasConseguidas.ultimos_30_dias > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-600">
                    ({permutasConseguidas.ultimos_30_dias} en los últimos 30 días)
                  </span>
                )}
              </p>
            </div>
            <p className="hidden text-xs text-slate-500 sm:block">
              Funcionarios que ya<br />consiguieron su plaza<br />gracias a la plataforma.
            </p>
          </div>
        )}

        {/* Mapa secundario, exploración por CCAA */}
        <h2 className="mt-12 font-head text-xl font-semibold text-brand">
          O explora los anuncios por comunidad autónoma
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Pulsa una CCAA para ver los anuncios publicados allí.
          {totalAnuncios > 0 && (
            totalAnuncios === 1
              ? ` Hay 1 anuncio activo en total.`
              : ` Hay ${totalAnuncios} anuncios activos en total.`
          )}
        </p>

        <div className="mt-4">
          <MapaHomeChoropleth
            sectoresOpciones={sectoresOpciones}
            conteosIniciales={conteos}
            totalInicial={totalAnuncios}
          />
        </div>

        <h2 className="mt-12 font-head text-xl font-semibold text-brand">
          ¿Cómo funciona?
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
          Sectores cubiertos
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
              href="/preguntas-frecuentes"
              className="font-medium text-brand-text hover:text-brand"
            >
              Preguntas frecuentes
            </a>{" "}
            <span className="text-slate-500">
              — Las dudas más habituales con respuesta directa.
            </span>
          </li>
        </ul>

        <div className="mt-12 rounded-xl2 border border-brand-mint/40 bg-brand-bg/30 p-5">
          <h3 className="font-head text-base font-semibold text-brand">
            ¿Empezamos?
          </h3>
          <p className="mt-1 text-sm text-slate-700">
            El registro es gratuito y solo te lleva un par de minutos. Puedes
            descargar tus datos o eliminar tu cuenta cuando quieras (RGPD
            completo).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href="/registro"
              className="inline-flex items-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Crear cuenta
            </a>
            <a
              href="/auto-permutas"
              className="inline-flex items-center rounded-md border border-brand-mint bg-white px-4 py-2 text-sm font-medium text-brand-text hover:bg-brand-bg/40"
            >
              O explorar primero (sin registro)
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

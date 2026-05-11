// ISR: pagina estatica de contenido. Se revalida cada hora.
export const revalidate = 3600;

import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title:
    "Permutas en la Guardia Civil — Coordina tu cambio de destino | PermutaES",
  description:
    "Plataforma gratuita para que guardias civiles encuentren compañeros con destinos opuestos y coordinen el intercambio en sus concursos. Empleos y especialidades fundamentales incluidos. Marco legal: Ley 29/2014, RD 470/2019, Orden PCM/509/2020.",
  alternates: { canonical: "/permutas/guardia-civil" },
  keywords: [
    "permuta guardia civil",
    "cambio destino guardia civil",
    "concurso destinos guardia civil",
    "RD 470/2019",
    "ley 29/2014",
    "comandancia guardia civil",
    "especialidad guardia civil",
    "permuta tráfico SEPRONA USECIC",
  ],
  openGraph: {
    title: "Permutas en la Guardia Civil — PermutaES",
    description:
      "Encuentra compañeros para coordinar el cambio de destino en la Guardia Civil.",
    type: "article",
  },
};

const FECHA_REVISION = "2026-05-11";
const URL_CANONICA = `${SITE_URL}/permutas/guardia-civil`;

const SCHEMA_ARTICULO = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "Permutas en la Guardia Civil — Coordina tu cambio de destino",
  description:
    "Guía y buscador para guardias civiles que quieren coordinar un intercambio de destino con un compañero de la misma especialidad.",
  inLanguage: "es-ES",
  datePublished: FECHA_REVISION,
  dateModified: FECHA_REVISION,
  author: { "@type": "Organization", name: "PermutaES" },
  publisher: {
    "@type": "Organization",
    name: "PermutaES",
    url: SITE_URL,
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": URL_CANONICA },
  about: {
    "@type": "Thing",
    name: "Permutas y cambios de destino en la Guardia Civil",
  },
  keywords:
    "permuta guardia civil, cambio destino, concurso destinos, RD 470/2019, especialidad fundamental",
};

export default function PermutasGuardiaCivilPage() {
  return (
    <main className="prose prose-slate mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd data={SCHEMA_ARTICULO} />
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Sector — Guardia Civil
      </p>
      <h1>Permutas en la Guardia Civil</h1>
      <p className="lead text-lg text-slate-700">
        En la Guardia Civil la &laquo;permuta&raquo; no aparece como figura
        legal en el RD 470/2019, pero la provisión de destinos por concurso
        permite que dos compañeros del mismo empleo y especialidad se pongan
        de acuerdo para pedirse mutuamente sus puestos. PermutaES es la
        plataforma gratuita que cruza esos anuncios y detecta los
        intercambios posibles (cadenas a 2, 3 o 4 personas) en las 53
        comandancias del territorio.
      </p>

      <p className="text-sm text-slate-500">
        Última revisión: {FECHA_REVISION}. Normativa base:{" "}
        <strong>Ley 29/2014</strong>, de 28 de noviembre, de Régimen del
        Personal de la Guardia Civil; <strong>Real Decreto 470/2019</strong>
        , de 2 de agosto, Reglamento de destinos; y{" "}
        <strong>Orden PCM/509/2020</strong>, que regula las especialidades.
      </p>

      <h2>¿Cómo funciona la coordinación entre compañeros?</h2>
      <p>
        El RD 470/2019 regula la provisión ordinaria de destinos (voluntaria,
        anuente o forzosa), la extraordinaria, las comisiones de servicio y
        las adscripciones temporales. La práctica habitual para intercambiar
        plaza entre dos compañeros del mismo empleo y especialidad es:
      </p>
      <ol>
        <li>
          Cada uno detecta a otro guardia con destino opuesto al suyo (o una
          cadena de varios).
        </li>
        <li>
          En la publicación de vacantes del concurso anual, cada uno solicita
          el puesto actual del otro como primera preferencia.
        </li>
        <li>
          Si la antigüedad de ambos lo permite y no hay otro guardia con
          derecho preferente o más antigüedad, la asignación se cruza.
        </li>
      </ol>
      <p>
        PermutaES no tramita la solicitud — eso lo hacéis vosotros en el
        concurso — pero sí os ayuda a encontraros. La parte difícil suele ser
        precisamente esa: identificar al compañero con la preferencia
        complementaria a la vuestra dentro de tu misma especialidad.
      </p>

      <h2>Empleos incluidos</h2>
      <p>
        PermutaES cubre <strong>12 empleos</strong> de las tres escalas
        principales según el art. 18.3 de la Ley 29/2014. No se incluyen
        Oficiales Generales (Tte. General, Gral. de División, Gral. de
        Brigada), Tenientes Coroneles ni Coroneles porque sus puestos son
        principalmente de libre designación.
      </p>
      <table>
        <thead>
          <tr>
            <th>Escala</th>
            <th>Empleo</th>
            <th>Grupo EBEP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={4}>Cabos y Guardias</td>
            <td>Guardia Civil</td>
            <td>C1</td>
          </tr>
          <tr>
            <td>Cabo</td>
            <td>C1</td>
          </tr>
          <tr>
            <td>Cabo Primero</td>
            <td>C1</td>
          </tr>
          <tr>
            <td>Cabo Mayor</td>
            <td>C1</td>
          </tr>
          <tr>
            <td rowSpan={5}>Suboficiales</td>
            <td>Sargento</td>
            <td>A2</td>
          </tr>
          <tr>
            <td>Sargento Primero</td>
            <td>A2</td>
          </tr>
          <tr>
            <td>Brigada</td>
            <td>A2</td>
          </tr>
          <tr>
            <td>Subteniente</td>
            <td>A2</td>
          </tr>
          <tr>
            <td>Suboficial Mayor</td>
            <td>A2</td>
          </tr>
          <tr>
            <td rowSpan={3}>Oficiales</td>
            <td>Teniente</td>
            <td>A1</td>
          </tr>
          <tr>
            <td>Capitán</td>
            <td>A1</td>
          </tr>
          <tr>
            <td>Comandante</td>
            <td>A1</td>
          </tr>
        </tbody>
      </table>

      <h2>Especialidades fundamentales</h2>
      <p>
        En la Guardia Civil, a diferencia de la Policía Nacional, la
        especialidad <strong>define el puesto</strong>: no eres un guardia
        que está en Tráfico, eres un guardia del Sector de Tráfico de tal
        provincia. La permuta exige por tanto <strong>misma especialidad,
        además de mismo empleo</strong>.
      </p>
      <p>
        PermutaES incluye las 21 especialidades fundamentales de la Orden
        PCM/509/2020, más una opción genérica de <em>Seguridad Ciudadana</em>{" "}
        para los puestos territoriales (USECIC, patrulla rural) que no
        tienen una especialidad técnica asignada:
      </p>
      <ul>
        <li>Seguridad Ciudadana (territorial, USECIC)</li>
        <li>Tráfico</li>
        <li>Protección de la Naturaleza (SEPRONA)</li>
        <li>Fiscal y Fronteras</li>
        <li>Policía Judicial</li>
        <li>Información</li>
        <li>Marítima</li>
        <li>Aérea</li>
        <li>Montaña</li>
        <li>Intervención Especial (UEI)</li>
        <li>Intervención de Armas y Explosivos</li>
        <li>Desactivación de Explosivos y NRBQ</li>
        <li>Criminalística</li>
        <li>Cinológica</li>
        <li>Automovilismo</li>
        <li>Actividades Subacuáticas</li>
        <li>Reconocimiento del Subsuelo</li>
        <li>Adiestramientos Especiales</li>
        <li>Armamento y Equipamiento Policial</li>
        <li>Seguridad e Intervención</li>
        <li>Tecnologías de la Información</li>
        <li>Prevención de Riesgos Laborales</li>
      </ul>
      <p>
        Las especialidades están disponibles para tropa y suboficiales
        (Guardia hasta Suboficial Mayor). Para los empleos de Oficiales,
        donde los puestos suelen ser de mando transversal, el anuncio se
        publica sin especialidad fundamental.
      </p>

      <h2>Requisitos prácticos habituales</h2>
      <p>
        El RD 470/2019 y la Orden INT/26/2021 establecen las condiciones
        para concursar a un destino. Como regla general se exige:
      </p>
      <ul>
        <li>
          Estar en situación de servicio activo y con destino definitivo.
        </li>
        <li>
          Haber cumplido el tiempo mínimo de permanencia en el destino
          actual, que fija la convocatoria.
        </li>
        <li>
          Pertenecer al mismo empleo y especialidad que el puesto que se
          solicita.
        </li>
      </ul>
      <p>
        Los detalles concretos (méritos, antigüedad, plazos) varían en cada
        convocatoria. Antes de coordinar una permuta, consulta las{" "}
        <strong>bases del concurso vigente</strong> publicadas en el BOE y,
        si tienes dudas, habla con tu asociación profesional o con tu
        comandancia.
      </p>

      <h2>Permutas a 2, 3 o 4 personas</h2>
      <p>
        La forma más sencilla es la permuta directa, pero PermutaES también
        detecta cadenas más largas:
      </p>
      <ul>
        <li>
          <strong>Permuta directa (a 2)</strong>: A quiere ir a Cádiz, B
          quiere ir al puesto de A. Se piden mutuamente y, si la antigüedad
          encaja, salen los dos.
        </li>
        <li>
          <strong>Cadena a 3</strong>: tres compañeros del mismo empleo y
          especialidad que se mueven en ciclo (A → B → C → A).
        </li>
        <li>
          <strong>Cadena a 4</strong>: longitud máxima que la app busca.
        </li>
      </ul>
      <p>
        En la Guardia Civil el ámbito es nacional: las cadenas pueden cruzar
        cualquier comandancia, de cualquier provincia.
      </p>

      <p className="!mt-8">
        <a
          href="/auto-permutas"
          className="inline-flex items-center gap-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold !text-white !no-underline hover:bg-brand-dark"
        >
          Buscar cadenas en la Guardia Civil →
        </a>
      </p>

      <h2>Preguntas frecuentes</h2>

      <h3>¿La permuta está reconocida en el Reglamento de destinos?</h3>
      <p>
        No como figura específica. El RD 470/2019 regula la provisión de
        destinos por concurso (voluntaria, anuente, forzosa), pero la
        coordinación previa entre dos guardias para pedirse mutuamente la
        plaza es válida y se hace con regularidad. PermutaES facilita
        encontrarse; la solicitud formal se hace en el concurso ordinario.
      </p>

      <h3>¿Puedo permutar entre especialidades distintas?</h3>
      <p>
        No. La especialidad fundamental forma parte definitoria del puesto.
        Cambiar de especialidad requiere otro proceso (curso de
        especialización, concurso de la especialidad destino), no una
        permuta.
      </p>

      <h3>¿Puede mi capitán o coronel oponerse?</h3>
      <p>
        La asignación de destinos se hace por baremo objetivo en el concurso,
        no por decisión discrecional del mando. Lo que sí puede suceder es
        que un puesto sea declarado &laquo;no apto para permuta&raquo; si la
        unidad considera que el cambio perjudica al servicio; en ese caso la
        denegación tiene que estar motivada y es recurrible.
      </p>

      <h3>¿Y si nos pedimos la plaza pero otro guardia con más antigüedad nos adelanta?</h3>
      <p>
        Puede pasar. El concurso adjudica por antigüedad y méritos, no por
        acuerdo previo. PermutaES solo facilita el encuentro entre
        compañeros; la operación final depende de la baremación. Si las
        antigüedades de ambos son similares y la plaza no es muy demandada,
        normalmente sale.
      </p>

      <h3>¿Hay convenios con otras Fuerzas y Cuerpos de Seguridad?</h3>
      <p>
        No. La Guardia Civil es un cuerpo diferenciado y sus permutas son
        siempre internas. Si quieres pasar a Policía Nacional, Policía Local
        o cualquier otro cuerpo, eso requiere un proceso de oposición o
        movilidad horizontal específico, no una permuta.
      </p>

      <hr />

      <p className="text-sm text-slate-500">
        Más información:{" "}
        <a href="/que-es-una-permuta">¿Qué es una permuta? — Guía general</a>{" "}
        ·{" "}
        <a href="/auto-permutas">Buscar cadenas posibles</a>{" "}
        ·{" "}
        <a href="/registro">Crear tu cuenta</a>.
      </p>
    </main>
  );
}

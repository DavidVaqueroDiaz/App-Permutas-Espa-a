// ISR: pagina estatica de contenido. Se revalida cada hora.
export const revalidate = 3600;

import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title:
    "Permutas en la Policía Nacional — Coordina tu cambio de destino | PermutaES",
  description:
    "Plataforma gratuita para que funcionarios del Cuerpo Nacional de Policía (CNP) encuentren compañeros con destinos opuestos y coordinen el intercambio en sus concursos respectivos. Categorías incluidas, marco legal de la LO 9/2015 y buscador de cadenas.",
  alternates: { canonical: "/permutas/policia-nacional" },
  keywords: [
    "permuta policía nacional",
    "permuta CNP",
    "cambio destino policía",
    "concurso traslados policía nacional",
    "LO 9/2015",
    "escala básica policía",
    "permuta inspector policía",
    "destino comisaría",
  ],
  openGraph: {
    title: "Permutas en la Policía Nacional — PermutaES",
    description:
      "Encuentra compañeros para coordinar el cambio de destino en el CNP.",
    type: "article",
  },
};

const FECHA_REVISION = "2026-05-11";
const URL_CANONICA = `${SITE_URL}/permutas/policia-nacional`;

const SCHEMA_ARTICULO = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "Permutas en la Policía Nacional — Coordina tu cambio de destino",
  description:
    "Guía y buscador para funcionarios del Cuerpo Nacional de Policía que quieren coordinar un intercambio de destino con un compañero.",
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
    name: "Permutas y cambios de destino en el Cuerpo Nacional de Policía",
  },
  keywords:
    "permuta policía nacional, CNP, cambio destino, concurso traslados, LO 9/2015",
};

export default function PermutasPoliciaNacionalPage() {
  return (
    <main className="prose prose-slate mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd data={SCHEMA_ARTICULO} />
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Sector — Cuerpo Nacional de Policía
      </p>
      <h1>Permutas en la Policía Nacional</h1>
      <p className="lead text-lg text-slate-700">
        En el Cuerpo Nacional de Policía la &laquo;permuta&raquo; no aparece
        como figura legal en la LO 9/2015, pero la provisión de destinos por
        concurso permite que dos compañeros se pongan de acuerdo para pedirse
        mutuamente sus plazas. PermutaES es la plataforma gratuita que cruza
        anuncios y detecta esos intercambios posibles (cadenas a 2, 3 o 4
        personas) en toda España.
      </p>

      <p className="text-sm text-slate-500">
        Última revisión: {FECHA_REVISION}. La normativa base es la{" "}
        <strong>Ley Orgánica 9/2015</strong>, de 28 de julio, de Régimen de
        Personal de la Policía Nacional, desarrollada por el{" "}
        <strong>Real Decreto 853/2022</strong>.
      </p>

      <h2>¿Cómo funciona la coordinación entre compañeros?</h2>
      <p>
        La LO 9/2015 regula tres formas de provisión de destinos: concurso
        general de méritos, concurso específico de méritos y libre designación
        (arts. 47-48). La práctica habitual cuando dos funcionarios quieren
        intercambiar plaza es:
      </p>
      <ol>
        <li>
          Cada uno detecta a un compañero con destino opuesto al suyo (o una
          cadena de varios).
        </li>
        <li>
          Cuando se publica el concurso, cada uno solicita el destino actual
          del otro como primera preferencia.
        </li>
        <li>
          Si la puntuación de ambos lo permite y no hay otro funcionario con
          más derecho, la Dirección General de la Policía adjudica los
          destinos cruzados.
        </li>
      </ol>
      <p>
        PermutaES no tramita la solicitud — eso lo hacéis vosotros en el
        concurso — pero sí os ayuda a encontraros. La parte difícil suele ser
        precisamente esa: identificar al compañero con la preferencia
        complementaria a la vuestra.
      </p>

      <h2>Escalas y categorías incluidas</h2>
      <p>
        PermutaES cubre las <strong>7 categorías</strong> de la Policía
        Nacional según la LO 9/2015 (art. 17), agrupadas en sus 4 escalas:
      </p>
      <table>
        <thead>
          <tr>
            <th>Escala</th>
            <th>Categoría</th>
            <th>Grupo EBEP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowSpan={2}>Básica</td>
            <td>Policía</td>
            <td>C1</td>
          </tr>
          <tr>
            <td>Oficial de Policía</td>
            <td>C1</td>
          </tr>
          <tr>
            <td>Subinspección</td>
            <td>Subinspector</td>
            <td>A2</td>
          </tr>
          <tr>
            <td rowSpan={2}>Ejecutiva</td>
            <td>Inspector</td>
            <td>A2</td>
          </tr>
          <tr>
            <td>Inspector Jefe</td>
            <td>A2</td>
          </tr>
          <tr>
            <td rowSpan={2}>Superior</td>
            <td>Comisario</td>
            <td>A1</td>
          </tr>
          <tr>
            <td>Comisario Principal</td>
            <td>A1</td>
          </tr>
        </tbody>
      </table>
      <p>
        La permuta siempre se produce <strong>dentro de la misma categoría</strong>:
        un Policía solo coordina con otro Policía, un Inspector con otro
        Inspector. No es posible cruzar categorías distintas.
      </p>

      <h2>Áreas de actividad</h2>
      <p>
        La LO 9/2015 (art. 20) reconoce 8 áreas de actividad: Seguridad
        Ciudadana, Información, Policía Judicial, Extranjería y Fronteras,
        Policía Científica, Documentación, Cooperación Internacional, y
        Dirección y Coordinación. Estas áreas son <strong>transversales</strong>:
        un mismo funcionario puede pasar por varias a lo largo de su carrera
        sin cambiar de destino. Por eso, en PermutaES, los anuncios del CNP no
        exigen indicar área. Si para tu caso es relevante, ponlo en las
        observaciones del anuncio.
      </p>

      <h2>Requisitos prácticos habituales</h2>
      <p>
        La LO 9/2015 (art. 48) exige <strong>cumplir el tiempo mínimo de
        permanencia</strong> en el destino anterior antes de poder concursar a
        otro. Ese tiempo lo fija la convocatoria de cada concurso. Además, la
        situación administrativa del funcionario tiene que ser la de servicio
        activo en el destino que se pretende permutar.
      </p>
      <p>
        Los detalles concretos (puntuaciones mínimas, méritos baremables,
        plazos) varían en cada convocatoria. Antes de tramitar una permuta
        coordinada, te recomendamos consultar las{" "}
        <strong>bases del concurso vigente</strong> y, si tienes dudas, hablar
        con tu sindicato o con la Dirección General de la Policía.
      </p>

      <h2>Permutas a 2, 3 o 4 personas</h2>
      <p>
        La forma más sencilla es la permuta directa entre dos compañeros, pero
        PermutaES también detecta cadenas más largas:
      </p>
      <ul>
        <li>
          <strong>Permuta directa (a 2)</strong>: A quiere ir a Sevilla, B
          quiere ir a la plaza de A. Se pide mutuamente y, si la puntuación
          encaja, salen los dos.
        </li>
        <li>
          <strong>Cadena a 3</strong>: A → B → C → A. Tres personas que se
          mueven en ciclo, cada una a la plaza de la siguiente.
        </li>
        <li>
          <strong>Cadena a 4</strong>: longitud máxima que la app busca. Más
          allá la coordinación operativa entre 5 o más funcionarios resulta
          poco viable.
        </li>
      </ul>

      <p className="!mt-8">
        <a
          href="/auto-permutas"
          className="inline-flex items-center gap-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold !text-white !no-underline hover:bg-brand-dark"
        >
          Buscar cadenas en la Policía Nacional →
        </a>
      </p>

      <h2>Preguntas frecuentes</h2>

      <h3>¿La permuta está reconocida por la Dirección General de la Policía?</h3>
      <p>
        No como figura específica con ese nombre. Lo que la normativa reconoce
        es el concurso de provisión de destinos. La coordinación entre dos
        compañeros que se pidan mutuamente la plaza es válida siempre que se
        cumplan los requisitos del concurso.
      </p>

      <h3>¿Puedo permutar si estoy en comisión de servicios?</h3>
      <p>
        La permuta exige tener un destino definitivo. Si tu destino actual es
        provisional, una comisión, o estás en situación distinta a la de
        servicio activo, no es posible coordinar el intercambio hasta que la
        situación administrativa sea estable.
      </p>

      <h3>¿Y si nos pedimos la plaza pero alguien con más puntuación nos &laquo;adelanta&raquo;?</h3>
      <p>
        Puede pasar. El concurso adjudica por puntuación, no por acuerdo
        previo. Por eso PermutaES sólo facilita el encuentro; la operación
        final depende de la baremación. Si las puntuaciones de ambos están
        razonablemente cerca y las plazas no son muy demandadas, suele salir.
      </p>

      <h3>¿La diferencia de antigüedad importa?</h3>
      <p>
        En el CNP el concurso baremea antigüedad como mérito, pero no hay un
        tope fijo de diferencia entre compañeros que quieren intercambiar
        plaza. A mayor antigüedad, mayor probabilidad de obtener la plaza
        deseada.
      </p>

      <h3>¿Sirve esto también para Policía Local?</h3>
      <p>
        No. La Policía Local se rige por las leyes autonómicas de
        Coordinación. PermutaES tiene un sector separado para ella, con su
        propia regulación. Las dos no se cruzan.
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

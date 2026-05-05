import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title:
    "Permutas docentes en España — Guía y buscador para profesorado LOE",
  description:
    "Permutas para profesorado de enseñanza no universitaria (cuerpos docentes LOE) en España: requisitos del Real Decreto 1834/2008 y normativa autonómica, especialidades por cuerpo, proceso completo y buscador de cadenas a 2, 3 y 4.",
  alternates: { canonical: "/permutas/docentes" },
  keywords: [
    "permuta docente",
    "permuta profesorado",
    "permuta maestro",
    "permuta secundaria",
    "permuta FP",
    "permuta entre comunidades autónomas docente",
    "real decreto 1834/2008",
    "cuerpos LOE",
  ],
  openGraph: {
    title: "Permutas docentes en España — PermutaES",
    description:
      "Guía y buscador de cadenas para el profesorado de cuerpos LOE.",
    type: "article",
  },
};

const FECHA_REVISION = "2026-05-05";
const URL_CANONICA = "https://permutaes.vercel.app/permutas/docentes";

const SCHEMA_ARTICULO = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "Permutas docentes en España — Guía y buscador para profesorado LOE",
  description:
    "Permutas para profesorado LOE en España: requisitos legales, cuerpos y especialidades, proceso, casos prácticos.",
  inLanguage: "es-ES",
  datePublished: FECHA_REVISION,
  dateModified: FECHA_REVISION,
  author: { "@type": "Organization", name: "PermutaES" },
  publisher: {
    "@type": "Organization",
    name: "PermutaES",
    url: "https://permutaes.vercel.app",
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": URL_CANONICA },
  about: {
    "@type": "Thing",
    name: "Permutas de funcionarios docentes en España",
  },
  keywords:
    "permuta docente, permuta profesorado, cuerpos LOE, RD 1834/2008, profesorado funcionario",
};

export default function PermutasDocentesPage() {
  return (
    <main className="prose prose-slate mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <JsonLd data={SCHEMA_ARTICULO} />
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Sector — Profesorado LOE
      </p>
      <h1>Permutas docentes en España</h1>
      <p className="lead text-lg text-slate-700">
        El profesorado de enseñanza no universitaria es el colectivo que más
        utiliza la figura de la permuta en España. PermutaES es una plataforma
        gratuita que cruza automáticamente los anuncios de funcionarios
        docentes y detecta las cadenas posibles a 2, 3 y 4 personas, en todas
        las comunidades autónomas.
      </p>

      <p className="text-sm text-slate-500">
        Última revisión: {FECHA_REVISION}. La regulación general de las
        permutas docentes está en el Real Decreto 1834/2008 (que aprueba los
        cuerpos docentes LOE) y en las normativas autonómicas que la
        desarrollan.
      </p>

      <h2>Marco legal en una página</h2>
      <p>
        La normativa básica es el{" "}
        <strong>Real Decreto 1834/2008, de 8 de noviembre</strong>, que define
        los cuerpos y especialidades docentes LOE. Sobre esa base, cada
        Comunidad Autónoma desarrolla su propio procedimiento de permuta a
        través de:
      </p>
      <ul>
        <li>
          Resoluciones o instrucciones anuales de las consejerías de Educación.
        </li>
        <li>
          Convenios de reciprocidad entre comunidades para permutas
          interterritoriales.
        </li>
        <li>
          Acuerdos del Ministerio de Educación cuando la permuta involucra a
          territorio MEC (Ceuta, Melilla, exterior).
        </li>
      </ul>
      <p>
        En la práctica, una permuta docente entre Madrid y Andalucía, por
        ejemplo, requiere la autorización conjunta de ambas administraciones
        autonómicas, no del Estado.
      </p>

      <h2>Cuerpos docentes incluidos</h2>
      <p>
        PermutaES, en su fase actual, cubre los siguientes cuerpos LOE
        principales:
      </p>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Cuerpo</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>590</td>
            <td>Profesores de Enseñanza Secundaria</td>
          </tr>
          <tr>
            <td>591</td>
            <td>Profesores Técnicos de Formación Profesional</td>
          </tr>
          <tr>
            <td>592</td>
            <td>Profesores de Escuelas Oficiales de Idiomas</td>
          </tr>
          <tr>
            <td>593</td>
            <td>Catedráticos de Música y Artes Escénicas</td>
          </tr>
          <tr>
            <td>594</td>
            <td>Profesores de Música y Artes Escénicas</td>
          </tr>
          <tr>
            <td>595</td>
            <td>Profesores de Artes Plásticas y Diseño</td>
          </tr>
          <tr>
            <td>596</td>
            <td>Maestros de Taller de Artes Plásticas y Diseño</td>
          </tr>
          <tr>
            <td>597</td>
            <td>Maestros (Educación Infantil y Primaria)</td>
          </tr>
          <tr>
            <td>598</td>
            <td>Profesores Especialistas en Sectores Singulares de FP</td>
          </tr>
        </tbody>
      </table>
      <p>
        Cada uno tiene un catálogo propio de especialidades. La permuta se
        produce siempre <strong>dentro del mismo cuerpo y la misma
        especialidad</strong>: una maestra de Inglés (597-031) solo permuta con
        otro maestro de Inglés.
      </p>

      <h2>Requisitos legales habituales</h2>
      <p>
        Las consejerías exigen, de forma común, estos requisitos a quienes
        permutan:
      </p>
      <ol>
        <li>
          Ser funcionario de carrera en el mismo cuerpo y especialidad.
        </li>
        <li>
          Tener destino definitivo (no provisional, no en comisión de
          servicios).
        </li>
        <li>
          Haber permanecido <strong>al menos dos años</strong> en el destino
          actual antes de solicitar la permuta.
        </li>
        <li>
          Que la diferencia de antigüedad entre los dos funcionarios{" "}
          <strong>no supere los 5 años de servicios efectivos</strong>.
        </li>
        <li>
          Que ambos tengan <strong>al menos 10 años</strong> hasta su
          jubilación forzosa (65 con Clases Pasivas o 67 con Régimen General,
          según el caso).
        </li>
        <li>
          No haber permutado en los <strong>10 años anteriores</strong>.
        </li>
        <li>
          Compromiso de permanecer en el nuevo destino el mismo tiempo mínimo
          que ya exigía el destino anterior.
        </li>
      </ol>
      <p>
        PermutaES filtra las cadenas por sector, cuerpo, especialidad y ámbito
        geográfico (en docencia LOE el ámbito es nacional). Las verificaciones
        personales (antigüedad concreta, fecha de jubilación) las haces tú
        antes de tramitar — son datos que dependen de tu expediente y que la
        app no tiene.
      </p>

      <h2>Proceso paso a paso</h2>
      <ol>
        <li>
          <strong>Crea tu cuenta</strong> y publica tu anuncio en PermutaES
          indicando: cuerpo, especialidad, plaza actual y municipios a los
          que aceptarías ir.
        </li>
        <li>
          La app cruza tu perfil con todos los demás anuncios y te muestra las{" "}
          <strong>cadenas detectadas</strong> (directas, a 3, a 4) que cumplen
          los requisitos profesionales y geográficos.
        </li>
        <li>
          <strong>Contactas con las personas implicadas</strong> a través de la
          mensajería interna de PermutaES. La identidad real solo se comparte
          cuando ambas partes lo deciden.
        </li>
        <li>
          Una vez de acuerdo, todos los participantes presentan la{" "}
          <strong>solicitud formal de permuta</strong> ante su consejería de
          Educación o, si hay administraciones distintas, ante todas las
          implicadas.
        </li>
        <li>
          Las administraciones estudian la solicitud, comprueban requisitos y
          dictan la resolución. Si es favorable, se publica en el boletín
          oficial correspondiente.
        </li>
        <li>
          Tomáis posesión en vuestros nuevos destinos en la fecha indicada por
          la resolución, normalmente al inicio del curso siguiente.
        </li>
      </ol>

      <h2>Permutas dentro de la misma comunidad o entre comunidades</h2>
      <p>
        Las permutas docentes pueden ser:
      </p>
      <ul>
        <li>
          <strong>Intraautonómicas</strong>: entre dos plazas de la misma
          comunidad autónoma. Resuelve la consejería competente de esa CCAA.
        </li>
        <li>
          <strong>Interautonómicas</strong>: entre plazas de comunidades
          distintas. Requieren que ambas consejerías acuerden la permuta. En
          la práctica suele haber convenios de reciprocidad o resoluciones
          conjuntas.
        </li>
        <li>
          <strong>Con territorio MEC</strong> (Ceuta, Melilla, programas
          exteriores): tramita el Ministerio.
        </li>
      </ul>
      <p>
        PermutaES no distingue tipos: detecta cualquier cadena legal posible y
        deja que tú decidas. Si la cadena cruza varias administraciones, te
        avisamos en la ficha de la cadena.
      </p>

      <h2>Casos prácticos</h2>

      <h3>Cadena directa</h3>
      <p>
        Maestro de Inglés con plaza en Murcia que querría ir a Cádiz; maestra
        de Inglés con plaza en Cádiz que querría ir a Murcia. Cumplen
        antigüedad y demás. Solicitan la permuta directa a sus consejerías
        respectivas y, si hay convenio entre ambas, se resuelve en una sola
        operación.
      </p>

      <h3>Cadena a 3</h3>
      <p>
        A en Sevilla quiere ir a Vigo. B en Vigo quiere ir a Bilbao. C en
        Bilbao quiere ir a Sevilla. Forman un ciclo. Las tres tramitan
        simultáneamente y, si todo cuadra, se mueven a la vez. La
        coordinación es más compleja pero en el sector docente es
        relativamente frecuente.
      </p>

      <h3>Cadena a 4</h3>
      <p>
        Cuatro personas en cuatro provincias distintas que se mueven en ciclo.
        Es la longitud máxima que PermutaES busca. Más allá no es operativo.
      </p>

      <p className="!mt-8">
        <a
          href="/auto-permutas"
          className="inline-flex items-center gap-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold !text-white !no-underline hover:bg-brand-dark"
        >
          Buscar cadenas docentes ahora →
        </a>
      </p>

      <h2>Preguntas frecuentes específicas del sector</h2>

      <h3>¿Mi consejería puede denegar la permuta aun cumpliendo todo?</h3>
      <p>
        Sí, por <strong>razones de servicio</strong>: si tu plaza es de
        difícil cobertura, si la administración entiende que la permuta
        perjudica al centro receptor o por circunstancias excepcionales. Las
        denegaciones motivadas son recurribles.
      </p>

      <h3>¿Puedo permutar entre niveles educativos distintos?</h3>
      <p>
        No: la permuta exige el mismo cuerpo y la misma especialidad. Una
        maestra (cuerpo 597) no permuta con un profesor de Secundaria (590)
        aunque ambos den Lengua. Lo mismo ocurre con FP, EOI, etc.
      </p>

      <h3>¿Vale la afín o equivalente?</h3>
      <p>
        Depende del caso y de la consejería. En general, la regla es{" "}
        <strong>misma especialidad oficial</strong>. La afinidad solo se
        admite en supuestos muy concretos (especialidades reorganizadas,
        habilitaciones equivalentes) y previa autorización expresa.
      </p>

      <h3>¿Pierdo el bilingüismo o las habilitaciones específicas?</h3>
      <p>
        La habilitación que tú tengas (bilingüe, atención a la diversidad,
        etc.) sigue contigo. Otra cosa es que el centro de destino tenga o
        no esa especificidad.
      </p>

      <h3>¿Las CCAA con lengua cooficial tienen restricciones especiales?</h3>
      <p>
        Algunas comunidades (Cataluña, País Vasco, Galicia, Comunidad
        Valenciana, Baleares) exigen acreditar competencia lingüística en la
        lengua cooficial para acceder a sus plazas. Si quieres permutar a una
        de ellas, comprueba antes si tu titulación cumple los requisitos.
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

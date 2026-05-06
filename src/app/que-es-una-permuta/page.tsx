import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title:
    "¿Qué es una permuta de plaza entre funcionarios? — Guía completa 2026",
  description:
    "Explicación clara y práctica de qué es una permuta de plaza para funcionarios públicos en España: requisitos legales, sectores admitidos, cadenas a 2, 3 y 4 personas, y cómo tramitarla paso a paso.",
  alternates: { canonical: "/que-es-una-permuta" },
  keywords: [
    "qué es una permuta",
    "permuta funcionario",
    "permuta de plaza",
    "intercambio plaza funcionario",
    "cadena permuta",
    "permuta docente",
    "permuta sanitario",
  ],
  openGraph: {
    title: "¿Qué es una permuta entre funcionarios? — PermutaES",
    description:
      "Guía completa sobre permutas de plaza para funcionarios públicos en España.",
    type: "article",
  },
};

const FECHA_REVISION = "2026-05-05";
const URL_CANONICA = "https://permutaes.vercel.app/que-es-una-permuta";

const SCHEMA_ARTICULO = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "¿Qué es una permuta de plaza entre funcionarios? — Guía completa 2026",
  description:
    "Explicación clara y práctica de qué es una permuta de plaza para funcionarios públicos en España.",
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
};

export default function QueEsUnaPermutaPage() {
  return (
    <main className="prose prose-slate mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd data={SCHEMA_ARTICULO} />
      <p className="text-xs uppercase tracking-wide text-slate-500">Guía</p>
      <h1>¿Qué es una permuta de plaza entre funcionarios?</h1>
      <p className="lead text-lg text-slate-700">
        Una <strong>permuta</strong> es el intercambio de la plaza de destino
        entre dos funcionarios públicos que cumplen los mismos requisitos
        profesionales, pero que ocupan plazas en localidades distintas. Es un
        derecho recogido en la normativa española y permite a los funcionarios
        acercarse a su lugar de residencia o reagrupar su unidad familiar sin
        renunciar a su condición funcionarial.
      </p>

      <p className="text-sm text-slate-500">
        Última revisión: {FECHA_REVISION}. Este artículo describe el régimen
        general; cada sector tiene reglas específicas en su normativa propia.
      </p>

      <h2>Idea básica en 30 segundos</h2>
      <p>
        Imagina dos profesoras de Lengua: una tiene plaza en Murcia y querría
        irse a Cádiz; otra tiene plaza en Cádiz y querría irse a Murcia. Si las
        dos cumplen los requisitos legales (misma especialidad, antigüedad
        compatible, etc.), pueden{" "}
        <strong>intercambiar sus plazas de forma definitiva</strong>. Ninguna
        pierde antigüedad ni vínculo laboral; simplemente cambian de destino.
      </p>
      <p>
        Cuando además aparece una tercera persona en Sevilla que quiere ir a
        Murcia y la primera está dispuesta a moverse a Sevilla, hablamos de una{" "}
        <strong>cadena a 3</strong>: tres personas se mueven simultáneamente.
        Lo mismo pasa con cadenas a 4. PermutaES detecta este tipo de ciclos
        automáticamente.
      </p>

      <h2>¿Qué funcionarios pueden permutar?</h2>
      <p>
        En España, la posibilidad de permutar está expresamente regulada para
        siete grupos de funcionarios:
      </p>
      <ul>
        <li>
          <strong>Profesorado de enseñanza no universitaria</strong> (cuerpos
          docentes LOE: maestros, secundaria, FP, EOI, conservatorios, artes
          plásticas, deportes). Es el sector con más volumen de permutas en
          España.
        </li>
        <li>
          <strong>Personal estatutario de los Servicios de Salud</strong>{" "}
          (categorías sanitarias del SNS, intra-Servicio de Salud).
        </li>
        <li>
          <strong>Funcionarios de la Administración General del Estado</strong>{" "}
          (cuerpos AGE, ámbito nacional).
        </li>
        <li>
          <strong>Funcionarios de las Comunidades Autónomas</strong> (intra-CCAA
          en general).
        </li>
        <li>
          <strong>Funcionarios de Administración Local</strong> (entre
          ayuntamientos).
        </li>
        <li>
          <strong>Funcionarios con habilitación nacional</strong>{" "}
          (secretarios, interventores, tesoreros).
        </li>
        <li>
          <strong>Policía Local</strong> en las CCAA con regulación expresa.
        </li>
      </ul>
      <p>
        Quedan fuera los cuerpos en los que la legislación no contempla la
        permuta (jueces, militares, Guardia Civil y Policía Nacional, entre
        otros).
      </p>

      <h2>Requisitos legales generales</h2>
      <p>
        Aunque cada sector tiene su propia normativa, existen unos requisitos
        comunes que la mayoría de regulaciones recoge:
      </p>
      <ul>
        <li>
          Ambas personas deben pertenecer al{" "}
          <strong>mismo cuerpo y especialidad</strong> (o categoría profesional
          equivalente).
        </li>
        <li>
          Deben tener una <strong>diferencia de antigüedad limitada</strong> —
          típicamente ±5 años en activo.
        </li>
        <li>
          Deben quedar <strong>al menos 10 años</strong> hasta la jubilación
          forzosa de cualquiera de los dos (para evitar permutas ficticias antes
          de retirarse).
        </li>
        <li>
          Quien permuta debe llevar un <strong>tiempo mínimo en su destino
          actual</strong>, normalmente 2 años, antes de poder solicitar.
        </li>
        <li>
          Suele exigirse una <strong>carencia de 10 años</strong> desde la
          última permuta concedida.
        </li>
        <li>
          La permuta debe ser <strong>autorizada por la administración</strong>{" "}
          competente, que puede denegarla por razones de servicio.
        </li>
      </ul>
      <p>
        En PermutaES filtramos automáticamente los cruces que no cumplen los
        requisitos profesionales y geográficos. Las verificaciones personales
        (jubilación, antigüedad, etc.) las haces tú con tus datos antes de
        tramitar.
      </p>

      <h2>Permuta directa, a 3 y a 4: las cadenas</h2>
      <p>
        Lo más natural es la <strong>permuta directa</strong> (entre dos
        personas), pero a menudo no hay nadie que quiera el cambio exacto que
        tú propones. Aquí entran las <strong>cadenas</strong>:
      </p>
      <ul>
        <li>
          <strong>Cadena de 2 (directa):</strong> A quiere ir a B; B quiere ir
          a A. Intercambian.
        </li>
        <li>
          <strong>Cadena de 3:</strong> A → B → C → A. Tres personas que se
          mueven simultáneamente formando un ciclo.
        </li>
        <li>
          <strong>Cadena de 4:</strong> A → B → C → D → A. Cuatro personas en
          ciclo.
        </li>
      </ul>
      <p>
        Cuanto más larga es la cadena, más complicado es coordinarla, pero
        también más oportunidades hay de que el destino de cada persona se
        ajuste exactamente a lo que busca. PermutaES detecta cadenas hasta
        longitud 4 (más allá es inmanejable en la práctica).
      </p>

      <h2>Pasos para tramitar una permuta</h2>
      <ol>
        <li>
          <strong>Encuentras a la otra parte</strong> (o partes, en cadenas).
          Aquí es donde te ayuda PermutaES: cruzamos automáticamente los
          anuncios publicados y te avisamos de las cadenas posibles.
        </li>
        <li>
          <strong>Comprobáis que cumplís los requisitos legales</strong> entre
          todos los participantes (antigüedad, jubilación, etc.).
        </li>
        <li>
          <strong>Solicitáis formalmente la permuta</strong> a la administración
          que os corresponda (ministerio, consejería, ayuntamiento, servicio de
          salud).
        </li>
        <li>
          La administración estudia el caso y, si procede, dicta la resolución.
        </li>
        <li>
          Tomáis posesión en vuestros nuevos destinos en la fecha que indique la
          resolución.
        </li>
      </ol>

      <h2>¿Qué hace PermutaES por ti?</h2>
      <p>
        PermutaES es una <strong>plataforma gratuita</strong> sin ánimo de
        lucro que conecta funcionarios que quieren permutar. No tramita la
        permuta por ti (eso lo hace la administración) — lo que hace es:
      </p>
      <ul>
        <li>Permite publicar tu anuncio en pocos minutos.</li>
        <li>Cruza tu perfil con todos los demás anuncios activos.</li>
        <li>
          Detecta automáticamente cadenas posibles (directas, a 3 y a 4) que
          cumplan los requisitos profesionales y geográficos.
        </li>
        <li>
          Te facilita una mensajería interna para hablar con los demás
          participantes y cerrar los detalles.
        </li>
      </ul>

      <p className="!mt-8">
        <a
          href="/auto-permutas"
          className="inline-flex items-center gap-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold !text-white !no-underline hover:bg-brand-dark"
        >
          Buscar permutas ahora →
        </a>
      </p>

      <h2>Preguntas frecuentes</h2>

      <h3>¿La permuta es definitiva o se puede deshacer?</h3>
      <p>
        En el régimen general, la permuta es <strong>definitiva</strong>. Una
        vez concedida y formalizada la toma de posesión, las plazas pasan a ser
        las nuevas a todos los efectos. Algunas administraciones contemplan
        excepciones o anulaciones por causas tasadas, pero son muy raras.
      </p>

      <h3>¿Pierdo antigüedad si permuto?</h3>
      <p>
        No. La antigüedad como funcionario se conserva intacta; lo único que
        cambia es tu plaza física. Sí cambia, en cambio, tu fecha de toma de
        posesión en el destino concreto, lo que puede afectar a futuras
        solicitudes (por ejemplo, el plazo de 2 años antes de poder volver a
        permutar).
      </p>

      <h3>¿Hay que pagar tasas?</h3>
      <p>
        Las administraciones no suelen cobrar por tramitar permutas. Sí pueden
        existir gastos asociados al traslado (mudanza, cambio de residencia)
        que corren por cuenta de cada interesado.
      </p>

      <h3>¿Y si soy interino o temporal?</h3>
      <p>
        La permuta es una figura propia del personal{" "}
        <strong>fijo y con plaza definitiva</strong>. Quien tiene un destino
        provisional (en comisión de servicios, expectativa, etc.) o es
        interino no puede permutar en sentido estricto. PermutaES, en su Fase
        1, está pensado precisamente para personal con plaza definitiva.
      </p>

      <h3>¿Puede haber más de 4 personas en una cadena?</h3>
      <p>
        Técnicamente sí, pero en la práctica cadenas de 5 o más son
        inmanejables: requieren coordinar muchas voluntades a la vez y
        cualquier baja rompe la cadena entera. PermutaES limita la búsqueda
        a longitud 4 por motivos prácticos.
      </p>

      <h3>¿Cuánto suele tardar una permuta?</h3>
      <p>
        Desde que se solicita formalmente hasta la resolución suelen pasar de
        3 a 12 meses, dependiendo del sector y de la administración. La fase
        más larga normalmente es <em>encontrar</em> a la otra parte; la
        tramitación administrativa, una vez localizada, va más rápido.
      </p>

      <hr />

      <p className="text-sm text-slate-500">
        ¿Quieres profundizar?{" "}
        <a href="/permutas/docentes">
          Guía específica de permutas docentes
        </a>{" "}
        ·{" "}
        <a href="/auto-permutas">Buscar cadenas posibles ahora</a>{" "}
        ·{" "}
        <a href="/registro">Crear tu cuenta y publicar un anuncio</a>.
      </p>
    </main>
  );
}

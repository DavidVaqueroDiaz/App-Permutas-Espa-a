import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title:
    "Preguntas frecuentes — PermutaES, permutas de plaza para funcionarios",
  description:
    "Respuestas claras a las dudas más habituales sobre permutas de plaza entre funcionarios públicos en España: qué son, quién puede permutar, cadenas, requisitos legales, mensajería interna, privacidad y proceso completo.",
  alternates: { canonical: "/preguntas-frecuentes" },
  keywords: [
    "permuta funcionario preguntas frecuentes",
    "FAQ permuta",
    "dudas permuta plaza",
    "cómo funciona permuta",
    "PermutaES preguntas",
  ],
  openGraph: {
    title: "Preguntas frecuentes sobre permutas — PermutaES",
    description:
      "Respuestas a las dudas más habituales sobre permutas de plaza para funcionarios.",
    type: "article",
  },
};

const FECHA_REVISION = "2026-05-05";

/**
 * Banco central de FAQs. Se renderiza en HTML accesible y se inyecta
 * también como `FAQPage` Schema.org (JSON-LD) para que Google pueda
 * mostrar rich results y los asistentes de IA tengan contenido
 * estructurado claro.
 */
type Pregunta = { q: string; a: string; idAncla: string };
type Seccion = { titulo: string; preguntas: Pregunta[] };

const SECCIONES: Seccion[] = [
  {
    titulo: "Sobre las permutas en general",
    preguntas: [
      {
        idAncla: "que-es-permuta",
        q: "¿Qué es una permuta de plaza?",
        a: "Es el intercambio de la plaza de destino entre dos funcionarios públicos del mismo cuerpo y especialidad. Ambos conservan su condición de funcionario, su antigüedad y su grado; solo cambia el lugar físico donde prestan servicio. La permuta requiere autorización de la administración competente.",
      },
      {
        idAncla: "quienes-pueden",
        q: "¿Quién puede permutar?",
        a: "Los funcionarios de carrera con destino definitivo en cuerpos donde la normativa lo contempla expresamente: profesorado de enseñanza no universitaria (cuerpos LOE), personal estatutario de los Servicios de Salud, funcionarios de la Administración General del Estado, funcionarios autonómicos, funcionarios de Administración Local, habilitados nacionales y, en ciertas comunidades, Policía Local. Quedan fuera jueces, militares, Guardia Civil y Policía Nacional, entre otros.",
      },
      {
        idAncla: "interinos",
        q: "Soy interino o estoy en comisión de servicios. ¿Puedo permutar?",
        a: "No. La permuta es una figura propia del personal con destino definitivo. Si tu plaza actual es provisional (interinidad, comisión de servicios, expectativa de destino), tienes que consolidar tu destino primero. PermutaES, en su Fase 1, está pensado para personal con plaza definitiva.",
      },
      {
        idAncla: "diferencia-traslado",
        q: "¿En qué se diferencia una permuta de un concurso de traslados?",
        a: "El concurso de traslados lo convoca la administración periódicamente y se rige por baremos (puntos por antigüedad, méritos, etc.). La permuta es un intercambio bilateral o multilateral entre funcionarios concretos, fuera de los concursos, sin necesidad de baremo: solo se exige que los implicados cumplan ciertos requisitos legales.",
      },
    ],
  },
  {
    titulo: "Cadenas a 2, 3 y 4",
    preguntas: [
      {
        idAncla: "que-es-cadena",
        q: "¿Qué es una cadena de permutas?",
        a: "Una cadena es un ciclo en el que varias personas se mueven simultáneamente: A va a la plaza de B, B va a la plaza de C, y C va a la plaza de A. Si participan dos personas se llama permuta directa (cadena de 2); si tres, cadena de 3; si cuatro, cadena de 4. Todas las personas deben estar de acuerdo y todas tramitan a la vez.",
      },
      {
        idAncla: "limite-cadena",
        q: "¿Por qué PermutaES no busca cadenas de 5 o más?",
        a: "Coordinar a 5 o más personas para que tramiten una permuta simultánea es prácticamente imposible: cualquier baja rompe la cadena entera. Las administraciones, además, suelen limitar el número de partes implicadas. Por eso PermutaES limita la búsqueda a cadenas de longitud 2, 3 y 4.",
      },
      {
        idAncla: "ventaja-cadena-larga",
        q: "¿Es mejor una permuta directa o una cadena más larga?",
        a: "Las directas son más fáciles de tramitar (menos personas, menos burocracia). Las cadenas a 3 o 4 abren más posibilidades cuando no hay nadie que quiera el intercambio exacto que tú propones. PermutaES marca con una estrella la mejor coincidencia disponible y muestra el porcentaje de compatibilidad para que tú decidas.",
      },
    ],
  },
  {
    titulo: "Cómo funciona PermutaES",
    preguntas: [
      {
        idAncla: "registro-necesario",
        q: "¿Tengo que registrarme para usar PermutaES?",
        a: "No para buscar. Cualquier persona puede entrar en /auto-permutas, definir su perfil y ver las cadenas detectadas sin crear cuenta. El registro solo es necesario si quieres publicar tu propio anuncio o contactar con otros participantes.",
      },
      {
        idAncla: "que-cuesta",
        q: "¿Cuánto cuesta usar PermutaES?",
        a: "Es 100% gratuito. PermutaES es un proyecto sin ánimo de lucro y no contempla monetización en su fase inicial. Si en el futuro hubiera algún coste asociado, sería opcional y se anunciaría con claridad antes.",
      },
      {
        idAncla: "como-publico-anuncio",
        q: "¿Cómo publico mi anuncio?",
        a: "Una vez registrado, pulsa en \"+ Publicar anuncio\" y rellena el wizard de 8 pasos: sector, cuerpo, especialidad, plaza actual, municipios a los que aceptarías ir (incluyendo selector visual sobre el mapa), datos legales para validar reglas, observaciones libres y revisión final. Tarda unos minutos.",
      },
      {
        idAncla: "renovar-anuncio",
        q: "¿Caducan los anuncios?",
        a: "Sí, cada anuncio caduca a los 6 meses de publicación. Recibirás un aviso por email antes de la fecha y podrás renovarlo con un solo clic si sigues interesado. Si no, el anuncio se desactiva automáticamente.",
      },
      {
        idAncla: "editar-anuncio",
        q: "¿Puedo editar o eliminar mi anuncio?",
        a: "Sí, en cualquier momento. Entra en \"Mis anuncios\" desde tu cuenta y verás todos los que tengas activos. Puedes editar cualquier campo (incluida la lista de plazas deseadas) o eliminarlo del todo. Si lo eliminas, también se borra de las cadenas detectadas.",
      },
    ],
  },
  {
    titulo: "Requisitos legales",
    preguntas: [
      {
        idAncla: "antiguedad",
        q: "¿Hay una diferencia máxima de antigüedad entre los que permutan?",
        a: "Sí, normalmente ±5 años de servicios efectivos. Es uno de los requisitos clásicos para evitar permutas que serían un agravio comparativo (alguien con 30 años intercambiando con alguien con 3). Cada sector concreta su umbral en su normativa.",
      },
      {
        idAncla: "tiempo-en-destino",
        q: "¿Tengo que llevar un tiempo mínimo en mi destino actual?",
        a: "Habitualmente sí: la mayoría de regulaciones exigen al menos 2 años de permanencia en el destino actual antes de poder solicitar permuta. Esto es para evitar que se use la permuta como mecanismo de tránsito rápido entre destinos.",
      },
      {
        idAncla: "anos-jubilacion",
        q: "¿Puedo permutar si me quedan pocos años hasta la jubilación?",
        a: "No. La regla común es que ambos solicitantes deben tener al menos 10 años hasta la jubilación forzosa. La edad de jubilación es 65 años para Clases Pasivas (funcionarios anteriores a 2011) o 67 para Régimen General (posteriores). Si te faltan menos de 10 años, la administración denegará la permuta.",
      },
      {
        idAncla: "carencia-permutas",
        q: "¿Hay un periodo de carencia entre permutas?",
        a: "Sí: la mayoría de normativas exigen que hayan pasado al menos 10 años desde tu última permuta antes de solicitar otra nueva. Es una medida para evitar abusos del sistema.",
      },
      {
        idAncla: "denegacion",
        q: "¿La administración puede denegar la permuta?",
        a: "Sí, por razones tasadas: si la plaza es de difícil cobertura, si la permuta perjudica al servicio, si los solicitantes no cumplen algún requisito, o por causas excepcionales. Las denegaciones deben estar motivadas y son recurribles en vía administrativa y, en su caso, judicial.",
      },
    ],
  },
  {
    titulo: "Mensajería interna y privacidad",
    preguntas: [
      {
        idAncla: "como-contactar",
        q: "¿Cómo contacto con otra persona de la cadena?",
        a: "Desde la ficha de la cadena, pulsa el botón \"Contactar\" del participante con quien quieras hablar. Se abre una conversación 1-on-1 en /mensajes. Cuando recibes un mensaje, te llega también un email de aviso con un enlace directo a la conversación.",
      },
      {
        idAncla: "privacidad-mensajeria",
        q: "¿Quién puede leer mis mensajes?",
        a: "Solo tú y la persona con la que conversas. Las conversaciones están protegidas por Row Level Security en la base de datos: nadie más, ni siquiera el equipo de PermutaES, puede leerlas. La identidad real (nombre, email) solo se comparte si tú la das dentro del chat.",
      },
      {
        idAncla: "retencion-mensajes",
        q: "¿Cuánto tiempo se guardan los mensajes?",
        a: "Los mensajes se conservan durante 2 años desde la fecha del último mensaje en la conversación. Pasado ese plazo, la conversación se borra automáticamente. Este plazo permite retomar contactos antiguos cuando aparece una oportunidad nueva.",
      },
      {
        idAncla: "datos-anuncio-publico",
        q: "¿Qué datos míos se ven en el anuncio?",
        a: "En la vista pública (sin login) solo se ve un alias que tú eliges, el cuerpo y la especialidad, el municipio donde tienes plaza, los municipios a los que aceptarías irte y un texto libre de observaciones (si lo añades). Tu nombre, tu email y tu fecha exacta de nacimiento NO se muestran nunca.",
      },
    ],
  },
  {
    titulo: "Tramitación y resolución",
    preguntas: [
      {
        idAncla: "permutaes-tramita",
        q: "¿PermutaES tramita la permuta por mí?",
        a: "No. PermutaES es solo una plataforma de descubrimiento: te ayuda a encontrar a la otra parte y a comunicarte con ella. La solicitud formal de permuta la presentas tú (junto con los demás participantes) ante la administración competente: tu consejería, tu ministerio o tu servicio de salud, según el sector.",
      },
      {
        idAncla: "documentos",
        q: "¿Qué documentos necesito para solicitar la permuta?",
        a: "Depende de la administración, pero suelen pedir: solicitud formal firmada por todas las partes, certificación de servicios prestados, declaración jurada de no haber permutado en los 10 años anteriores, conformidad de los centros y, si la permuta cruza administraciones distintas, autorización de cada una. El detalle exacto está en la convocatoria o instrucción de tu administración.",
      },
      {
        idAncla: "tiempo-resolver",
        q: "¿Cuánto tarda en resolverse?",
        a: "Desde que se presenta la solicitud hasta la resolución suelen pasar entre 3 y 12 meses. La parte administrativa una vez localizadas las personas implicadas es relativamente rápida; la parte larga normalmente es encontrar a la otra parte (que es justo lo que PermutaES te ayuda a acelerar).",
      },
      {
        idAncla: "deshacer-permuta",
        q: "Una vez concedida, ¿se puede deshacer la permuta?",
        a: "En el régimen general, no. La permuta es definitiva: una vez tomada posesión, las plazas son las nuevas a todos los efectos. Algunas administraciones contemplan revocaciones por causas tasadas y excepcionales, pero son muy raras. Antes de firmar, asegúrate.",
      },
    ],
  },
];

const URL_CANONICA = "https://permutaes.vercel.app/preguntas-frecuentes";

const SCHEMA_FAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  inLanguage: "es-ES",
  url: URL_CANONICA,
  mainEntity: SECCIONES.flatMap((sec) =>
    sec.preguntas.map((p) => ({
      "@type": "Question",
      name: p.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: p.a,
      },
    })),
  ),
};

export default function PreguntasFrecuentesPage() {
  return (
    <main className="prose prose-slate mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <JsonLd data={SCHEMA_FAQ} />
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Preguntas frecuentes
      </p>
      <h1>Preguntas frecuentes sobre permutas</h1>
      <p className="lead text-lg text-slate-700">
        Respuestas a las dudas más habituales sobre permutas de plaza para
        funcionarios públicos en España. Si no encuentras tu pregunta aquí,
        revisa la <a href="/que-es-una-permuta">guía general</a> o la{" "}
        <a href="/permutas/docentes">página específica de permutas docentes</a>.
      </p>

      <p className="text-sm text-slate-500">
        Última revisión: {FECHA_REVISION}.
      </p>

      <nav aria-label="Índice de secciones" className="not-prose my-6 rounded-xl2 border border-slate-200 bg-white p-4 shadow-card">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Secciones
        </p>
        <ul className="space-y-1 text-sm">
          {SECCIONES.map((sec) => {
            const slug = sec.titulo
              .toLowerCase()
              .normalize("NFD")
              .replace(/[̀-ͯ]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");
            return (
              <li key={slug}>
                <a href={`#${slug}`} className="text-brand-text hover:text-brand">
                  {sec.titulo}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {SECCIONES.map((sec) => {
        const slug = sec.titulo
          .toLowerCase()
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        return (
          <section key={slug} id={slug}>
            <h2>{sec.titulo}</h2>
            {sec.preguntas.map((p) => (
              <div key={p.idAncla} id={p.idAncla}>
                <h3>{p.q}</h3>
                <p>{p.a}</p>
              </div>
            ))}
          </section>
        );
      })}

      <hr />

      <p className="text-sm text-slate-500">
        ¿Sigues con dudas?{" "}
        <a href="/que-es-una-permuta">Lee la guía general</a>{" "}
        ·{" "}
        <a href="/permutas/docentes">Detalles del sector docente</a>{" "}
        ·{" "}
        <a href="/auto-permutas">Buscar cadenas posibles ahora</a>{" "}
        ·{" "}
        <a href="/registro">Crear cuenta y publicar un anuncio</a>.
      </p>
    </main>
  );
}

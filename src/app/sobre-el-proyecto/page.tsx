import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Sobre el proyecto — quién está detrás de PermutaES",
  description:
    "Quién hace PermutaES, por qué es gratis y sin ánimo de lucro, cómo se sostiene y a qué se compromete.",
  alternates: { canonical: "/sobre-el-proyecto" },
};

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  inLanguage: "es-ES",
  url: `${SITE_URL}/sobre-el-proyecto`,
  about: {
    "@type": "Organization",
    name: "PermutaES",
    url: SITE_URL,
  },
};

export default function SobreElProyectoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12 prose prose-slate">
      <JsonLd data={SCHEMA} />

      <h1>Sobre el proyecto</h1>
      <p className="text-sm text-slate-500">
        Quién hace PermutaES, por qué, y a qué se compromete con quienes
        deciden usarla.
      </p>

      <h2>Quién está detrás</h2>
      <div className="not-prose flex flex-col gap-4 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card sm:flex-row sm:items-start">
        {/*
          Cuando tengas una foto, sustituye este placeholder por:
            <img
              src="/sobre/david.jpg"
              alt="Foto de David Vaquero"
              className="h-28 w-28 rounded-full object-cover"
            />
          y guarda la imagen en public/sobre/david.jpg
        */}
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-brand-bg text-2xl font-semibold text-brand-text">
          DV
        </div>
        <div>
          <p className="font-head text-lg font-semibold text-brand">
            David Vaquero
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {/* TODO: bio personal de 2-3 frases. Ejemplo provisional: */}
            Construyo PermutaES como proyecto personal, sin ánimo de lucro. La
            idea nació al comprobar que las permutas de plaza entre
            funcionarios funcionaban en la práctica por grupos de WhatsApp y
            foros, sin una herramienta que cruzara automáticamente los
            anuncios. PermutaES intenta ser esa herramienta — gratis,
            transparente y respetuosa con los datos.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            <a
              href="https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-text hover:text-brand"
            >
              GitHub
            </a>
            {" · "}
            <Link
              href="/contacto"
              className="font-medium text-brand-text hover:text-brand"
            >
              Contacto
            </Link>
          </p>
        </div>
      </div>

      <h2>Por qué es gratis</h2>
      <p>
        PermutaES es un proyecto independiente sin ánimo de lucro. No
        cobramos por usarlo, no muestra publicidad, no vende datos a
        terceros. Los costes de servidor (alojamiento web, base de datos
        y envío de emails) son bajos y se asumen como parte del
        proyecto.
      </p>
      <p>
        Si en el futuro la plataforma crece mucho y los costes se
        disparan, lo primero será explicarlo aquí abiertamente y
        plantear opciones (donaciones puntuales, contribuciones de
        organismos públicos interesados, etc.). Nunca habrá publicidad
        ni venta de datos.
      </p>

      <h2>A qué nos comprometemos</h2>
      <ul>
        <li>
          <strong>Transparencia:</strong> el código fuente es público en{" "}
          <a
            href="https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{" "}
          (cualquiera puede auditarlo) y publicamos en{" "}
          <Link href="/status">/status</Link> el estado del servicio en
          tiempo real.
        </li>
        <li>
          <strong>Privacidad:</strong> RGPD completo, datos cifrados en
          tránsito y en reposo, exportar y eliminar cuenta con un click
          desde tu perfil. Detalle completo en la{" "}
          <Link href="/politica-privacidad">política de privacidad</Link>.
        </li>
        <li>
          <strong>No spam:</strong> los emails que enviamos son
          únicamente sobre tu actividad real (cadenas detectadas,
          mensajes recibidos, recordatorios de caducidad de tu anuncio).
          Sin newsletter ni promociones.
        </li>
        <li>
          <strong>Imparcialidad:</strong> no priorizamos a unos usuarios
          sobre otros. El motor de matching solo cruza criterios
          profesionales y geográficos según las normas legales del
          sector.
        </li>
      </ul>

      <h2>Cómo puedes ayudar</h2>
      <ul>
        <li>
          Si conoces a otros funcionarios interesados en permutar,
          mándales el enlace. Cuantos más anuncios haya, más cadenas se
          detectan.
        </li>
        <li>
          Si encuentras un fallo, una errata, o una norma legal mal
          aplicada,{" "}
          <Link href="/contacto" className="font-medium text-brand-text hover:text-brand">
            escríbenos
          </Link>{" "}
          o abre un{" "}
          <a
            href="https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            issue en GitHub
          </a>
          .
        </li>
        <li>
          Si te dedicas a relaciones laborales, sindicatos, o
          asesoramiento de funcionarios y crees que esto les es útil, te
          agradecemos que lo difundas o lo enlaces desde tus canales.
        </li>
      </ul>

      <h2>Más enlaces útiles</h2>
      <ul>
        <li>
          <Link href="/que-es-una-permuta">¿Qué es una permuta?</Link> —
          guía explicativa.
        </li>
        <li>
          <Link href="/preguntas-frecuentes">Preguntas frecuentes</Link>.
        </li>
        <li>
          <Link href="/aviso-legal">Aviso legal</Link> y{" "}
          <Link href="/politica-privacidad">política de privacidad</Link>.
        </li>
        <li>
          <Link href="/status">Estado del servicio</Link>.
        </li>
      </ul>
    </main>
  );
}

// ISR: pagina estatica de contenido. Se revalida cada hora.
export const revalidate = 3600;

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apoyar el proyecto",
  description:
    "PermutaES es gratuito y sin publicidad. Si te ha sido útil y quieres ayudar a mantenerlo, puedes invitarme a un café en Ko-fi.",
  alternates: { canonical: "/apoyar" },
};

/**
 * URL de Ko-fi configurada por env var. Asi se puede cambiar (o
 * anadir mas plataformas) sin tocar codigo. Si la env var no esta
 * definida, la pagina se muestra igual pero el boton lleva al perfil
 * generico "ko-fi.com" — el usuario debe configurar la env var en
 * Vercel: NEXT_PUBLIC_KOFI_URL=https://ko-fi.com/<tu-usuario>
 */
const KOFI_URL = process.env.NEXT_PUBLIC_KOFI_URL ?? "https://ko-fi.com";

export default function ApoyarPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Apoyar el proyecto
      </h1>
      <p className="mt-3 text-sm text-slate-500">
        PermutaES es gratuito, sin publicidad y sin venta de datos. Si
        te ha resultado útil y quieres ayudar a que siga así, aquí
        tienes cómo.
      </p>

      <section className="mt-8 rounded-xl2 border border-brand-mint/40 bg-brand-bg/30 p-5 shadow-card sm:p-6">
        <h2 className="font-head text-lg font-semibold text-brand">
          ¿Por qué hay donaciones?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          La plataforma tiene unos costes mínimos pero recurrentes:
          dominio, hosting de la web, base de datos, envío de emails
          transaccionales y monitorización. Hasta ahora los asumo
          personalmente como parte del proyecto, ya que esto no es mi
          trabajo principal — lo construyo en mi tiempo libre.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Si la plataforma crece y te ha sido útil, una donación
          puntual ayuda a cubrir esos gastos y a mantener la app{" "}
          <strong>sin publicidad ni muros de pago</strong>. Cualquier
          cantidad cuenta y, sobre todo, me motiva mucho saber que
          alguien la valora.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          Las donaciones son <strong>100% voluntarias y sin
          contrapartidas</strong>. No dan acceso a funcionalidades
          extra, no priorizan tus búsquedas, no cambian nada en tu
          cuenta. Todo el mundo usa la misma plataforma.
        </p>
      </section>

      <section className="mt-6 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <h2 className="font-head text-lg font-semibold text-slate-900">
          Cómo apoyar
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          La forma más sencilla es a través de <strong>Ko-fi</strong>,
          una plataforma popular para apoyar a creadores de proyectos
          independientes. Acepta tarjeta y PayPal. Sin comisiones para
          ti, sin necesidad de registrarte.
        </p>
        <div className="mt-5">
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-[#13C3FF] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#0aafe6]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
            Invítame a un café en Ko-fi
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Te lleva a una página externa de Ko-fi para completar la
          donación.
        </p>
      </section>

      <section className="mt-6 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card sm:p-6">
        <h2 className="font-head text-lg font-semibold text-slate-900">
          Otras formas de ayudar (sin gastar dinero)
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
          <li>
            <strong>Difunde la plataforma</strong> entre compañeros de
            tu sector. Cuantos más anuncios haya, más cadenas se
            detectan para todos.
          </li>
          <li>
            <strong>Reporta bugs o sugerencias</strong> desde{" "}
            <a
              href="/contacto"
              className="font-medium text-brand-text hover:text-brand"
            >
              Contacto
            </a>{" "}
            o abriendo un{" "}
            <a
              href="https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-text hover:text-brand"
            >
              issue en GitHub
            </a>
            .
          </li>
          <li>
            <strong>Cuéntalo en tu sindicato</strong> o canal de
            personal de tu administración. Si crees que les podemos
            ser útiles, comparte el enlace.
          </li>
        </ul>
      </section>

      <p className="mt-8 text-center text-sm text-slate-500">
        Gracias por usar PermutaES.
      </p>
    </main>
  );
}

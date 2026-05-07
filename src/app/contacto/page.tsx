import type { Metadata } from "next";
import { ContactoForm } from "./ContactoForm";

export const metadata: Metadata = {
  title: "Contacto · PermutaES",
  description:
    "Escríbenos si tienes una duda, una sugerencia o quieres reportar un problema. Te respondemos en 48-72h.",
  alternates: { canonical: "/contacto" },
};

export default function ContactoPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Contacto
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        ¿Tienes una duda, una sugerencia o has detectado un fallo? Escríbenos.
        Tu mensaje nos llega por email y te responderemos al que indiques en
        un plazo razonable (en alfa, normalmente menos de 48h).
      </p>

      <div className="mt-8 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
        <ContactoForm />
      </div>

      <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-medium text-slate-700">Otras vías de contacto:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>
            Si tienes una cuenta, también puedes ejercer tus derechos RGPD
            (descargar datos, eliminar cuenta) directamente desde{" "}
            <a href="/mi-cuenta" className="font-medium text-brand-text hover:text-brand">
              tu cuenta
            </a>
            .
          </li>
          <li>
            Para temas técnicos o reportar bugs detallados, también
            aceptamos{" "}
            <a
              href="https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-text hover:text-brand"
            >
              issues en GitHub
            </a>
            .
          </li>
        </ul>
      </div>
    </main>
  );
}

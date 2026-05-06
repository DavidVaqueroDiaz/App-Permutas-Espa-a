import type { Metadata } from "next";
import { RecuperarForm } from "./RecuperarForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Recupera el acceso a tu cuenta de PermutaES.",
  robots: { index: false, follow: false },
};

export default function RecuperarPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Recuperar contraseña
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Introduce el email con el que te registraste y te enviaremos un enlace.
      </p>

      <div className="mt-8">
        <RecuperarForm />
      </div>
    </main>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Política de cookies de PermutaES.",
};

export default function PoliticaCookiesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 prose prose-slate dark:prose-invert">
      <h1>Política de cookies</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Versión v1 — Borrador en desarrollo. Será revisada por asesoría jurídica antes del lanzamiento público.
      </p>

      <h2>1. Qué son las cookies</h2>
      <p>
        Las cookies son pequeños archivos de texto que se guardan en tu navegador cuando visitas una web. Algunas son imprescindibles para que la web funcione (por ejemplo, mantener tu sesión iniciada) y otras se usan para fines de análisis o marketing.
      </p>

      <h2>2. Cookies que utilizamos</h2>
      <p>
        Actualmente, en esta fase de desarrollo, PermutaES solo utiliza cookies <strong>técnicas y estrictamente necesarias</strong> para el funcionamiento del servicio:
      </p>
      <ul>
        <li>Cookies de sesión de Supabase Auth, para mantener al usuario identificado mientras navega.</li>
      </ul>
      <p>
        No usamos cookies analíticas, de marketing ni de terceros con fines publicitarios.
      </p>

      <h2>3. Cómo desactivar las cookies</h2>
      <p>
        Puedes configurar tu navegador para bloquear o avisar de cookies. Si bloqueas las cookies técnicas, la sesión no podrá mantenerse y no podrás iniciar sesión en la plataforma.
      </p>

      <h2>4. Cambios futuros</h2>
      <p>
        Si en el futuro añadimos cookies analíticas o de marketing, te lo informaremos con un banner de cookies que te permitirá aceptarlas, rechazarlas o configurarlas, conforme a las directrices de la Agencia Española de Protección de Datos (AEPD).
      </p>
    </main>
  );
}

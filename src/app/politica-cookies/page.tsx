import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Política de cookies de PermutaES.",
};

export default function PoliticaCookiesPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12 prose prose-slate">
      <h1>Política de cookies</h1>
      <p className="text-sm text-slate-500">
        Versión v2 · Última actualización: mayo de 2026.
      </p>

      <h2>1. Qué son las cookies</h2>
      <p>
        Las cookies son pequeños archivos de texto que se guardan en tu
        navegador cuando visitas una web. Algunas son imprescindibles
        para que la web funcione (por ejemplo, mantener tu sesión
        iniciada) y otras se usan para fines de análisis o marketing.
      </p>

      <h2>2. Cookies que utilizamos</h2>
      <p>
        PermutaES <strong>solo utiliza cookies técnicas y estrictamente
        necesarias</strong> para el funcionamiento del servicio:
      </p>
      <ul>
        <li>
          Cookies de sesión de Supabase Auth, para mantener al usuario
          identificado mientras navega y proteger contra ataques CSRF.
        </li>
      </ul>
      <p>
        <strong>No usamos cookies analíticas, de marketing, ni de
        terceros con fines publicitarios.</strong> Por eso no necesitamos
        mostrar banner de cookies — todas las que usamos son
        imprescindibles y están exentas del consentimiento previo según
        la Guía sobre el uso de cookies de la AEPD.
      </p>
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

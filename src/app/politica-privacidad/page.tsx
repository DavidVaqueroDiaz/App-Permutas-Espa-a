import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Política de privacidad de PermutaES.",
};

export default function PoliticaPrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 prose prose-slate">
      <h1>Política de privacidad</h1>
      <p className="text-sm text-slate-500">
        Versión v1 — Borrador en desarrollo. Será revisada por asesoría jurídica antes del lanzamiento público.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de los datos personales recogidos a través de PermutaES es el titular de la plataforma.
      </p>

      <h2>2. Datos que recogemos</h2>
      <ul>
        <li>Email, contraseña (cifrada) y alias público al registrarse.</li>
        <li>Año de nacimiento, para validar requisitos legales de las permutas.</li>
        <li>Datos profesionales que el usuario decide publicar en su anuncio (sector, cuerpo, especialidad, plaza actual, plazas deseadas, fechas).</li>
        <li>Mensajes que el usuario intercambia con otros usuarios dentro de la plataforma.</li>
      </ul>

      <h2>3. Finalidad</h2>
      <p>
        Los datos se utilizan exclusivamente para:
      </p>
      <ul>
        <li>Permitir el registro y la autenticación.</li>
        <li>Hacer posible la detección automática de cadenas de permuta entre usuarios compatibles.</li>
        <li>Notificar al usuario de coincidencias y mensajes recibidos.</li>
      </ul>

      <h2>4. Base jurídica</h2>
      <p>
        Consentimiento expreso del interesado al registrarse y cumplimiento de las obligaciones legales aplicables.
      </p>

      <h2>5. Derechos del usuario</h2>
      <p>
        Acceso, rectificación, supresión, limitación, oposición y portabilidad de los datos. Para ejercerlos, escribe a la dirección de contacto que aparece en el aviso legal.
      </p>

      <h2>6. Conservación</h2>
      <ul>
        <li>Anuncios activos: hasta 6 meses desde la última renovación.</li>
        <li>Anuncios caducados o eliminados: 1 año adicional.</li>
        <li>Mensajes: 1 año desde el último mensaje del hilo.</li>
        <li>Cuentas eliminadas: anonimización inmediata, conservación de logs mínimos durante el plazo legal.</li>
      </ul>

      <h2>7. Encargados de tratamiento</h2>
      <p>
        Para prestar el servicio nos apoyamos en proveedores que actúan como encargados del tratamiento:
      </p>
      <ul>
        <li>Supabase (alojamiento de la base de datos y autenticación).</li>
        <li>Vercel (alojamiento de la aplicación web).</li>
        <li>Resend (envío de emails transaccionales).</li>
      </ul>
      <p>Todos cumplen RGPD y los datos se alojan en servidores ubicados en la Unión Europea.</p>

      <h2>8. Modificaciones</h2>
      <p>
        Esta política puede actualizarse. Cuando lo hagamos, te lo notificaremos por email y al iniciar sesión.
      </p>
    </main>
  );
}

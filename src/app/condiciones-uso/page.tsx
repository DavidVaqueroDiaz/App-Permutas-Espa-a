import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Condiciones de uso",
  description: "Condiciones de uso de PermutaES.",
};

export default function CondicionesUsoPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12 prose prose-slate">
      <h1>Condiciones de uso</h1>
      <p className="text-sm text-slate-500">
        Versión v1 — Borrador en desarrollo. Será revisada por asesoría jurídica antes del lanzamiento público.
      </p>

      <h2>1. Qué es PermutaES</h2>
      <p>
        PermutaES es una plataforma gratuita de intermediación que permite a funcionarios públicos españoles publicar anuncios de permuta de plaza y descubrir posibles cadenas de permuta con otros usuarios compatibles.
      </p>

      <h2>2. La plataforma NO tramita la permuta</h2>
      <p>
        PermutaES es solo un canal de descubrimiento y contacto entre funcionarios. La aprobación de cualquier permuta corresponde exclusivamente a las administraciones empleadoras de los permutantes, conforme a la normativa que les sea aplicable. PermutaES no garantiza que ninguna permuta detectada en la plataforma pueda formalizarse efectivamente.
      </p>

      <h2>3. Veracidad de los datos</h2>
      <p>
        El usuario es responsable de la veracidad de los datos publicados en su anuncio. La publicación de datos falsos puede dar lugar a la suspensión o eliminación de la cuenta.
      </p>

      <h2>4. Conducta del usuario</h2>
      <p>
        Está prohibido:
      </p>
      <ul>
        <li>Suplantar la identidad de otra persona.</li>
        <li>Publicar contenido ofensivo, discriminatorio o ilegal.</li>
        <li>Intentar lucrarse económicamente con la plataforma fuera de los flujos previstos.</li>
        <li>Recolectar datos de otros usuarios fuera del flujo natural de matching y mensajería.</li>
      </ul>

      <h2>5. Limitación de responsabilidad</h2>
      <p>
        PermutaES actúa como mero intermediario en los términos de la Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI-CE). No responde de los acuerdos privados entre usuarios ni de las decisiones administrativas posteriores.
      </p>

      <h2>6. Suspensión de la cuenta</h2>
      <p>
        Podemos suspender o eliminar cuentas que incumplan estas condiciones, con un aviso previo razonable salvo en casos graves.
      </p>

      <h2>7. Modificaciones</h2>
      <p>
        Estas condiciones pueden actualizarse. Cuando lo hagamos, te lo notificaremos al iniciar sesión.
      </p>

      <h2>8. Ley aplicable</h2>
      <p>
        Se aplica la legislación española. Para cualquier controversia, los juzgados y tribunales competentes serán los del domicilio del usuario consumidor.
      </p>
    </main>
  );
}

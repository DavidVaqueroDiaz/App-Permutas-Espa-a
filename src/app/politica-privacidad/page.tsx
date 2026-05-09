// ISR: pagina estatica de contenido. Se revalida cada hora.
export const revalidate = 3600;

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Política de privacidad de PermutaES.",
};

export default function PoliticaPrivacidadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12 prose prose-slate">
      <h1>Política de privacidad</h1>
      <p className="text-sm text-slate-500">
        Versión v2 · Última actualización: mayo de 2026.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        El responsable del tratamiento de los datos personales recogidos a
        través de PermutaES es el titular del proyecto, David Vaquero, con
        contacto en la dirección indicada en el{" "}
        <a href="/aviso-legal">aviso legal</a>.
      </p>
      <p>
        PermutaES es un proyecto independiente, no asociado a ninguna
        administración pública.
      </p>

      <h2>2. Datos que recogemos</h2>
      <p>
        Solo recogemos los datos estrictamente necesarios para el
        funcionamiento del servicio:
      </p>
      <ul>
        <li>
          <strong>Al registrarse:</strong> email, contraseña (almacenada
          cifrada con bcrypt por Supabase Auth), alias público, año de
          nacimiento, fecha de aceptación de las condiciones.
        </li>
        <li>
          <strong>Al publicar un anuncio:</strong> sector profesional,
          cuerpo y especialidad, municipio actual, municipios deseados,
          fecha de toma de posesión definitiva, años totales de servicio,
          fecha de la permuta anterior (si la hubo), observaciones libres.
          Para anuncios sanitarios también el Servicio de Salud de
          adscripción.
        </li>
        <li>
          <strong>Al usar la mensajería:</strong> el contenido de los
          mensajes que envías a otros usuarios.
        </li>
        <li>
          <strong>Datos técnicos automáticos:</strong> IP de origen
          (usada únicamente para rate limiting durante el registro,
          sin almacenarse asociada a tu identidad), errores no
          capturados (vía Sentry, sin información personal identificable
          por defecto).
        </li>
      </ul>

      <h2>3. Finalidad y base jurídica</h2>
      <p>
        Los datos se utilizan exclusivamente para los siguientes fines, con
        consentimiento expreso del usuario al registrarse (art. 6.1.a RGPD)
        y para la ejecución del servicio solicitado (art. 6.1.b):
      </p>
      <ul>
        <li>Permitir el registro y la autenticación.</li>
        <li>
          Detectar automáticamente cadenas de permuta entre usuarios
          compatibles según las reglas profesionales y geográficas
          aplicables a cada sector.
        </li>
        <li>
          Notificar por email al usuario cuando aparece una cadena que le
          incluye, cuando alguien le envía un mensaje, o cuando su anuncio
          va a caducar.
        </li>
        <li>
          Aplicar medidas de seguridad (rate limiting, detección de spam).
        </li>
      </ul>
      <p>
        <strong>No usamos los datos con fines publicitarios</strong>, ni
        los compartimos con terceros con esos fines, ni los vendemos.
      </p>

      <h2>4. Tus derechos</h2>
      <p>
        Como persona interesada, tienes los siguientes derechos sobre tus
        datos personales:
      </p>
      <ul>
        <li>
          <strong>Acceso y portabilidad</strong> (arts. 15 y 20 RGPD): puedes
          descargar todos los datos que guardamos sobre ti en formato JSON
          desde{" "}
          <a href="/mi-cuenta">
            tu cuenta &rarr; sección "Privacidad y mis datos"
          </a>{" "}
          → botón "Descargar mis datos".
        </li>
        <li>
          <strong>Supresión / derecho al olvido</strong> (art. 17): puedes
          eliminar tu cuenta y todos los datos asociados desde{" "}
          <a href="/mi-cuenta">
            tu cuenta &rarr; sección "Privacidad y mis datos"
          </a>{" "}
          → botón "Eliminar mi cuenta". La acción es irreversible.
        </li>
        <li>
          <strong>Rectificación</strong> (art. 16): puedes editar tu alias,
          año de nacimiento y datos de tus anuncios desde tu cuenta en
          cualquier momento.
        </li>
        <li>
          <strong>Limitación y oposición</strong> (arts. 18 y 21): para
          ejercerlos, escríbenos a la dirección que aparece en el{" "}
          <a href="/aviso-legal">aviso legal</a>.
        </li>
      </ul>
      <p>
        Si consideras que tus derechos no han sido atendidos, puedes
        presentar una reclamación ante la{" "}
        <a
          href="https://www.aepd.es"
          target="_blank"
          rel="noopener noreferrer"
        >
          Agencia Española de Protección de Datos (AEPD)
        </a>
        .
      </p>

      <h2>5. Plazos de conservación</h2>
      <ul>
        <li>
          <strong>Anuncios activos:</strong> hasta 6 meses desde la última
          renovación. Avisamos por email 30 días antes para que puedas
          renovar.
        </li>
        <li>
          <strong>Anuncios eliminados o cerrados como permuta conseguida:</strong>{" "}
          se conservan asociados a tu cuenta como histórico mientras la
          cuenta exista.
        </li>
        <li>
          <strong>Mensajes:</strong> 2 años desde el último mensaje del
          hilo, después se eliminan automáticamente.
        </li>
        <li>
          <strong>Cuentas eliminadas por el usuario:</strong> eliminación
          inmediata en cascada (perfil, anuncios, mensajes,
          conversaciones, reportes y notificaciones). Conservamos
          únicamente logs técnicos mínimos (acceso a la API) durante el
          tiempo estrictamente necesario para fines de seguridad.
        </li>
      </ul>

      <h2>6. Encargados del tratamiento (subprocesadores)</h2>
      <p>
        Para prestar el servicio utilizamos los siguientes proveedores,
        que actúan como encargados del tratamiento bajo contratos
        conformes al RGPD:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (base de datos PostgreSQL, autenticación
          y almacenamiento). Servidores en la Unión Europea (Irlanda).
        </li>
        <li>
          <strong>Vercel</strong> (alojamiento del frontend y ejecución de
          funciones serverless). Servidores principales en Estados Unidos
          con cláusulas contractuales tipo aprobadas por la Comisión
          Europea para transferencias internacionales.
        </li>
        <li>
          <strong>Resend</strong> (envío de emails transaccionales como
          confirmación de cuenta, avisos de cadenas y mensajes). Servidores
          en la Unión Europea.
        </li>
        <li>
          <strong>Sentry</strong> (monitorización de errores en tiempo de
          ejecución). Configurado para no enviar información personal
          identificable por defecto.
        </li>
      </ul>

      <h2>7. Cookies</h2>
      <p>
        PermutaES utiliza únicamente cookies estrictamente necesarias
        para el funcionamiento (sesión de usuario y CSRF). No usamos
        cookies de terceros con fines publicitarios o de seguimiento.
        Más detalles en la <a href="/politica-cookies">política de cookies</a>.
      </p>

      <h2>8. Seguridad</h2>
      <ul>
        <li>Conexión cifrada (HTTPS) en toda la aplicación.</li>
        <li>Contraseñas cifradas con bcrypt; nunca las almacenamos en claro.</li>
        <li>
          Aislamiento por usuario en base de datos mediante Row Level
          Security (RLS).
        </li>
        <li>Rate limiting en acciones críticas para prevenir abuso.</li>
        <li>Backups automáticos diarios cifrados de la base de datos.</li>
      </ul>

      <h2>9. Modificaciones</h2>
      <p>
        Esta política puede actualizarse. Si los cambios son sustanciales,
        te lo notificaremos por email y al iniciar sesión, y te pediremos
        aceptar la nueva versión. Cambios menores (clarificaciones,
        nuevos subprocesadores) se publicarán aquí con la fecha
        actualizada.
      </p>
    </main>
  );
}

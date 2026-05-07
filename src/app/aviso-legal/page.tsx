import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: "Aviso legal de PermutaES.",
};

export default function AvisoLegalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12 prose prose-slate">
      <h1>Aviso legal</h1>
      <p className="text-sm text-slate-500">
        Versión v2 · Última actualización: mayo de 2026.
      </p>

      <h2>1. Datos identificativos del responsable</h2>
      <p>
        En cumplimiento de la Ley 34/2002 de Servicios de la Sociedad de
        la Información y de Comercio Electrónico (LSSI-CE), se informa de
        que el responsable de esta plataforma es:
      </p>
      <ul>
        <li>
          <strong>Titular:</strong> David Vaquero (proyecto personal sin
          ánimo de lucro).
        </li>
        <li>
          <strong>Contacto:</strong> el email de contacto se publicará
          junto al despliegue del dominio definitivo. Mientras tanto,
          puedes abrir un issue en{" "}
          <a href="https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a/issues">
            GitHub
          </a>{" "}
          o ejercer tus derechos directamente desde la sección "Privacidad
          y mis datos" de tu cuenta.
        </li>
      </ul>
      <p>
        PermutaES es un proyecto independiente, sin vinculación con
        ninguna administración pública ni con asociaciones sindicales.
      </p>

      <h2>2. Objeto del servicio</h2>
      <p>
        PermutaES es una plataforma de intermediación que cruza anuncios
        publicados voluntariamente por funcionarios públicos españoles
        para detectar cadenas de permuta de plaza compatibles a nivel
        profesional, geográfico y legal.
      </p>
      <p>
        <strong>El servicio es gratuito</strong>, sin publicidad ni venta
        de datos. El uso es opcional y los usuarios pueden eliminar su
        cuenta en cualquier momento desde su perfil.
      </p>

      <h2>3. Limitación de responsabilidad</h2>
      <p>
        PermutaES <strong>no participa en la tramitación administrativa</strong>{" "}
        de las permutas. Una vez dos o más usuarios deciden iniciar el
        trámite, son ellos quienes deben presentar la solicitud ante sus
        respectivas administraciones cumpliendo las reglas legales
        (estatutarias, de régimen general, autonómicas, etc.) aplicables a
        cada sector.
      </p>
      <p>
        La plataforma muestra avisos automáticos sobre las reglas legales
        personales (años hasta jubilación, antigüedad, carencia entre
        permutas, tiempo en destino), pero <strong>la verificación final
        es responsabilidad del usuario</strong> antes de tramitar.
      </p>

      <h2>4. Propiedad intelectual</h2>
      <p>
        El código fuente de la plataforma se publica de forma abierta en{" "}
        <a href="https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a">
          GitHub
        </a>
        . Los textos, marca y diseño son propiedad del titular del
        proyecto.
      </p>

      <h2>5. Datos de fuentes públicas utilizadas</h2>
      <ul>
        <li>
          Códigos y nombres de municipios, provincias y comunidades
          autónomas: Instituto Nacional de Estadística (INE), datos
          abiertos.
        </li>
        <li>
          Geometrías administrativas: Centro Nacional de Información
          Geográfica (CNIG / IGN), licencia CC-BY 4.0.
        </li>
        <li>
          Coordenadas (centroides) de los 8.132 municipios españoles:
          derivadas a través del proyecto comunitario{" "}
          <a href="https://github.com/softline-informatica/softlinegeodb">
            softlinegeodb
          </a>{" "}
          (SOFT LINE Informática S.L.), que consolida los datos públicos
          del INE y del CNIG/IGN.
        </li>
        <li>
          Catálogo de cuerpos docentes y especialidades: Real Decreto
          1834/2008 y normativa concordante.
        </li>
        <li>
          Servicios de salud autonómicos del SNS: información pública
          publicada por cada uno y por el Ministerio de Sanidad.
        </li>
        <li>
          Régimen jurídico de las permutas: Estatuto Marco (Ley 55/2003),
          art. 62 Decreto 315/1964, art. 98 Reglamento de Funcionarios
          Locales 1952, RD 128/2018, RD 1364/2010 disp. adic. 6ª, y
          legislación autonómica concordante.
        </li>
      </ul>

      <h2>6. Privacidad y datos personales</h2>
      <p>
        El tratamiento de datos personales se rige por la{" "}
        <a href="/politica-privacidad">política de privacidad</a>. Los
        derechos de acceso, rectificación, supresión y portabilidad
        pueden ejercerse directamente desde la cuenta del usuario.
      </p>

      <h2>7. Cookies</h2>
      <p>
        PermutaES solo utiliza cookies estrictamente necesarias para el
        funcionamiento del servicio. Más detalles en la{" "}
        <a href="/politica-cookies">política de cookies</a>.
      </p>

      <h2>8. Legislación aplicable y jurisdicción</h2>
      <p>
        La relación entre el usuario y PermutaES se rige por la
        legislación española. Para cualquier controversia, las partes
        se someten a los juzgados y tribunales del domicilio del
        consumidor.
      </p>
    </main>
  );
}

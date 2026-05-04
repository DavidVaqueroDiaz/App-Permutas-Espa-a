import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso legal",
  description: "Aviso legal de PermutaES.",
};

export default function AvisoLegalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 prose prose-slate">
      <h1>Aviso legal</h1>
      <p className="text-sm text-slate-500">
        Versión v1 — Borrador en desarrollo. Será revisada por asesoría jurídica antes del lanzamiento público.
      </p>

      <h2>1. Datos identificativos</h2>
      <p>
        En cumplimiento de la Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de que esta plataforma es un proyecto personal sin ánimo de lucro en fase de desarrollo. Los datos identificativos completos del responsable se publicarán antes del lanzamiento público.
      </p>

      <h2>2. Objeto</h2>
      <p>
        PermutaES es una plataforma de intermediación que conecta a funcionarios públicos españoles que desean intercambiar su plaza con otros funcionarios compatibles legalmente.
      </p>

      <h2>3. Propiedad intelectual</h2>
      <p>
        El código fuente de la plataforma se publica de forma abierta en{" "}
        <a href="https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a">GitHub</a>.
      </p>

      <h2>4. Datos de fuentes públicas utilizadas</h2>
      <ul>
        <li>Códigos y nombres de municipios, provincias y comunidades autónomas: Instituto Nacional de Estadística (INE), datos abiertos.</li>
        <li>Geometrías administrativas: Centro Nacional de Información Geográfica (CNIG / IGN), licencia CC-BY 4.0.</li>
        <li>
          Coordenadas (centroides) de los 8.132 municipios españoles: derivadas a través del proyecto comunitario{" "}
          <a href="https://github.com/softline-informatica/softlinegeodb">softlinegeodb</a>{" "}
          (SOFT LINE Informática S.L.), que consolida los datos públicos del INE y del CNIG/IGN.
        </li>
        <li>Catálogos de cuerpos y especialidades docentes: Real Decreto 1834/2008 y normativa concordante.</li>
      </ul>

      <h2>5. Contacto</h2>
      <p>
        Para cualquier consulta legal, escribe al email de contacto que se publicará antes del lanzamiento.
      </p>
    </main>
  );
}

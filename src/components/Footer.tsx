/**
 * Pie global de la aplicación. Aparece en todas las páginas.
 *
 * Incluye los enlaces legales mínimos que LSSI-CE y RGPD requieren
 * tener accesibles desde toda la web, además de la atribución a INE
 * y CNIG por el uso de sus datos abiertos.
 */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white py-8">
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="font-head text-xs font-semibold uppercase tracking-wide text-slate-500">
              Saber más
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              <li>
                <a href="/que-es-una-permuta" className="hover:text-brand">
                  ¿Qué es una permuta?
                </a>
              </li>
              <li>
                <a href="/permutas/docentes" className="hover:text-brand">
                  Permutas docentes
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-head text-xs font-semibold uppercase tracking-wide text-slate-500">
              Funcionalidad
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              <li>
                <a href="/auto-permutas" className="hover:text-brand">
                  Buscador de cadenas
                </a>
              </li>
              <li>
                <a href="/anuncios" className="hover:text-brand">
                  Anuncios publicados
                </a>
              </li>
              <li>
                <a href="/registro" className="hover:text-brand">
                  Crear cuenta
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-head text-xs font-semibold uppercase tracking-wide text-slate-500">
              Legal y proyecto
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              <li>
                <a href="/aviso-legal" className="hover:text-brand">
                  Aviso legal
                </a>
              </li>
              <li>
                <a href="/politica-privacidad" className="hover:text-brand">
                  Política de privacidad
                </a>
              </li>
              <li>
                <a href="/condiciones-uso" className="hover:text-brand">
                  Condiciones de uso
                </a>
              </li>
              <li>
                <a href="/politica-cookies" className="hover:text-brand">
                  Política de cookies
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand"
                >
                  Código en GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
          © {year} PermutaES · Plataforma sin ánimo de lucro · Datos
          cartográficos: © Instituto Geográfico Nacional · Datos
          administrativos: © INE
        </p>
      </div>
    </footer>
  );
}

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
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
          <a href="/aviso-legal"         className="hover:text-brand">Aviso legal</a>
          <a href="/politica-privacidad" className="hover:text-brand">Política de privacidad</a>
          <a href="/condiciones-uso"     className="hover:text-brand">Condiciones de uso</a>
          <a href="/politica-cookies"    className="hover:text-brand">Política de cookies</a>
          <a
            href="https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand"
          >
            Código en GitHub
          </a>
        </nav>
        <p className="mt-4 text-xs text-slate-500">
          © {year} PermutaES · Plataforma sin ánimo de lucro · Datos cartográficos: © Instituto Geográfico Nacional · Datos administrativos: © INE
        </p>
      </div>
    </footer>
  );
}

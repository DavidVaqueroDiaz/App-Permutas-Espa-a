import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada · PermutaES",
  robots: { index: false, follow: false },
};

/**
 * Boundary 404 global de Next.js App Router. Reemplaza la 404 nativa
 * (que sale en ingles y con tema oscuro) por una pagina propia con el
 * branding de PermutaES y CTAs de vuelta utiles.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-12 sm:px-6 sm:py-20">
      <div className="rounded-xl2 border border-brand-mint/40 bg-brand-bg/50 p-6 shadow-card md:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-text">
          Error 404
        </p>
        <h1 className="mt-1 font-head text-3xl font-semibold tracking-tight text-brand sm:text-4xl">
          Esta página no existe
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-700">
          Puede que el enlace esté roto, que el anuncio se haya cerrado o
          eliminado, o que hayas escrito mal la dirección. Te dejamos por
          aquí los caminos más útiles:
        </p>
        <ul className="mt-5 space-y-2 text-sm">
          <li>
            <Link
              href="/auto-permutas"
              className="font-medium text-brand-text hover:text-brand"
            >
              🔍 Buscador de cadenas de permuta
            </Link>{" "}
            <span className="text-slate-500">— el corazón de PermutaES.</span>
          </li>
          <li>
            <Link
              href="/anuncios"
              className="font-medium text-brand-text hover:text-brand"
            >
              📋 Listado de anuncios
            </Link>{" "}
            <span className="text-slate-500">— ver qué hay publicado.</span>
          </li>
          <li>
            <Link
              href="/preguntas-frecuentes"
              className="font-medium text-brand-text hover:text-brand"
            >
              ❓ Preguntas frecuentes
            </Link>{" "}
            <span className="text-slate-500">— las dudas habituales.</span>
          </li>
          <li>
            <Link
              href="/"
              className="font-medium text-brand-text hover:text-brand"
            >
              🏠 Volver a la home
            </Link>
          </li>
        </ul>
      </div>
    </main>
  );
}

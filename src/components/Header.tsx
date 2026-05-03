import { createClient } from "@/lib/supabase/server";

/**
 * Cabecera global de la aplicación.
 *
 * Lee el usuario actual desde Supabase Auth en el servidor y muestra
 * los botones de auth correspondientes. Es un Server Component.
 */
export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="border-b border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <a href="/" className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">
          PermutaES
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Auto permutas: solo para usuarios logueados. */}
          {user && (
            <a
              href="/auto-permutas"
              className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
            >
              Auto permutas
            </a>
          )}
          {/* Enlace siempre visible al listado de anuncios. */}
          <a
            href="/anuncios"
            className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
          >
            Anuncios
          </a>

          {user ? (
            <>
              {user.email_confirmed_at && (
                <a
                  href="/anuncios/nuevo"
                  className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                >
                  + Publicar anuncio
                </a>
              )}
              <a
                href="/mi-cuenta"
                className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              >
                Mi cuenta
              </a>
              <form action="/logout" method="POST">
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              >
                Iniciar sesión
              </a>
              <a
                href="/registro"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Crear cuenta
              </a>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

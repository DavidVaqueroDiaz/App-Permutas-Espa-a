import { createClient } from "@/lib/supabase/server";

/**
 * Cabecera global de la aplicación.
 *
 * Lee el usuario actual desde Supabase Auth en el servidor y muestra
 * los botones de auth correspondientes. Es un Server Component.
 *
 * Estética inspirada en PermutaDoc: fondo brand verde botánico, logo
 * con icono SVG en pastilla mint, texto blanco con subtítulo en mint.
 */
export async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-3 py-3 md:gap-4 md:px-8 md:py-4">
        <a href="/" className="flex items-center gap-3 md:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-mint/15 ring-1 ring-brand-mint/30">
            <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
              <path
                d="M8 13 L16 6 L24 13 L24 25 L19 25 L19 18 L13 18 L13 25 L8 25 Z"
                fill="#5dcaa5"
              />
              <circle cx="22" cy="9" r="2.2" fill="#5dcaa5" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="font-head text-xl font-semibold leading-tight md:text-[22px]">
              PermutaES
            </h1>
            <p className="text-[13px] leading-tight text-brand-mint md:text-sm">
              Permutas de plaza para funcionarios públicos
            </p>
          </div>
        </a>

        <nav className="ml-auto flex items-center gap-2 sm:gap-3">
          <a
            href="/auto-permutas"
            className="hidden rounded-full px-3 py-1.5 text-sm text-white/85 ring-1 ring-white/15 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            Auto permutas
          </a>
          <a
            href="/anuncios"
            className="hidden rounded-full px-3 py-1.5 text-sm text-white/85 ring-1 ring-white/15 hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            Anuncios
          </a>

          {user ? (
            <>
              {user.email_confirmed_at && (
                <a
                  href="/anuncios/nuevo"
                  className="rounded-full bg-brand-mint/20 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-brand-mint/40 hover:bg-brand-mint/30"
                >
                  + Publicar anuncio
                </a>
              )}
              <a
                href="/mensajes"
                className="text-sm text-white/85 hover:text-white"
              >
                Mensajes
              </a>
              <a
                href="/mi-cuenta"
                className="text-sm text-white/85 hover:text-white"
              >
                Mi cuenta
              </a>
              <form action="/logout" method="POST">
                <button
                  type="submit"
                  className="rounded-full px-3 py-1.5 text-sm text-white/85 ring-1 ring-white/15 hover:bg-white/10 hover:text-white"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="text-sm text-white/85 hover:text-white"
              >
                Iniciar sesión
              </a>
              <a
                href="/registro"
                className="rounded-full bg-brand-mint/20 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-brand-mint/40 hover:bg-brand-mint/30"
              >
                Crear cuenta
              </a>
            </>
          )}
        </nav>
      </div>

      {/* Acceso rápido a las dos secciones públicas en móvil */}
      <div className="flex items-center gap-2 px-3 pb-3 sm:hidden">
        <a
          href="/auto-permutas"
          className="rounded-full bg-white/10 px-3 py-1 text-[12px] text-white ring-1 ring-white/15"
        >
          Auto permutas
        </a>
        <a
          href="/anuncios"
          className="rounded-full bg-white/10 px-3 py-1 text-[12px] text-white ring-1 ring-white/15"
        >
          Anuncios
        </a>
      </div>
    </header>
  );
}

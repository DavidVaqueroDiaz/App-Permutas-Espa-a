"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export type HeaderUser = {
  emailConfirmed: boolean;
  noLeidos: number;
  esAdmin: boolean;
} | null;

/**
 * Cabecera con dos zonas:
 *
 *  1. Acciones primarias visibles SIEMPRE en pills:
 *       - Auto permutas
 *       - Anuncios
 *       - + Publicar anuncio (solo si email confirmado)
 *
 *  2. Menu hamburguesa (al final del nav, mismo estilo que en movil)
 *     con todo lo demas: Mensajes, Mi cuenta, Cerrar sesion, Contacto
 *     y Sobre el proyecto. Tambien aqui aparece Iniciar sesion / Crear
 *     cuenta cuando no hay usuario.
 *
 * En movil (<sm) las acciones primarias se ocultan y solo queda el
 * boton hamburguesa, que despliega todas las secciones.
 *
 * El `user` viene resuelto desde el Header server component (server
 * action), este client solo gestiona estado de UI.
 */
export function HeaderClient({ user }: { user: HeaderUser }) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Cierra el menu al cambiar de ruta.
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  // Cierra con tecla Escape.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  // Cierra al hacer click fuera del panel (solo escritorio: el dropdown
  // flotante tiene que cerrarse igual que un menu nativo).
  useEffect(() => {
    if (!abierto) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (panelRef.current && target && !panelRef.current.contains(target)) {
        setAbierto(false);
      }
    };
    // Pequeno delay para no atrapar el click que abrio el panel.
    const id = window.setTimeout(() => {
      document.addEventListener("click", onClick);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("click", onClick);
    };
  }, [abierto]);

  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-3 py-3 md:gap-4 md:px-8 md:py-4">
        <a href="/" className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          {/* Logo en blanco directamente sobre la cabecera verde marca.
              Truco CSS: brightness(0) lo aplasta a negro y invert(1) lo
              flippea a blanco, manteniendo la transparencia. Asi no
              hace falta generar un PNG en blanco aparte. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="PermutaES"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 object-contain brightness-0 invert"
          />

          <div className="min-w-0">
            {/* Span en lugar de h1 para evitar dos h1 por pagina (cada
                ruta debe tener UN h1, el de su contenido principal). */}
            <span className="block font-head text-xl font-semibold leading-tight md:text-[22px]">
              PermutaES
            </span>
            <p className="hidden text-[13px] leading-tight text-brand-mint sm:block md:text-sm">
              Bolsa de permutas para funcionarios públicos
            </p>
          </div>
        </a>

        {/* === Acciones primarias DESKTOP (>=sm) === */}
        <nav className="ml-auto hidden items-center gap-2 sm:flex sm:gap-3">
          <a
            href="/auto-permutas"
            className="rounded-full px-3 py-1.5 text-sm text-white/85 ring-1 ring-white/15 hover:bg-white/10 hover:text-white"
          >
            Auto permutas
          </a>
          <a
            href="/anuncios"
            className="rounded-full px-3 py-1.5 text-sm text-white/85 ring-1 ring-white/15 hover:bg-white/10 hover:text-white"
          >
            Anuncios
          </a>
          {user?.emailConfirmed && (
            <a
              href="/anuncios/nuevo"
              className="rounded-full bg-brand-mint/20 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-brand-mint/40 hover:bg-brand-mint/30"
            >
              + Publicar anuncio
            </a>
          )}
        </nav>

        {/* === Boton hamburguesa (mismo en escritorio y movil) === */}
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="menu-principal"
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            className="relative ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-white/15 hover:bg-white/10"
          >
            {abierto ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M6 6 L18 18 M18 6 L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M4 7 H20 M4 12 H20 M4 17 H20"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            )}
            {/* Badge de mensajes sin leer en el icono cerrado */}
            {!abierto && user && user.noLeidos > 0 && (
              <span
                className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-mint px-1 text-[10px] font-bold text-brand"
                aria-label={`${user.noLeidos} conversaciones sin leer`}
              >
                {user.noLeidos > 9 ? "9+" : user.noLeidos}
              </span>
            )}
          </button>

          {/* === Panel desplegable: dropdown flotante en sm+, panel
                full-width debajo del header en movil === */}
          {abierto && (
            <div
              id="menu-principal"
              className="absolute right-0 top-full z-40 mt-2 w-72 origin-top-right rounded-xl2 border border-slate-200 bg-white text-slate-900 shadow-card max-sm:fixed max-sm:left-0 max-sm:right-0 max-sm:mt-0 max-sm:w-auto max-sm:rounded-none max-sm:border-x-0 max-sm:border-t-0 max-sm:border-slate-200/0 max-sm:bg-brand max-sm:text-white max-sm:shadow-none"
            >
              <nav className="flex flex-col gap-0.5 p-2 max-sm:gap-1 max-sm:p-3">
                {/* En MOVIL repetimos los enlaces primarios porque la
                    nav horizontal esta oculta. En sm+ NO los mostramos
                    aqui para no duplicar lo que ya esta visible. */}
                <div className="flex flex-col gap-1 sm:hidden">
                  <Item
                    href="/auto-permutas"
                    pathname={pathname}
                    movil
                  >
                    Auto permutas
                  </Item>
                  <Item href="/anuncios" pathname={pathname} movil>
                    Anuncios
                  </Item>
                  {user?.emailConfirmed && (
                    <Item
                      href="/anuncios/nuevo"
                      pathname={pathname}
                      movil
                      destacado
                    >
                      + Publicar anuncio
                    </Item>
                  )}
                  <div className="my-1 border-t border-white/10" aria-hidden="true" />
                </div>

                {user ? (
                  <>
                    <Item
                      href="/mensajes"
                      pathname={pathname}
                      badge={user.noLeidos}
                    >
                      Mensajes
                    </Item>
                    <Item href="/mi-cuenta" pathname={pathname}>
                      Mi cuenta
                    </Item>
                    {user.esAdmin && (
                      <Item href="/admin" pathname={pathname}>
                        Admin
                      </Item>
                    )}
                  </>
                ) : (
                  <>
                    <Item href="/login" pathname={pathname}>
                      Iniciar sesión
                    </Item>
                    <Item href="/registro" pathname={pathname} destacado>
                      Crear cuenta
                    </Item>
                  </>
                )}

                <div className="my-1 border-t border-slate-200 max-sm:border-white/10" aria-hidden="true" />

                <Item href="/sobre-el-proyecto" pathname={pathname}>
                  Sobre el proyecto
                </Item>
                <Item href="/contacto" pathname={pathname}>
                  Contacto
                </Item>

                {user && (
                  <>
                    <div className="my-1 border-t border-slate-200 max-sm:border-white/10" aria-hidden="true" />
                    <form action="/logout" method="POST">
                      <button
                        type="submit"
                        className="block w-full rounded-md px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 max-sm:py-3 max-sm:text-base max-sm:text-white/80 max-sm:hover:bg-white/10"
                      >
                        Cerrar sesión
                      </button>
                    </form>
                  </>
                )}
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Item del menu desplegable. Por defecto se renderiza con tema claro
 * (dropdown blanco escritorio); con `movil` aplica los colores claros
 * sobre fondo verde marca igual que el panel movil de antes.
 */
function Item({
  href,
  children,
  pathname,
  destacado,
  badge,
  movil,
}: {
  href: string;
  children: React.ReactNode;
  pathname: string;
  destacado?: boolean;
  badge?: number;
  movil?: boolean;
}) {
  const activo = pathname === href || pathname.startsWith(href + "/");

  // Tema oscuro para movil (sobre fondo brand verde): blanco sobre
  // verde, igual que como estaba antes el panel desplegable.
  if (movil) {
    return (
      <a
        href={href}
        className={
          "flex items-center justify-between rounded-md px-4 py-3 text-base font-medium transition " +
          (destacado
            ? "bg-brand-mint/25 text-white ring-1 ring-brand-mint/40 hover:bg-brand-mint/35"
            : activo
              ? "bg-white/15 text-white"
              : "text-white/85 hover:bg-white/10 hover:text-white")
        }
      >
        <span>{children}</span>
        {badge && badge > 0 ? (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-mint px-1.5 text-[11px] font-bold text-brand">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </a>
    );
  }

  // Tema claro (dropdown blanco escritorio). En movil heredamos el
  // wrapper que invierte colores via :where(max-sm:...).
  return (
    <a
      href={href}
      className={
        "flex items-center justify-between rounded-md px-4 py-2.5 text-sm font-medium transition max-sm:py-3 max-sm:text-base " +
        (destacado
          ? "bg-brand text-white hover:bg-brand-dark max-sm:bg-brand-mint/25 max-sm:ring-1 max-sm:ring-brand-mint/40 max-sm:hover:bg-brand-mint/35"
          : activo
            ? "bg-brand-bg text-brand-text max-sm:bg-white/15 max-sm:text-white"
            : "text-slate-700 hover:bg-slate-100 max-sm:text-white/85 max-sm:hover:bg-white/10 max-sm:hover:text-white")
      }
    >
      <span>{children}</span>
      {badge && badge > 0 ? (
        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-mint px-1.5 text-[11px] font-bold text-brand">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </a>
  );
}

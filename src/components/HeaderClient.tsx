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
 *  1. Acciones primarias visibles SIEMPRE en pills (solo escritorio):
 *       - Auto permutas
 *       - Anuncios
 *       - + Publicar anuncio (solo si email confirmado)
 *
 *  2. Boton hamburguesa que abre:
 *     - En MOVIL (<sm): un panel a ancho completo debajo del header
 *       row, con tema oscuro sobre verde marca. Incluye TAMBIEN las
 *       acciones primarias (porque la nav horizontal esta oculta).
 *     - En ESCRITORIO (>=sm): un dropdown flotante anclado a la
 *       derecha de la cabecera, con tema claro (blanco). NO incluye
 *       las acciones primarias para no duplicar lo ya visible.
 *
 * Por simplicidad y para evitar bugs de posicionamiento (absolute vs
 * fixed con breakpoints), el panel movil y el dropdown escritorio
 * son DOS elementos separados, controlados por la misma variable
 * `abierto` y mostrados con `sm:hidden` / `hidden sm:block`.
 */
export function HeaderClient({ user }: { user: HeaderUser }) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);

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

  // Cierra al hacer click fuera del header.
  useEffect(() => {
    if (!abierto) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (headerRef.current && target && !headerRef.current.contains(target)) {
        setAbierto(false);
      }
    };
    const id = window.setTimeout(() => {
      document.addEventListener("click", onClick);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("click", onClick);
    };
  }, [abierto]);

  return (
    <header className="relative bg-brand text-white" ref={headerRef}>
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-3 py-3 md:gap-4 md:px-8 md:py-4">
        <a href="/" className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="PermutaES"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 object-contain brightness-0 invert"
          />

          <div className="min-w-0">
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

        {/* === Boton hamburguesa === */}
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
          {!abierto && user && user.noLeidos > 0 && (
            <span
              className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-mint px-1 text-[10px] font-bold text-brand"
              aria-label={`${user.noLeidos} conversaciones sin leer`}
            >
              {user.noLeidos > 9 ? "9+" : user.noLeidos}
            </span>
          )}
        </button>
      </div>

      {/* === PANEL MOVIL (<sm): a ancho completo debajo del header === */}
      {abierto && (
        <div
          id="menu-principal"
          className="absolute left-0 right-0 top-full z-40 border-t border-white/10 bg-brand text-white shadow-card-hover sm:hidden"
        >
          <nav className="mx-auto flex w-full max-w-[1400px] flex-col gap-1 px-3 py-3">
            {/* Acciones primarias (en movil van aqui porque la nav
                horizontal esta oculta) */}
            <ItemMovil href="/auto-permutas" pathname={pathname}>
              Auto permutas
            </ItemMovil>
            <ItemMovil href="/anuncios" pathname={pathname}>
              Anuncios
            </ItemMovil>
            {user?.emailConfirmed && (
              <ItemMovil href="/anuncios/nuevo" pathname={pathname} destacado>
                + Publicar anuncio
              </ItemMovil>
            )}

            <div className="my-1 border-t border-white/10" aria-hidden="true" />

            {user ? (
              <>
                <ItemMovil
                  href="/mensajes"
                  pathname={pathname}
                  badge={user.noLeidos}
                >
                  Mensajes
                </ItemMovil>
                <ItemMovil href="/mi-cuenta" pathname={pathname}>
                  Mi cuenta
                </ItemMovil>
                {user.esAdmin && (
                  <ItemMovil href="/admin" pathname={pathname}>
                    Admin
                  </ItemMovil>
                )}
              </>
            ) : (
              <>
                <ItemMovil href="/login" pathname={pathname}>
                  Iniciar sesión
                </ItemMovil>
                <ItemMovil href="/registro" pathname={pathname} destacado>
                  Crear cuenta
                </ItemMovil>
              </>
            )}

            <div className="my-1 border-t border-white/10" aria-hidden="true" />

            <ItemMovil href="/sobre-el-proyecto" pathname={pathname}>
              Sobre el proyecto
            </ItemMovil>
            <ItemMovil href="/contacto" pathname={pathname}>
              Contacto
            </ItemMovil>

            {user && (
              <form action="/logout" method="POST" className="mt-1">
                <button
                  type="submit"
                  className="block w-full rounded-md px-4 py-3 text-left text-base font-medium text-white/80 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
                >
                  Cerrar sesión
                </button>
              </form>
            )}
          </nav>
        </div>
      )}

      {/* === DROPDOWN ESCRITORIO (>=sm): flotante a la derecha === */}
      {abierto && (
        <div className="absolute right-3 top-full z-40 mt-1 hidden w-72 origin-top-right rounded-xl2 border border-slate-200 bg-white text-slate-900 shadow-card-hover sm:block md:right-8">
          <nav className="flex flex-col gap-0.5 p-2">
            {user ? (
              <>
                <ItemEscritorio
                  href="/mensajes"
                  pathname={pathname}
                  badge={user.noLeidos}
                >
                  Mensajes
                </ItemEscritorio>
                <ItemEscritorio href="/mi-cuenta" pathname={pathname}>
                  Mi cuenta
                </ItemEscritorio>
                {user.esAdmin && (
                  <ItemEscritorio href="/admin" pathname={pathname}>
                    Admin
                  </ItemEscritorio>
                )}
              </>
            ) : (
              <>
                <ItemEscritorio href="/login" pathname={pathname}>
                  Iniciar sesión
                </ItemEscritorio>
                <ItemEscritorio href="/registro" pathname={pathname} destacado>
                  Crear cuenta
                </ItemEscritorio>
              </>
            )}

            <div className="my-1 border-t border-slate-200" aria-hidden="true" />

            <ItemEscritorio href="/sobre-el-proyecto" pathname={pathname}>
              Sobre el proyecto
            </ItemEscritorio>
            <ItemEscritorio href="/contacto" pathname={pathname}>
              Contacto
            </ItemEscritorio>

            {user && (
              <>
                <div className="my-1 border-t border-slate-200" aria-hidden="true" />
                <form action="/logout" method="POST">
                  <button
                    type="submit"
                    className="block w-full rounded-md px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Cerrar sesión
                  </button>
                </form>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

/**
 * Item del panel MOVIL (<sm): tema oscuro, blanco sobre verde marca.
 */
function ItemMovil({
  href,
  children,
  pathname,
  destacado,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  pathname: string;
  destacado?: boolean;
  badge?: number;
}) {
  const activo = pathname === href || pathname.startsWith(href + "/");
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

/**
 * Item del dropdown ESCRITORIO (>=sm): tema claro, slate sobre blanco.
 */
function ItemEscritorio({
  href,
  children,
  pathname,
  destacado,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  pathname: string;
  destacado?: boolean;
  badge?: number;
}) {
  const activo = pathname === href || pathname.startsWith(href + "/");
  return (
    <a
      href={href}
      className={
        "flex items-center justify-between rounded-md px-4 py-2.5 text-sm font-medium transition " +
        (destacado
          ? "bg-brand text-white hover:bg-brand-dark"
          : activo
            ? "bg-brand-bg text-brand-text"
            : "text-slate-700 hover:bg-slate-100")
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

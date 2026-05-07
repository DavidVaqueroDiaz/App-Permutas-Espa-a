"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export type HeaderUser = {
  emailConfirmed: boolean;
  noLeidos: number;
  esAdmin: boolean;
} | null;

/**
 * Cabecera con menu hamburguesa en movil. En sm+ se renderiza como
 * navegacion horizontal igual que antes; en movil se compacta a un
 * boton ☰ que abre un panel desplegable con todos los enlaces.
 *
 * El `user` viene resuelto desde el Header server component para que
 * este client no tenga que hacer queries; solo gestiona estado de UI.
 */
export function HeaderClient({ user }: { user: HeaderUser }) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

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

  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-3 py-3 md:gap-4 md:px-8 md:py-4">
        <a href="/" className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
          {/* SVG vectorial: escala perfecta a cualquier tamano. Fondo
              blanco para que el logo verde oscuro contraste sobre la
              cabecera marca verde. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="PermutaES"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-brand-mint/30"
          />

          <div className="min-w-0">
            {/* Span en lugar de h1 para evitar dos h1 por pagina (cada
                ruta debe tener UN h1, el de su contenido principal). */}
            <span className="block font-head text-xl font-semibold leading-tight md:text-[22px]">
              PermutaES
            </span>
            <p className="hidden text-[13px] leading-tight text-brand-mint sm:block md:text-sm">
              Permutas de plaza para funcionarios públicos
            </p>
          </div>
        </a>

        {/* === Navegacion DESKTOP (>=sm) === */}
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

          {user ? (
            <>
              {user.emailConfirmed && (
                <a
                  href="/anuncios/nuevo"
                  className="rounded-full bg-brand-mint/20 px-3 py-1.5 text-sm font-medium text-white ring-1 ring-brand-mint/40 hover:bg-brand-mint/30"
                >
                  + Publicar anuncio
                </a>
              )}
              <a
                href="/mensajes"
                className="relative text-sm text-white/85 hover:text-white"
              >
                Mensajes
                {user.noLeidos > 0 && (
                  <span
                    className="absolute -right-3 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-mint px-1 text-[10px] font-bold text-brand"
                    aria-label={`${user.noLeidos} conversaciones sin leer`}
                  >
                    {user.noLeidos > 9 ? "9+" : user.noLeidos}
                  </span>
                )}
              </a>
              <a href="/mi-cuenta" className="text-sm text-white/85 hover:text-white">
                Mi cuenta
              </a>
              {user.esAdmin && (
                <a
                  href="/admin"
                  className="rounded-full bg-brand-mint/20 px-3 py-1 text-xs font-medium text-white ring-1 ring-brand-mint/40 hover:bg-brand-mint/30"
                  title="Panel de administración"
                >
                  Admin
                </a>
              )}
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
              <a href="/login" className="text-sm text-white/85 hover:text-white">
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

          {/* Contacto siempre visible al final del nav, para que cualquiera
              pueda enviarnos sugerencias o reportar bugs sin tener que
              bajar al footer. Se separa con un divider sutil. */}
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-white/15" />
          <a
            href="/contacto"
            title="Enviarnos sugerencias o reportar un problema"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/85 ring-1 ring-white/15 hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <path
                d="M4 6 H20 V18 H4 Z M4 6 L12 13 L20 6"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            Contacto
          </a>
        </nav>

        {/* === Boton hamburguesa MOVIL (<sm) === */}
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-controls="menu-movil"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          className="relative ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-white/15 hover:bg-white/10 sm:hidden"
        >
          {/* Icono ☰ / ✕ */}
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
      </div>

      {/* === Panel desplegable MOVIL === */}
      {abierto && (
        <div
          id="menu-movil"
          className="border-t border-white/10 bg-brand sm:hidden"
        >
          <nav className="mx-auto flex w-full max-w-[1400px] flex-col gap-1 px-3 py-3">
            <ItemMovil href="/auto-permutas" pathname={pathname}>
              🔍 Auto permutas
            </ItemMovil>
            <ItemMovil href="/anuncios" pathname={pathname}>
              📋 Anuncios
            </ItemMovil>

            {user ? (
              <>
                {user.emailConfirmed && (
                  <ItemMovil href="/anuncios/nuevo" pathname={pathname} destacado>
                    + Publicar anuncio
                  </ItemMovil>
                )}
                <ItemMovil
                  href="/mensajes"
                  pathname={pathname}
                  badge={user.noLeidos}
                >
                  💬 Mensajes
                </ItemMovil>
                <ItemMovil href="/mi-cuenta" pathname={pathname}>
                  👤 Mi cuenta
                </ItemMovil>
                {user.esAdmin && (
                  <ItemMovil href="/admin" pathname={pathname}>
                    ⚙ Admin
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

            {/* Separador + Contacto (siempre visible, login o no) */}
            <div className="my-1 border-t border-white/10" aria-hidden="true" />
            <ItemMovil href="/contacto" pathname={pathname}>
              ✉ Contacto
            </ItemMovil>

            {/* Cerrar sesion al final si esta logueado */}
            {user && (
              <form action="/logout" method="POST" className="mt-1">
                <button
                  type="submit"
                  className="block w-full rounded-md px-4 py-3 text-left text-sm text-white/80 ring-1 ring-white/10 hover:bg-white/10"
                >
                  Cerrar sesión
                </button>
              </form>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

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

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Banner persistente que aparece arriba de toda la web cuando el
 * usuario tiene el modo demo ACTIVO. Recuerda que esta viendo datos
 * sinteticos y le permite desactivar el modo con un click.
 *
 * El componente recibe `activo` ya resuelto desde el server (via
 * cookie) para evitar parpadeo entre SSR y client.
 */
export function DemoBanner({ activo }: { activo: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!activo) return null;

  function desactivar() {
    document.cookie = "permutaes-demo=0; path=/; max-age=0; SameSite=Lax";
    try {
      window.localStorage.setItem("permutaes-demo", "0");
    } catch {
      /* localStorage puede estar bloqueado */
    }
    start(() => router.refresh());
  }

  return (
    <div className="border-b border-amber-300 bg-amber-100 text-amber-900">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-3 py-2 text-sm md:px-8">
        <span className="font-semibold">MODO DEMO ACTIVO</span>
        <span className="hidden flex-1 sm:inline">
          Estás viendo anuncios de demostración mientras la plataforma se
          llena de usuarios reales. Las cadenas que veas son simuladas.
        </span>
        <span className="flex-1 sm:hidden">Anuncios simulados.</span>
        <button
          type="button"
          onClick={desactivar}
          disabled={pending}
          className="ml-auto rounded-md border border-amber-400 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50"
        >
          {pending ? "Desactivando…" : "Desactivar demo"}
        </button>
      </div>
    </div>
  );
}

/**
 * Boton para ACTIVAR el modo demo. Se renderiza en empty states y
 * lugares clave donde el usuario podria querer ver como funciona la
 * app antes de registrarse.
 */
export function ActivarDemoBoton({
  className = "",
  children = "Activar modo demo",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function activar() {
    document.cookie = "permutaes-demo=1; path=/; max-age=31536000; SameSite=Lax";
    try {
      window.localStorage.setItem("permutaes-demo", "1");
    } catch {
      /* localStorage puede estar bloqueado */
    }
    start(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={activar}
      disabled={pending}
      className={
        className ||
        "inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
      }
    >
      {pending ? "Activando…" : children}
    </button>
  );
}

"use client";

import { useActionState, useSyncExternalStore } from "react";
import { iniciarSesion, type LoginState } from "./actions";

function suscribirFragmento(avisar: () => void) {
  window.addEventListener("hashchange", avisar);
  return () => window.removeEventListener("hashchange", avisar);
}

/**
 * `destino`: pagina a la que volver tras entrar (ya validada en el
 * servidor). El fragmento (#anuncio-...) solo lo conoce el navegador, asi
 * que se envia aparte.
 */
export function LoginForm({ destino }: { destino?: string | null }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    iniciarSesion,
    null,
  );
  const fragmento = useSyncExternalStore(
    suscribirFragmento,
    () => window.location.hash,
    () => "",
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {destino && <input type="hidden" name="redirect" value={destino} />}
      <input type="hidden" name="fragmento" value={fragmento} />
      {state && !state.ok && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-900">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-900">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
        />
        <p className="mt-1 text-right text-xs">
          <a href="/recuperar-contrasena" className="text-slate-500 underline">
            ¿Has olvidado la contraseña?
          </a>
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-light disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Iniciar sesión"}
      </button>

      <p className="text-center text-sm text-slate-600">
        ¿No tienes cuenta?{" "}
        <a href="/registro" className="font-medium text-slate-900 underline">
          Crear una
        </a>
      </p>
    </form>
  );
}

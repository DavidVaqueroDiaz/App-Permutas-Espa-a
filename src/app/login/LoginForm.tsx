"use client";

import { useActionState } from "react";
import { iniciarSesion, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    iniciarSesion,
    null,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state && !state.ok && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <p className="mt-1 text-right text-xs">
          <a href="/recuperar-contrasena" className="text-slate-500 underline dark:text-slate-400">
            ¿Has olvidado la contraseña?
          </a>
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        {pending ? "Entrando..." : "Iniciar sesión"}
      </button>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        ¿No tienes cuenta?{" "}
        <a href="/registro" className="font-medium text-slate-900 underline dark:text-slate-100">
          Crear una
        </a>
      </p>
    </form>
  );
}

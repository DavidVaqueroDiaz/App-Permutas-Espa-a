"use client";

import { useActionState } from "react";
import { registrarUsuario, type RegistroState } from "./actions";

export function RegistroForm() {
  const [state, formAction, pending] = useActionState<RegistroState, FormData>(
    registrarUsuario,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100">
        <h2 className="text-lg font-semibold">¡Cuenta creada!</h2>
        <p className="mt-2 text-sm">{state.message}</p>
        <p className="mt-4 text-sm">
          Una vez confirmes el email, podrás{" "}
          <a href="/login" className="font-medium underline">
            iniciar sesión
          </a>
          .
        </p>
      </div>
    );
  }

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Mínimo 8 caracteres.</p>
        </div>
        <div>
          <label htmlFor="password2" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
            Repetir contraseña
          </label>
          <input
            id="password2"
            name="password2"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div>
        <label htmlFor="alias_publico" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Alias público
        </label>
        <input
          id="alias_publico"
          name="alias_publico"
          type="text"
          required
          minLength={3}
          maxLength={20}
          pattern="[a-zA-Z0-9_-]+"
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          3-20 caracteres. Letras, números, guiones. Es lo que verán otros usuarios.
        </p>
      </div>

      <div>
        <label htmlFor="ano_nacimiento" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Año de nacimiento
        </label>
        <input
          id="ano_nacimiento"
          name="ano_nacimiento"
          type="number"
          required
          min={1940}
          max={new Date().getFullYear() - 18}
          placeholder="Ej: 1985"
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Solo se usa para validar reglas legales (ej. los 10 años hasta jubilación). No se muestra públicamente.
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="acepta_privacidad" required className="mt-1" />
          <span>
            He leído y acepto la{" "}
            <a href="/politica-privacidad" target="_blank" className="underline">
              política de privacidad
            </a>
            .
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="acepta_condiciones" required className="mt-1" />
          <span>
            He leído y acepto las{" "}
            <a href="/condiciones-uso" target="_blank" className="underline">
              condiciones de uso
            </a>
            .
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        ¿Ya tienes cuenta?{" "}
        <a href="/login" className="font-medium text-slate-900 underline dark:text-slate-100">
          Inicia sesión
        </a>
      </p>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { restablecerContrasena, type RestablecerState } from "./actions";

export function RestablecerForm() {
  const [state, formAction, pending] = useActionState<RestablecerState, FormData>(
    restablecerContrasena,
    null,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state && !state.ok && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-900">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
        />
        <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
      </div>

      <div>
        <label htmlFor="password2" className="block text-sm font-medium text-slate-900">
          Repetir nueva contraseña
        </label>
        <input
          id="password2"
          name="password2"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-light disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Guardar nueva contraseña"}
      </button>
    </form>
  );
}

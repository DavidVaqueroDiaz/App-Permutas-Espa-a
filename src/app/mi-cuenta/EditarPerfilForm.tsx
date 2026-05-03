"use client";

import { useActionState } from "react";
import { actualizarPerfil, type ActionState } from "./actions";

type Props = {
  aliasInicial: string;
  anoInicial: number;
};

export function EditarPerfilForm({ aliasInicial, anoInicial }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    actualizarPerfil,
    null,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && (
        <div
          className={
            state.ok
              ? "rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-100"
              : "rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200"
          }
        >
          {state.message}
        </div>
      )}

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
          defaultValue={aliasInicial}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">3-20 caracteres. Lo que verán otros usuarios.</p>
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
          defaultValue={anoInicial}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Solo se usa para validar reglas legales. No se muestra públicamente.</p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

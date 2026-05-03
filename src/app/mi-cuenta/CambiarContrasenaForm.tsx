"use client";

import { useActionState, useRef, useEffect } from "react";
import { cambiarContrasena, type ActionState } from "./actions";

export function CambiarContrasenaForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    cambiarContrasena,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4" noValidate>
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
        <label htmlFor="cc-password" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Nueva contraseña
        </label>
        <input
          id="cc-password"
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
        <label htmlFor="cc-password2" className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Repetir nueva contraseña
        </label>
        <input
          id="cc-password2"
          name="password2"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        {pending ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}

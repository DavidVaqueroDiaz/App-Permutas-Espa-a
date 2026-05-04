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
              ? "rounded-md border border-brand-mint/40 bg-brand-bg p-3 text-sm text-brand-text"
              : "rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          }
        >
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="cc-password" className="block text-sm font-medium text-slate-900">
          Nueva contraseña
        </label>
        <input
          id="cc-password"
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
        <label htmlFor="cc-password2" className="block text-sm font-medium text-slate-900">
          Repetir nueva contraseña
        </label>
        <input
          id="cc-password2"
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
        className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}

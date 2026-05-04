"use client";

import { useActionState } from "react";
import { solicitarRecuperacion, type RecuperarState } from "./actions";

export function RecuperarForm() {
  const [state, formAction, pending] = useActionState<RecuperarState, FormData>(
    solicitarRecuperacion,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-lg border border-brand-mint/40 bg-brand-bg p-6 text-brand-text">
        <h2 className="text-lg font-semibold">Comprueba tu email</h2>
        <p className="mt-2 text-sm">{state.message}</p>
        <p className="mt-4 text-sm">
          <a href="/login" className="font-medium underline">Volver al inicio de sesión</a>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-900">
          Tu email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
        />
        <p className="mt-1 text-xs text-slate-500">
          Te enviaremos un enlace para crear una nueva contraseña.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-light disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar enlace"}
      </button>

      <p className="text-center text-sm text-slate-600">
        <a href="/login" className="font-medium text-slate-900 underline">
          Volver al inicio de sesión
        </a>
      </p>
    </form>
  );
}

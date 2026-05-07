"use client";

import { useActionState } from "react";
import { enviarContacto, type ContactoState } from "./actions";

export function ContactoForm() {
  const [state, formAction, pending] = useActionState<ContactoState, FormData>(
    enviarContacto,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-md border border-brand-mint/40 bg-brand-bg p-4 text-sm text-brand-text">
        <p className="font-semibold">¡Mensaje enviado!</p>
        <p className="mt-1">
          Te responderemos al email que indicaste lo antes posible. Si
          no llega nada en 72h, revisa tu carpeta de spam.
        </p>
      </div>
    );
  }

  // Si hubo error, recuperamos los valores escritos para no obligar a
  // teclear de nuevo.
  const valores = state && !state.ok ? state.valoresEnviados : undefined;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && !state.ok && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {state.mensaje}
        </div>
      )}

      <div>
        <label
          htmlFor="contacto-nombre"
          className="block text-sm font-medium text-slate-900"
        >
          Tu nombre
        </label>
        <input
          id="contacto-nombre"
          name="nombre"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={valores?.nombre ?? ""}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
        />
      </div>

      <div>
        <label
          htmlFor="contacto-email"
          className="block text-sm font-medium text-slate-900"
        >
          Email donde respondemos
        </label>
        <input
          id="contacto-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={200}
          defaultValue={valores?.email ?? ""}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
        />
        <p className="mt-1 text-xs text-slate-500">
          Solo lo usamos para responder a tu mensaje.
        </p>
      </div>

      <div>
        <label
          htmlFor="contacto-mensaje"
          className="block text-sm font-medium text-slate-900"
        >
          Mensaje
        </label>
        <textarea
          id="contacto-mensaje"
          name="mensaje"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          defaultValue={valores?.mensaje ?? ""}
          placeholder="Cuéntanos qué necesitas: una duda, una sugerencia, un fallo que has detectado…"
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light"
        />
        <p className="mt-1 text-xs text-slate-500">
          Mínimo 10 caracteres, máximo 5000.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-light disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}

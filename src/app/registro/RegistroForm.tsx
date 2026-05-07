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
      <div className="rounded-lg border border-brand-mint/40 bg-brand-bg p-6 text-brand-text">
        <h2 className="text-lg font-semibold">¡Cuenta creada!</h2>
        <p className="mt-2 text-sm">{state.message}</p>
        <div className="mt-4 rounded-md border border-brand-mint/50 bg-white/60 p-3 text-sm">
          <p className="font-semibold text-brand">Tus siguientes pasos:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>
              Confirma tu email pinchando el enlace que te hemos enviado.
            </li>
            <li>
              Publica tu anuncio con tu plaza actual y los destinos que buscas.
            </li>
            <li>
              Te avisaremos por email en cuanto detectemos una cadena que te
              incluya.
            </li>
          </ol>
        </div>
        <p className="mt-4 text-sm">
          ¿Ya confirmaste el email?{" "}
          <a href="/login" className="font-medium underline">
            Inicia sesión
          </a>
          .
        </p>
      </div>
    );
  }

  // Si hay error, recuperamos los valores que el usuario habia escrito
  // para no obligarle a teclearlos de nuevo (NO recuperamos contrasenas
  // por seguridad — se vacian siempre).
  const valores = state && !state.ok ? state.valoresEnviados : undefined;
  const campo = state && !state.ok ? state.campoConError : undefined;

  return (
    <form action={formAction} className="space-y-5" noValidate>
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
          defaultValue={valores?.email ?? ""}
          aria-invalid={campo === "email" || undefined}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light aria-[invalid=true]:border-red-400"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-900">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={campo === "password" || undefined}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light aria-[invalid=true]:border-red-400"
          />
          <p className="mt-1 text-xs text-slate-500">Mínimo 8 caracteres.</p>
        </div>
        <div>
          <label htmlFor="password2" className="block text-sm font-medium text-slate-900">
            Repetir contraseña
          </label>
          <input
            id="password2"
            name="password2"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={campo === "password2" || undefined}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light aria-[invalid=true]:border-red-400"
          />
        </div>
      </div>

      <div>
        <label htmlFor="alias_publico" className="block text-sm font-medium text-slate-900">
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
          defaultValue={valores?.alias_publico ?? ""}
          aria-invalid={campo === "alias_publico" || undefined}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light aria-[invalid=true]:border-red-400"
        />
        <p className="mt-1 text-xs text-slate-500">
          3-20 caracteres. Letras, números, guiones. Es lo que verán otros usuarios.
        </p>
      </div>

      <div>
        <label htmlFor="ano_nacimiento" className="block text-sm font-medium text-slate-900">
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
          defaultValue={valores?.ano_nacimiento ?? ""}
          aria-invalid={campo === "ano_nacimiento" || undefined}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-light aria-[invalid=true]:border-red-400"
        />
        <p className="mt-1 text-xs text-slate-500">
          Solo se usa para validar reglas legales (ej. los 10 años hasta jubilación). No se muestra públicamente.
        </p>
      </div>

      <div
        className={
          "space-y-2 rounded-md border p-3 text-sm " +
          (campo === "checkboxes"
            ? "border-red-300 bg-red-50 text-red-900"
            : "border-slate-200 bg-slate-50 text-slate-700")
        }
      >
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
        className="w-full rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-light disabled:opacity-60"
      >
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </button>

      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <a href="/login" className="font-medium text-slate-900 underline">
          Inicia sesión
        </a>
      </p>
    </form>
  );
}

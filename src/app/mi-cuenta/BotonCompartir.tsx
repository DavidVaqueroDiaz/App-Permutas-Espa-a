"use client";

import { useState } from "react";

/**
 * Tarjeta de "Compartir con un companero".
 *
 * Cuanto mas funcionarios entren en la plataforma, mas cadenas se
 * detectan y mas valor genera para todos. Por eso le facilitamos al
 * usuario actual mandar la app a un companero con un click.
 *
 * En movil usa Web Share API (abre el menu nativo de compartir:
 * WhatsApp, Telegram, Mail...). En escritorio o sin Web Share, copia
 * el mensaje pre-redactado al portapapeles y le ensena un toast.
 */
export function BotonCompartir() {
  const [estado, setEstado] = useState<"idle" | "copiado" | "compartido" | "error">(
    "idle",
  );

  const url = typeof window !== "undefined" ? window.location.origin : "https://permutaes.es";
  const titulo = "PermutaES — permutas de plaza entre funcionarios";
  const texto =
    "He encontrado esta plataforma gratuita para detectar cadenas de " +
    "permuta de plaza entre funcionarios públicos en España. Cubre " +
    "docencia, sanidad SNS, AGE, autonómicos, locales, habilitados " +
    "nacionales y policía local. Échale un ojo: " +
    url;

  async function compartir() {
    setEstado("idle");

    // Web Share API si esta disponible (movil principalmente).
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & {
          share: (data: { title: string; text: string; url: string }) => Promise<void>;
        }).share({
          title: titulo,
          text: texto,
          url,
        });
        setEstado("compartido");
        return;
      } catch (e) {
        // El usuario puede haber cancelado el dialogo. No es error real.
        if (e instanceof Error && e.name === "AbortError") {
          setEstado("idle");
          return;
        }
        // Cualquier otro fallo, fall-back a portapapeles.
      }
    }

    // Fallback: portapapeles.
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
      // El toast vuelve a "idle" tras 3 segundos.
      setTimeout(() => setEstado("idle"), 3000);
    } catch {
      setEstado("error");
    }
  }

  return (
    <div className="rounded-xl2 border border-brand-mint/40 bg-brand-bg/30 p-5 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-text">
        💌 ¿Conoces a otro funcionario interesado?
      </p>
      <h3 className="mt-1 font-head text-lg font-semibold text-brand">
        Comparte PermutaES con un compañero
      </h3>
      <p className="mt-1 text-sm text-slate-700">
        Cuantos más anuncios haya en tu sector y zona, más fácil aparece
        una cadena que te incluya. Un click y le mandas la plataforma a
        alguien que pueda interesarle.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={compartir}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark"
        >
          📢 Compartir
        </button>

        {estado === "copiado" && (
          <span className="rounded-md bg-brand-mint/30 px-2.5 py-1 text-xs font-medium text-brand-text">
            ✓ Mensaje copiado al portapapeles
          </span>
        )}
        {estado === "compartido" && (
          <span className="rounded-md bg-brand-mint/30 px-2.5 py-1 text-xs font-medium text-brand-text">
            ✓ Compartido, gracias
          </span>
        )}
        {estado === "error" && (
          <span className="rounded-md bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
            No se pudo copiar. Pega el enlace a mano: {url}
          </span>
        )}
      </div>

      <details className="mt-3 text-xs text-slate-500">
        <summary className="cursor-pointer hover:text-slate-700">
          Ver el mensaje que se va a compartir
        </summary>
        <p className="mt-2 whitespace-pre-line rounded-md border border-slate-200 bg-white p-3 italic text-slate-700">
          {texto}
        </p>
      </details>
    </div>
  );
}

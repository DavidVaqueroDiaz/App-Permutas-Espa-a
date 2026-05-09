"use client";

import { useState } from "react";

/**
 * Boton "Compartir" compacto pensado para vivir DENTRO del menu
 * hamburguesa (escritorio + movil). Usa la Web Share API si esta
 * disponible (movil) y fall-back a copiar al portapapeles.
 *
 * Es una variante del componente BotonCompartir grande que vive en
 * /mi-cuenta — aqui solo necesitamos un item compacto que se integra
 * con los demas <a> del menu.
 *
 * Props:
 *   - tema: "movil" usa los colores del panel verde de la cabecera;
 *           "escritorio" los del dropdown blanco.
 */
const TITULO = "PermutaES — permutas de plaza entre funcionarios";
const TEXTO_COMPARTIR =
  "He encontrado esta plataforma gratuita para detectar cadenas de " +
  "permuta de plaza entre funcionarios públicos en España. Cubre " +
  "docencia, sanidad SNS, AGE, autonómicos, locales, habilitados " +
  "nacionales y policía local. Échale un ojo: https://permutaes.es";

export function BotonCompartirMenu({
  tema,
}: {
  tema: "movil" | "escritorio";
}) {
  const [estado, setEstado] = useState<"idle" | "copiado" | "compartido">(
    "idle",
  );

  async function compartir() {
    setEstado("idle");
    const url =
      typeof window !== "undefined" ? window.location.origin : "https://permutaes.es";

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & {
          share: (data: { title: string; text: string; url: string }) => Promise<void>;
        }).share({
          title: TITULO,
          text: TEXTO_COMPARTIR,
          url,
        });
        setEstado("compartido");
        setTimeout(() => setEstado("idle"), 2500);
        return;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(TEXTO_COMPARTIR);
      setEstado("copiado");
      setTimeout(() => setEstado("idle"), 2500);
    } catch {
      /* ignoramos */
    }
  }

  const claseMovil =
    "flex w-full items-center justify-between rounded-md px-4 py-3 text-base font-medium text-white/85 transition hover:bg-white/10 hover:text-white";
  const claseEscritorio =
    "flex w-full items-center justify-between rounded-md px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100";

  return (
    <button
      type="button"
      onClick={compartir}
      className={tema === "movil" ? claseMovil : claseEscritorio}
    >
      <span>Compartir</span>
      {estado === "copiado" && (
        <span
          className={
            "rounded px-1.5 py-0.5 text-[10px] " +
            (tema === "movil"
              ? "bg-brand-mint/30 text-brand-mint"
              : "bg-brand-bg text-brand-text")
          }
        >
          copiado
        </span>
      )}
      {estado === "compartido" && (
        <span
          className={
            "rounded px-1.5 py-0.5 text-[10px] " +
            (tema === "movil"
              ? "bg-brand-mint/30 text-brand-mint"
              : "bg-brand-bg text-brand-text")
          }
        >
          ¡gracias!
        </span>
      )}
    </button>
  );
}

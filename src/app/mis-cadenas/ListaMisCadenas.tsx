"use client";

import { CadenaCard } from "@/app/auto-permutas/Buscador";
import type { CadenasDeAnuncio } from "@/lib/cadenas/mis-cadenas";

export function ListaMisCadenas({ grupos }: { grupos: CadenasDeAnuncio[] }) {
  return (
    <div className="mt-6 space-y-10">
      {grupos.map((g) => (
        <section key={g.anuncioId}>
          <header className="mb-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">
              Tu anuncio en {g.municipioActual}
            </p>
            <h2 className="font-head text-lg font-semibold text-slate-900">
              {g.cuerpoTexto}
              {g.especialidadTexto ? ` · ${g.especialidadTexto}` : ""}
            </h2>
            <p className="text-sm text-slate-600">
              {g.cadenas.length}{" "}
              {g.cadenas.length === 1 ? "cadena posible" : "cadenas posibles"}
            </p>
          </header>
          <div className="space-y-4">
            {g.cadenas.map((c, i) => (
              <CadenaCard key={c.huella} cadena={c} mejor={i === 0 && g.cadenas.length > 1} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

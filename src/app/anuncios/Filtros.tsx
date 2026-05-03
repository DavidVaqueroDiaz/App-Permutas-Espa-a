"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Opcion = { value: string; label: string };

type Props = {
  sectores: Opcion[];
  ccaas: Opcion[];
};

export function Filtros({ sectores, ccaas }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const sectorActual = params.get("sector") ?? "";
  const ccaaActual = params.get("ccaa") ?? "";

  function actualizar(parche: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(parche)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `/anuncios?${qs}` : "/anuncios");
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex-1 min-w-[180px]">
        <label htmlFor="filtro-sector" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Sector
        </label>
        <select
          id="filtro-sector"
          value={sectorActual}
          onChange={(e) => actualizar({ sector: e.target.value })}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Todos los sectores</option>
          {sectores.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[180px]">
        <label htmlFor="filtro-ccaa" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          Comunidad Autónoma
        </label>
        <select
          id="filtro-ccaa"
          value={ccaaActual}
          onChange={(e) => actualizar({ ccaa: e.target.value })}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Todas las CCAA</option>
          {ccaas.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {(sectorActual || ccaaActual) && (
        <button
          type="button"
          onClick={() => actualizar({ sector: "", ccaa: "" })}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Quitar filtros
        </button>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  buscarMunicipios,
  expandirAtajos,
  type MunicipioBusqueda,
} from "@/app/anuncios/nuevo/actions";
import {
  actualizarAnuncioYRedirigir,
  eliminarAnuncio,
} from "./actions";
import type {
  AtajoState,
  CcaaRow,
  ProvinciaRow,
} from "@/app/anuncios/nuevo/types";

type Props = {
  anuncioId: string;
  resumen: {
    sectorNombre: string;
    cuerpoTexto: string;
    especialidadTexto: string | null;
    municipioActualNombre: string;
    municipioActualCodigo: string;
  };
  ccaa: CcaaRow[];
  provincias: ProvinciaRow[];
  estadoInicial: {
    fecha_toma_posesion_definitiva: string;
    anyos_servicio_totales: number;
    permuta_anterior_fecha: string | null;
    observaciones: string;
    plazas_deseadas: string[];
    atajos: AtajoState[];
    plazas_individuales_nombres: Record<string, string>;
  };
};

export function EditarForm({
  anuncioId,
  resumen,
  ccaa,
  provincias,
  estadoInicial,
}: Props) {
  const router = useRouter();

  const [fecha, setFecha] = useState(estadoInicial.fecha_toma_posesion_definitiva);
  const [anyos, setAnyos] = useState<number | "">(estadoInicial.anyos_servicio_totales);
  const [haPermutado, setHaPermutado] = useState<boolean>(
    estadoInicial.permuta_anterior_fecha !== null,
  );
  const [fechaPermuta, setFechaPermuta] = useState<string>(
    estadoInicial.permuta_anterior_fecha ?? "",
  );
  const [observaciones, setObservaciones] = useState<string>(estadoInicial.observaciones);

  const [plazas, setPlazas] = useState<string[]>(estadoInicial.plazas_deseadas);
  const [atajos, setAtajos] = useState<AtajoState[]>(estadoInicial.atajos);
  const [plazasNombres, setPlazasNombres] = useState<Record<string, string>>(
    estadoInicial.plazas_individuales_nombres,
  );

  const [ccaaSel, setCcaaSel] = useState("");
  const [provSel, setProvSel] = useState("");
  const [aplicando, setAplicando] = useState(false);

  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, startGuardar] = useTransition();
  const [eliminando, startEliminar] = useTransition();

  const ccaaUsadas = new Set(atajos.filter((a) => a.tipo === "ccaa").map((a) => a.valor));
  const provUsadas = new Set(atajos.filter((a) => a.tipo === "provincia").map((a) => a.valor));

  async function añadirCcaa() {
    if (!ccaaSel || ccaaUsadas.has(ccaaSel)) return;
    setAplicando(true);
    try {
      const nuevoAtajos: AtajoState[] = [...atajos, { tipo: "ccaa", valor: ccaaSel }];
      const expandidos = await expandirAtajos(nuevoAtajos);
      const indivCodes = atajos
        .filter((a) => a.tipo === "municipio_individual")
        .map((a) => a.valor);
      const setUnion = new Set([...expandidos, ...indivCodes]);
      setUnion.delete(resumen.municipioActualCodigo);
      setAtajos(nuevoAtajos);
      setPlazas(Array.from(setUnion));
      setCcaaSel("");
    } finally {
      setAplicando(false);
    }
  }
  async function añadirProv() {
    if (!provSel || provUsadas.has(provSel)) return;
    setAplicando(true);
    try {
      const nuevoAtajos: AtajoState[] = [...atajos, { tipo: "provincia", valor: provSel }];
      const expandidos = await expandirAtajos(nuevoAtajos);
      const indivCodes = atajos
        .filter((a) => a.tipo === "municipio_individual")
        .map((a) => a.valor);
      const setUnion = new Set([...expandidos, ...indivCodes]);
      setUnion.delete(resumen.municipioActualCodigo);
      setAtajos(nuevoAtajos);
      setPlazas(Array.from(setUnion));
      setProvSel("");
    } finally {
      setAplicando(false);
    }
  }
  async function quitarAtajo(a: AtajoState) {
    setAplicando(true);
    try {
      const nuevoAtajos = atajos.filter(
        (x) => !(x.tipo === a.tipo && x.valor === a.valor),
      );
      const expandidos = await expandirAtajos(nuevoAtajos);
      const indivCodes = nuevoAtajos
        .filter((x) => x.tipo === "municipio_individual")
        .map((x) => x.valor);
      const setUnion = new Set([...expandidos, ...indivCodes]);
      setUnion.delete(resumen.municipioActualCodigo);
      setAtajos(nuevoAtajos);
      setPlazas(Array.from(setUnion));
      if (a.tipo === "municipio_individual") {
        const nn = { ...plazasNombres };
        delete nn[a.valor];
        setPlazasNombres(nn);
      }
    } finally {
      setAplicando(false);
    }
  }

  function añadirMunicipio(m: MunicipioBusqueda) {
    if (m.codigo_ine === resumen.municipioActualCodigo) {
      setErrorGeneral("No puedes añadir tu municipio actual a las plazas deseadas.");
      return;
    }
    if (plazas.includes(m.codigo_ine)) return;
    setErrorGeneral(null);
    setAtajos([...atajos, { tipo: "municipio_individual", valor: m.codigo_ine }]);
    setPlazas([...plazas, m.codigo_ine]);
    setPlazasNombres({ ...plazasNombres, [m.codigo_ine]: `${m.nombre} (${m.provincia_nombre})` });
  }

  function guardar() {
    if (typeof anyos !== "number") {
      setErrorGeneral("Indica los años de servicio.");
      return;
    }
    setErrorGeneral(null);
    startGuardar(async () => {
      try {
        const r = await actualizarAnuncioYRedirigir(anuncioId, {
          fecha_toma_posesion_definitiva: fecha,
          anyos_servicio_totales: anyos,
          permuta_anterior_fecha: haPermutado ? fechaPermuta || null : null,
          observaciones,
          plazas_deseadas: plazas,
          atajos,
        });
        if (r && !r.ok) setErrorGeneral(r.mensaje);
      } catch {/* redirect */}
    });
  }

  function eliminar() {
    if (!confirm("¿Seguro que quieres eliminar este anuncio? Esta acción no se puede deshacer.")) return;
    startEliminar(async () => {
      const r = await eliminarAnuncio(anuncioId);
      if (r.ok) {
        router.push("/mi-cuenta?eliminado=1");
      } else {
        setErrorGeneral(r.mensaje);
      }
    });
  }

  const atajosCcaa = atajos.filter((a) => a.tipo === "ccaa");
  const atajosProv = atajos.filter((a) => a.tipo === "provincia");
  const atajosIndiv = atajos.filter((a) => a.tipo === "municipio_individual");

  return (
    <div className="space-y-6">
      {errorGeneral && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorGeneral}
        </div>
      )}

      <Card titulo="Datos fijos del anuncio">
        <p className="text-sm text-slate-600">
          {resumen.sectorNombre}
        </p>
        <p className="font-medium text-slate-900">
          {resumen.cuerpoTexto}
        </p>
        {resumen.especialidadTexto && (
          <p className="text-sm text-slate-700">
            {resumen.especialidadTexto}
          </p>
        )}
        <p className="mt-2 text-sm">
          <span className="font-medium">Plaza actual:</span> {resumen.municipioActualNombre}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Para cambiar sector, cuerpo, especialidad o plaza actual, elimina este anuncio y crea uno nuevo.
        </p>
      </Card>

      <Card titulo="Plazas deseadas">
        <div className="mb-3 flex gap-2">
          <select
            value={ccaaSel}
            onChange={(e) => setCcaaSel(e.target.value)}
            disabled={aplicando}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Toda una Comunidad Autónoma…</option>
            {ccaa.filter((c) => !ccaaUsadas.has(c.codigo_ine)).map((c) => (
              <option key={c.codigo_ine} value={c.codigo_ine}>{c.nombre}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!ccaaSel || aplicando}
            onClick={añadirCcaa}
            className="rounded-md bg-brand px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Añadir
          </button>
        </div>

        <div className="mb-3 flex gap-2">
          <select
            value={provSel}
            onChange={(e) => setProvSel(e.target.value)}
            disabled={aplicando}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Toda una provincia…</option>
            {provincias.filter((p) => !provUsadas.has(p.codigo_ine)).map((p) => (
              <option key={p.codigo_ine} value={p.codigo_ine}>{p.nombre}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!provSel || aplicando}
            onClick={añadirProv}
            className="rounded-md bg-brand px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            Añadir
          </button>
        </div>

        <BuscadorMunicipios onSeleccionar={añadirMunicipio} />

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="mb-2 font-medium">
            {plazas.length} {plazas.length === 1 ? "municipio seleccionado" : "municipios seleccionados"}
          </p>
          {atajosCcaa.length > 0 && (
            <ChipsLine titulo="CCAA enteras">
              {atajosCcaa.map((a) => (
                <Chip
                  key={a.valor}
                  label={ccaa.find((c) => c.codigo_ine === a.valor)?.nombre ?? a.valor}
                  onQuitar={() => quitarAtajo(a)}
                />
              ))}
            </ChipsLine>
          )}
          {atajosProv.length > 0 && (
            <ChipsLine titulo="Provincias enteras">
              {atajosProv.map((a) => (
                <Chip
                  key={a.valor}
                  label={provincias.find((p) => p.codigo_ine === a.valor)?.nombre ?? a.valor}
                  onQuitar={() => quitarAtajo(a)}
                />
              ))}
            </ChipsLine>
          )}
          {atajosIndiv.length > 0 && (
            <ChipsLine titulo="Municipios sueltos">
              {atajosIndiv.map((a) => (
                <Chip
                  key={a.valor}
                  label={plazasNombres[a.valor] ?? a.valor}
                  onQuitar={() => quitarAtajo(a)}
                />
              ))}
            </ChipsLine>
          )}
          {atajosCcaa.length === 0 && atajosProv.length === 0 && atajosIndiv.length === 0 && (
            <p className="text-xs text-slate-500">No hay nada seleccionado.</p>
          )}
        </div>
      </Card>

      <Card titulo="Datos legales">
        <div className="space-y-4">
          <Field label="Fecha de toma de posesión definitiva">
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Años totales de servicio">
            <input
              type="number"
              min={0}
              max={50}
              value={anyos}
              onChange={(e) => {
                const v = e.target.value;
                setAnyos(v === "" ? "" : Number.parseInt(v, 10));
              }}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </Field>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={haPermutado}
                onChange={(e) => setHaPermutado(e.target.checked)}
              />
              <span>Ya he permutado antes</span>
            </label>
            {haPermutado && (
              <Field label="Fecha de la última permuta">
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={fechaPermuta}
                  onChange={(e) => setFechaPermuta(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </Field>
            )}
          </div>
        </div>
      </Card>

      <Card titulo="Observaciones (opcional)">
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value.slice(0, 500))}
          rows={4}
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <p className="mt-1 text-right text-xs text-slate-500">{500 - observaciones.length} caracteres restantes</p>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={eliminar}
          disabled={eliminando || guardando}
          className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {eliminando ? "Eliminando…" : "Eliminar anuncio"}
        </button>
        <div className="flex gap-2">
          <a
            href="/mi-cuenta"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </a>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || eliminando}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Helpers UI
// ----------------------------------------------------------------------

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl2 border border-slate-200 bg-white shadow-card p-5">
      <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function ChipsLine({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-medium text-slate-600">{titulo}</p>
      <div className="mt-1 flex flex-wrap gap-1">{children}</div>
    </div>
  );
}
function Chip({ label, onQuitar }: { label: string; onQuitar: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-800">
      {label}
      <button
        type="button"
        onClick={onQuitar}
        className="ml-0.5 rounded-full hover:bg-slate-300"
        aria-label="Quitar"
      >
        ×
      </button>
    </span>
  );
}

function BuscadorMunicipios({
  onSeleccionar,
}: {
  onSeleccionar: (m: MunicipioBusqueda) => void;
}) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<MunicipioBusqueda[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);

  // Debounce manual
  useState(() => undefined);

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-700">O añade municipios sueltos</p>
      <div className="relative">
        <input
          type="text"
          value={query}
          placeholder="Escribe un municipio…"
          onChange={async (e) => {
            const q = e.target.value;
            setQuery(q);
            if (q.length < 2) { setResultados([]); return; }
            setBuscando(true);
            const r = await buscarMunicipios(q, 20);
            setResultados(r);
            setBuscando(false);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        {abierto && (resultados.length > 0 || buscando) && (
          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
            {buscando && <li className="px-3 py-2 text-xs text-slate-500">Buscando…</li>}
            {resultados.map((m) => (
              <li key={m.codigo_ine}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSeleccionar(m);
                    setQuery("");
                    setResultados([]);
                    setAbierto(false);
                  }}
                  className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-slate-100"
                >
                  <span>{m.nombre}</span>
                  <span className="text-xs text-slate-500">{m.provincia_nombre}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

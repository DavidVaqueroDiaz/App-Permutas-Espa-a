import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cargarMunicipios, cargarPlazasPorAnuncio } from "@/lib/cadenas/universo";
import { EditarForm } from "./EditarForm";
import type {
  AtajoState,
  CcaaRow,
  ProvinciaRow,
} from "@/app/anuncios/nuevo/types";

export const metadata: Metadata = {
  title: "Editar anuncio",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

type AnuncioRowEdit = {
  id: string;
  usuario_id: string;
  fecha_toma_posesion_definitiva: string;
  anyos_servicio_totales: number;
  permuta_anterior_fecha: string | null;
  observaciones: string | null;
  municipio_actual_codigo: string;
  sector_codigo: string;
  estado: string;
};

function unwrap<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function EditarAnuncioPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: anuncio } = await supabase
    .from("anuncios")
    .select(
      "id, usuario_id, fecha_toma_posesion_definitiva, anyos_servicio_totales, permuta_anterior_fecha, observaciones, municipio_actual_codigo, sector_codigo, estado",
    )
    .eq("id", id)
    .maybeSingle<AnuncioRowEdit>();

  if (!anuncio) notFound();
  if (anuncio.usuario_id !== user.id) notFound();
  // Los anuncios cerrados (permutados o eliminados) no se editan.
  if (anuncio.estado !== "activo" && anuncio.estado !== "caducado") {
    redirect("/mi-cuenta");
  }

  const [
    cuerposRes,
    especialidadesRes,
    municipioRes,
    sectorRes,
    plazasCodigos,
    atajosRes,
    ccaaRes,
    provinciasRes,
  ] = await Promise.all([
    supabase
      .from("anuncios")
      .select("cuerpos(codigo_oficial, denominacion)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("anuncios")
      .select("especialidades(codigo_oficial, denominacion)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("municipios")
      .select("codigo_ine, nombre, provincias!inner(nombre)")
      .eq("codigo_ine", anuncio.municipio_actual_codigo)
      .maybeSingle(),
    supabase
      .from("sectores")
      .select("nombre")
      .eq("codigo", anuncio.sector_codigo)
      .maybeSingle(),
    // TODAS las plazas (la API corta a 1000 filas: sin paginar, guardar
    // recortaba las listas grandes).
    cargarPlazasPorAnuncio(supabase, [id]).then((m) => Array.from(m.get(id) ?? [])),
    supabase
      .from("anuncio_atajos")
      .select("tipo, valor")
      .eq("anuncio_id", id),
    supabase
      .from("ccaa")
      .select("codigo_ine, nombre")
      .order("nombre"),
    supabase
      .from("provincias")
      .select("codigo_ine, nombre, ccaa_codigo")
      .order("nombre"),
  ]);

  const cuerpoRow = unwrap(
    (cuerposRes.data as unknown as { cuerpos: { codigo_oficial: string | null; denominacion: string } | { codigo_oficial: string | null; denominacion: string }[] } | null)?.cuerpos,
  );
  const especialidadRow = unwrap(
    (especialidadesRes.data as unknown as { especialidades: { codigo_oficial: string | null; denominacion: string } | { codigo_oficial: string | null; denominacion: string }[] | null } | null)?.especialidades,
  );

  type MuniRow = {
    codigo_ine: string;
    nombre: string;
    provincias: { nombre: string } | { nombre: string }[] | null;
  };
  const muniRow = municipioRes.data as MuniRow | null;
  const provinciaNombre = muniRow ? unwrap(muniRow.provincias)?.nombre ?? null : null;

  const cuerpoTexto = cuerpoRow
    ? `${cuerpoRow.codigo_oficial ? cuerpoRow.codigo_oficial + " · " : ""}${cuerpoRow.denominacion}`
    : "—";
  const especialidadTexto = especialidadRow
    ? `${especialidadRow.codigo_oficial ? especialidadRow.codigo_oficial + " · " : ""}${especialidadRow.denominacion}`
    : null;

  const atajos: AtajoState[] = ((atajosRes.data ?? []) as { tipo: string; valor: string }[]).map((a) => ({
    tipo: a.tipo as AtajoState["tipo"],
    valor: a.valor,
  }));

  // Nombres solo de los municipios sueltos (los que salen como chip).
  const codigosSueltos = atajos
    .filter((a) => a.tipo === "municipio_individual")
    .map((a) => a.valor);
  const infoSueltos = await cargarMunicipios(supabase, codigosSueltos);
  const plazasIndividualesNombres: Record<string, string> = {};
  for (const c of codigosSueltos) {
    const m = infoSueltos.get(c);
    plazasIndividualesNombres[c] = m
      ? `${m.nombre}${m.provincia_nombre ? ` (${m.provincia_nombre})` : ""}`
      : c;
  }
  const caducado = anuncio.estado === "caducado";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Editar anuncio
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Cambia las plazas deseadas, los datos legales o las observaciones.
        Al guardar, el anuncio se renueva 6 meses más.
      </p>

      {caducado && (
        <div className="mt-6 rounded-md border border-warn-text/30 bg-warn-bg p-4 text-sm text-warn-text">
          <strong>Este anuncio caducó</strong> y ya no aparece en las búsquedas
          ni en las cadenas. Al guardar vuelve a publicarse durante 6 meses.
        </div>
      )}

      <div className="mt-8">
        <EditarForm
          caducado={caducado}
          anuncioId={id}
          resumen={{
            sectorNombre: (sectorRes.data as { nombre: string } | null)?.nombre ?? "—",
            cuerpoTexto,
            especialidadTexto,
            municipioActualNombre:
              `${muniRow?.nombre ?? "—"}${provinciaNombre ? ` (${provinciaNombre})` : ""}`,
            municipioActualCodigo: anuncio.municipio_actual_codigo,
          }}
          ccaa={(ccaaRes.data ?? []) as CcaaRow[]}
          provincias={(provinciasRes.data ?? []) as ProvinciaRow[]}
          estadoInicial={{
            fecha_toma_posesion_definitiva: anuncio.fecha_toma_posesion_definitiva,
            anyos_servicio_totales: anuncio.anyos_servicio_totales,
            permuta_anterior_fecha: anuncio.permuta_anterior_fecha,
            observaciones: anuncio.observaciones ?? "",
            plazas_deseadas: plazasCodigos,
            atajos,
            plazas_individuales_nombres: plazasIndividualesNombres,
          }}
        />
      </div>
    </main>
  );
}

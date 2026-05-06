import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
      "id, usuario_id, fecha_toma_posesion_definitiva, anyos_servicio_totales, permuta_anterior_fecha, observaciones, municipio_actual_codigo, sector_codigo",
    )
    .eq("id", id)
    .maybeSingle<AnuncioRowEdit>();

  if (!anuncio) notFound();
  if (anuncio.usuario_id !== user.id) notFound();

  const [
    cuerposRes,
    especialidadesRes,
    municipioRes,
    sectorRes,
    plazasRes,
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
    supabase
      .from("anuncio_plazas_deseadas")
      .select("municipio_codigo, municipios!inner(nombre)")
      .eq("anuncio_id", id),
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

  // Reconstrucción de los nombres de los municipios individuales (solo para
  // los que vinieron de atajo "municipio_individual"; el resto no se muestra
  // como chip suelto).
  type PlazaRow = {
    municipio_codigo: string;
    municipios: { nombre: string } | { nombre: string }[] | null;
  };
  const nombresMunicipios: Record<string, string> = {};
  for (const p of (plazasRes.data ?? []) as PlazaRow[]) {
    const m = unwrap(p.municipios);
    if (m) nombresMunicipios[p.municipio_codigo] = m.nombre;
  }

  const atajos: AtajoState[] = ((atajosRes.data ?? []) as { tipo: string; valor: string }[]).map((a) => ({
    tipo: a.tipo as AtajoState["tipo"],
    valor: a.valor,
  }));

  const plazasIndividualesNombres: Record<string, string> = {};
  for (const a of atajos) {
    if (a.tipo === "municipio_individual") {
      plazasIndividualesNombres[a.valor] = nombresMunicipios[a.valor] ?? a.valor;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Editar anuncio
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Cambia las plazas deseadas, los datos legales o las observaciones.
      </p>

      <div className="mt-8">
        <EditarForm
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
            plazas_deseadas: ((plazasRes.data ?? []) as PlazaRow[]).map((p) => p.municipio_codigo),
            atajos,
            plazas_individuales_nombres: plazasIndividualesNombres,
          }}
        />
      </div>
    </main>
  );
}

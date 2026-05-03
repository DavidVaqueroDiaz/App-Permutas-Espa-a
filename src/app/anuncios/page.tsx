import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Filtros } from "./Filtros";

export const metadata: Metadata = {
  title: "Buscar anuncios",
  description:
    "Explora todos los anuncios de permuta de plaza publicados en PermutaES. Filtra por sector y por comunidad autónoma.",
};

type SearchParams = Promise<{
  sector?: string;
  ccaa?: string;
}>;

type AnuncioRow = {
  id: string;
  sector_codigo: string;
  ccaa_codigo: string;
  creado_el: string;
  observaciones: string | null;
  cuerpo: { codigo_oficial: string | null; denominacion: string } | null;
  especialidad: { codigo_oficial: string | null; denominacion: string } | null;
  municipio_nombre: string | null;
  provincia_nombre: string | null;
  total_plazas: number;
};

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function AnunciosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sectorFiltro = params.sector ?? "";
  const ccaaFiltro = params.ccaa ?? "";

  const supabase = await createClient();

  // Datos para los filtros: solo sectores con anuncios reales y todas las CCAA.
  const [sectoresFiltroRes, ccaasRes, anunciosRes] = await Promise.all([
    supabase.from("sectores").select("codigo, nombre").order("nombre"),
    supabase.from("ccaa").select("codigo_ine, nombre").order("nombre"),
    (async () => {
      let q = supabase
        .from("anuncios")
        .select(
          `id, sector_codigo, ccaa_codigo, creado_el, observaciones,
           cuerpo:cuerpos(codigo_oficial, denominacion),
           especialidad:especialidades(codigo_oficial, denominacion),
           municipio:municipios!municipio_actual_codigo(nombre, provincias!inner(nombre)),
           anuncio_plazas_deseadas(count)`,
        )
        .eq("estado", "activo")
        .order("creado_el", { ascending: false })
        .limit(50);
      if (sectorFiltro) q = q.eq("sector_codigo", sectorFiltro);
      if (ccaaFiltro) q = q.eq("ccaa_codigo", ccaaFiltro);
      return q;
    })(),
  ]);

  const sectoresOpciones = (sectoresFiltroRes.data ?? []).map((s) => ({
    value: s.codigo as string,
    label: s.nombre as string,
  }));
  const ccaasOpciones = (ccaasRes.data ?? []).map((c) => ({
    value: c.codigo_ine as string,
    label: c.nombre as string,
  }));

  const anuncios: AnuncioRow[] = (anunciosRes.data ?? []).map((a) => {
    const plazasJoin = a.anuncio_plazas_deseadas as unknown as {
      count: number;
    }[];

    type MunicipioJoin = {
      nombre: string;
      provincias: { nombre: string } | { nombre: string }[] | null;
    };
    const municipio = unwrap(
      a.municipio as MunicipioJoin | MunicipioJoin[] | null,
    );
    const provincia = municipio ? unwrap(municipio.provincias) : null;

    return {
      id: a.id as string,
      sector_codigo: a.sector_codigo as string,
      ccaa_codigo: a.ccaa_codigo as string,
      creado_el: a.creado_el as string,
      observaciones: (a.observaciones as string | null) ?? null,
      cuerpo: unwrap(a.cuerpo as AnuncioRow["cuerpo"] | AnuncioRow["cuerpo"][] | null),
      especialidad: unwrap(
        a.especialidad as AnuncioRow["especialidad"] | AnuncioRow["especialidad"][] | null,
      ),
      municipio_nombre: municipio?.nombre ?? null,
      provincia_nombre: provincia?.nombre ?? null,
      total_plazas: plazasJoin?.[0]?.count ?? 0,
    };
  });

  // Mapas auxiliares para mostrar etiquetas legibles.
  const sectorPorCodigo = new Map(sectoresOpciones.map((s) => [s.value, s.label]));
  const ccaaPorCodigo = new Map(ccaasOpciones.map((c) => [c.value, c.label]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Buscar anuncios
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Explora los anuncios de permuta publicados. Filtra por sector y comunidad autónoma para acotar la búsqueda.
      </p>

      <div className="mt-6">
        <Filtros sectores={sectoresOpciones} ccaas={ccaasOpciones} />
      </div>

      <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        {anuncios.length === 0 ? (
          <p>
            No hay anuncios publicados con esos filtros.{" "}
            {(sectorFiltro || ccaaFiltro) && (
              <a href="/anuncios" className="font-medium underline">
                Ver todos
              </a>
            )}
          </p>
        ) : (
          <p>
            {anuncios.length}{" "}
            {anuncios.length === 1 ? "anuncio encontrado" : "anuncios encontrados"}
            {sectorFiltro && ` · sector: ${sectorPorCodigo.get(sectorFiltro) ?? sectorFiltro}`}
            {ccaaFiltro && ` · ${ccaaPorCodigo.get(ccaaFiltro) ?? ccaaFiltro}`}
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {anuncios.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {sectorPorCodigo.get(a.sector_codigo) ?? a.sector_codigo}
                </p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                  {a.cuerpo?.codigo_oficial ? `${a.cuerpo.codigo_oficial} · ` : ""}
                  {a.cuerpo?.denominacion ?? "Cuerpo sin especificar"}
                </p>
                {a.especialidad && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {a.especialidad.codigo_oficial ? `${a.especialidad.codigo_oficial} · ` : ""}
                    {a.especialidad.denominacion}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                Activo
              </span>
            </div>

            <div className="mt-3 grid gap-1 text-sm text-slate-700 dark:text-slate-300 sm:grid-cols-2">
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Plaza actual</span>
                <p>
                  {a.municipio_nombre ?? "—"}
                  {a.provincia_nombre && (
                    <span className="text-slate-500 dark:text-slate-400">
                      {" "}
                      ({a.provincia_nombre})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Aceptaría irse a</span>
                <p>
                  {a.total_plazas}{" "}
                  {a.total_plazas === 1 ? "municipio" : "municipios"}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Publicado el {new Date(a.creado_el).toLocaleDateString("es-ES")}
            </p>
          </li>
        ))}
      </ul>

      {anuncios.length === 50 && (
        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Mostrando los 50 más recientes. Acota con los filtros para ver el resto.
        </p>
      )}
    </main>
  );
}

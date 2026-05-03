import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Filtros } from "./Filtros";

export const metadata: Metadata = {
  title: "Buscar anuncios",
  description:
    "Explora todos los anuncios de permuta de plaza publicados en PermutaES. Filtra por sector, comunidad autónoma o palabras clave.",
};

type SearchParams = Promise<{
  sector?: string;
  ccaa?: string;
  q?: string;
}>;

type AtajoLegible =
  | { tipo: "ccaa"; label: string }
  | { tipo: "provincia"; label: string }
  | { tipo: "municipio"; label: string };

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
  atajos_legibles: AtajoLegible[];
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
  const qFiltro = (params.q ?? "").trim();

  const supabase = await createClient();

  // Si hay query de texto, primero pre-filtramos los IDs de anuncios cuyo
  // municipio actual, cuerpo o especialidad coinciden.
  let anuncioIdsFiltrados: string[] | null = null;
  if (qFiltro.length >= 2) {
    const ilike = `%${qFiltro}%`;
    const [muniRes, cuerpoRes, especialRes] = await Promise.all([
      supabase.from("municipios").select("codigo_ine").ilike("nombre", ilike).limit(500),
      supabase.from("cuerpos").select("id").ilike("denominacion", ilike).limit(50),
      supabase.from("especialidades").select("id").ilike("denominacion", ilike).limit(200),
    ]);
    const codigosMuni = (muniRes.data ?? []).map((r) => r.codigo_ine as string);
    const cuerpoIds = (cuerpoRes.data ?? []).map((r) => r.id as string);
    const especialIds = (especialRes.data ?? []).map((r) => r.id as string);

    // Buscamos anuncios que coincidan en cualquiera de esos campos.
    const ors: string[] = [];
    if (codigosMuni.length) ors.push(`municipio_actual_codigo.in.(${codigosMuni.join(",")})`);
    if (cuerpoIds.length) ors.push(`cuerpo_id.in.(${cuerpoIds.join(",")})`);
    if (especialIds.length) ors.push(`especialidad_id.in.(${especialIds.join(",")})`);

    if (ors.length === 0) {
      anuncioIdsFiltrados = []; // ninguna coincidencia
    } else {
      const idsRes = await supabase
        .from("anuncios")
        .select("id")
        .eq("estado", "activo")
        .or(ors.join(","));
      anuncioIdsFiltrados = (idsRes.data ?? []).map((r) => r.id as string);
    }
  }

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
           anuncio_plazas_deseadas(count),
           anuncio_atajos(tipo, valor)`,
        )
        .eq("estado", "activo")
        .order("creado_el", { ascending: false })
        .limit(50);
      if (sectorFiltro) q = q.eq("sector_codigo", sectorFiltro);
      if (ccaaFiltro) q = q.eq("ccaa_codigo", ccaaFiltro);
      if (anuncioIdsFiltrados !== null) {
        if (anuncioIdsFiltrados.length === 0) q = q.eq("id", "00000000-0000-0000-0000-000000000000");
        else q = q.in("id", anuncioIdsFiltrados);
      }
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

  // Para resolver los atajos a nombres legibles, recolectamos primero los
  // códigos que aparecen en cualquier anuncio y los buscamos en bloque.
  const codigosCcaa = new Set<string>();
  const codigosProv = new Set<string>();
  const codigosMuniSueltos = new Set<string>();

  for (const a of anunciosRes.data ?? []) {
    const atajos = (a.anuncio_atajos as { tipo: string; valor: string }[]) ?? [];
    for (const at of atajos) {
      if (at.tipo === "ccaa") codigosCcaa.add(at.valor);
      else if (at.tipo === "provincia") codigosProv.add(at.valor);
      else if (at.tipo === "municipio_individual") codigosMuniSueltos.add(at.valor);
    }
  }

  const [ccaaNombresRes, provNombresRes, muniNombresRes] = await Promise.all([
    codigosCcaa.size
      ? supabase.from("ccaa").select("codigo_ine, nombre").in("codigo_ine", [...codigosCcaa])
      : { data: [] as { codigo_ine: string; nombre: string }[] },
    codigosProv.size
      ? supabase.from("provincias").select("codigo_ine, nombre").in("codigo_ine", [...codigosProv])
      : { data: [] as { codigo_ine: string; nombre: string }[] },
    codigosMuniSueltos.size
      ? supabase.from("municipios").select("codigo_ine, nombre").in("codigo_ine", [...codigosMuniSueltos])
      : { data: [] as { codigo_ine: string; nombre: string }[] },
  ]);

  const ccaaPorCodigoNombre = new Map<string, string>();
  for (const r of ccaaNombresRes.data ?? []) ccaaPorCodigoNombre.set(r.codigo_ine, r.nombre);
  const provPorCodigoNombre = new Map<string, string>();
  for (const r of provNombresRes.data ?? []) provPorCodigoNombre.set(r.codigo_ine, r.nombre);
  const muniPorCodigoNombre = new Map<string, string>();
  for (const r of muniNombresRes.data ?? []) muniPorCodigoNombre.set(r.codigo_ine, r.nombre);

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

    const atajos = (a.anuncio_atajos as { tipo: string; valor: string }[]) ?? [];
    const atajosLegibles: AtajoLegible[] = atajos.map((at) => {
      if (at.tipo === "ccaa") {
        return { tipo: "ccaa", label: ccaaPorCodigoNombre.get(at.valor) ?? at.valor };
      }
      if (at.tipo === "provincia") {
        return { tipo: "provincia", label: provPorCodigoNombre.get(at.valor) ?? at.valor };
      }
      return { tipo: "municipio", label: muniPorCodigoNombre.get(at.valor) ?? at.valor };
    });

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
      atajos_legibles: atajosLegibles,
    };
  });

  const sectorPorCodigo = new Map(sectoresOpciones.map((s) => [s.value, s.label]));
  const ccaaPorCodigo = new Map(ccaasOpciones.map((c) => [c.value, c.label]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Buscar anuncios
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Explora los anuncios de permuta publicados. Filtra por sector, CCAA o por palabra clave.
      </p>

      <div className="mt-6">
        <Filtros sectores={sectoresOpciones} ccaas={ccaasOpciones} />
      </div>

      <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
        {anuncios.length === 0 ? (
          <p>
            No hay anuncios publicados con esos filtros.{" "}
            {(sectorFiltro || ccaaFiltro || qFiltro) && (
              <a href="/anuncios" className="font-medium underline">
                Ver todos
              </a>
            )}
          </p>
        ) : (
          <p>
            {anuncios.length}{" "}
            {anuncios.length === 1 ? "anuncio encontrado" : "anuncios encontrados"}
            {qFiltro && ` · texto: "${qFiltro}"`}
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

            <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-300">
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
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Aceptaría irse a
                </span>
                <p>
                  <strong>{a.total_plazas}</strong>{" "}
                  {a.total_plazas === 1 ? "municipio" : "municipios"}
                </p>
                {a.atajos_legibles.length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {a.atajos_legibles.map((at, i) => (
                      <li
                        key={`${at.tipo}-${i}`}
                        className={
                          at.tipo === "ccaa"
                            ? "rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200"
                            : at.tipo === "provincia"
                              ? "rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800 dark:bg-sky-900/40 dark:text-sky-200"
                              : "rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }
                      >
                        {at.tipo === "ccaa"
                          ? `Toda ${at.label}`
                          : at.tipo === "provincia"
                            ? `Toda ${at.label}`
                            : at.label}
                      </li>
                    ))}
                  </ul>
                )}
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

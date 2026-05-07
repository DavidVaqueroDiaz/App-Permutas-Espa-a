import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Filtros } from "./Filtros";
import { ChipsAtajos } from "./ChipsAtajos";
import { esAliasImportado } from "@/lib/alias";

export const metadata: Metadata = {
  title: "Buscar anuncios",
  description:
    "Explora todos los anuncios de permuta de plaza publicados en PermutaES. Filtra por sector, comunidad autónoma o palabras clave.",
};

type SearchParams = Promise<{
  sector?: string;
  ccaa?: string;
  cuerpo?: string;
  especialidad?: string;
  municipio?: string;
  q?: string;
  page?: string;
}>;

const PAGE_SIZE = 25;

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
  /** True si el alias del dueno empieza por permutadoc_ -> anuncio
   *  importado de la base de datos historica, sin usuario activo. */
  es_demo: boolean;
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
  const cuerpoFiltro = params.cuerpo ?? "";
  const especialidadFiltro = params.especialidad ?? "";
  const municipioFiltro = params.municipio ?? "";
  const qFiltro = (params.q ?? "").trim();
  const pageActual = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = (pageActual - 1) * PAGE_SIZE;

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

  const [sectoresFiltroRes, ccaasRes, cuerposRes, especialidadesRes, anunciosRes] = await Promise.all([
    supabase.from("sectores").select("codigo, nombre").order("nombre"),
    supabase.from("ccaa").select("codigo_ine, nombre").order("nombre"),
    // Cuerpos: si hay sector filtrado, solo los suyos. Si no, todos
    // (para mostrar el desplegable cuando aún no se ha elegido sector).
    (() => {
      let q = supabase
        .from("cuerpos")
        .select("id, sector_codigo, codigo_oficial, denominacion")
        .order("codigo_oficial");
      if (sectorFiltro) q = q.eq("sector_codigo", sectorFiltro);
      return q;
    })(),
    // Especialidades: si hay cuerpo filtrado, solo las suyas.
    (() => {
      let q = supabase
        .from("especialidades")
        .select("id, cuerpo_id, codigo_oficial, denominacion")
        .order("codigo_oficial");
      if (cuerpoFiltro) q = q.eq("cuerpo_id", cuerpoFiltro);
      return q;
    })(),
    (async () => {
      // count: "exact" devuelve también el total de filas que cumplen
      // el filtro (no solo las del rango). Lo necesitamos para pintar
      // los controles de paginación.
      let q = supabase
        .from("anuncios")
        .select(
          `id, sector_codigo, ccaa_codigo, creado_el, observaciones, usuario_id,
           cuerpo:cuerpos(codigo_oficial, denominacion),
           especialidad:especialidades(codigo_oficial, denominacion),
           municipio:municipios!municipio_actual_codigo(nombre, provincias!inner(nombre)),
           anuncio_plazas_deseadas(count),
           anuncio_atajos(tipo, valor)`,
          { count: "exact" },
        )
        .eq("estado", "activo")
        .order("creado_el", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (sectorFiltro) q = q.eq("sector_codigo", sectorFiltro);
      if (ccaaFiltro) q = q.eq("ccaa_codigo", ccaaFiltro);
      if (cuerpoFiltro) q = q.eq("cuerpo_id", cuerpoFiltro);
      if (especialidadFiltro) q = q.eq("especialidad_id", especialidadFiltro);
      if (municipioFiltro) q = q.eq("municipio_actual_codigo", municipioFiltro);
      if (anuncioIdsFiltrados !== null) {
        if (anuncioIdsFiltrados.length === 0) q = q.eq("id", "00000000-0000-0000-0000-000000000000");
        else q = q.in("id", anuncioIdsFiltrados);
      }
      return q;
    })(),
  ]);

  const totalAnunciosFiltrados = anunciosRes.count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalAnunciosFiltrados / PAGE_SIZE));

  const sectoresOpciones = (sectoresFiltroRes.data ?? []).map((s) => ({
    value: s.codigo as string,
    label: s.nombre as string,
  }));
  const ccaasOpciones = (ccaasRes.data ?? []).map((c) => ({
    value: c.codigo_ine as string,
    label: c.nombre as string,
  }));
  type CuerpoRowFiltro = {
    id: string;
    sector_codigo: string;
    codigo_oficial: string | null;
    denominacion: string;
  };
  type EspRowFiltro = {
    id: string;
    cuerpo_id: string;
    codigo_oficial: string | null;
    denominacion: string;
  };
  const cuerposOpciones = ((cuerposRes.data ?? []) as CuerpoRowFiltro[]).map((c) => ({
    value: c.id,
    sector: c.sector_codigo,
    label: `${c.codigo_oficial ? c.codigo_oficial + " — " : ""}${c.denominacion}`,
  }));
  const especialidadesOpciones = ((especialidadesRes.data ?? []) as EspRowFiltro[]).map((e) => ({
    value: e.id,
    cuerpo: e.cuerpo_id,
    label: `${e.codigo_oficial ? e.codigo_oficial + " — " : ""}${e.denominacion}`,
  }));

  // Resolver el nombre del municipio filtrado actual (si lo hay) para
  // que el componente Filtros pueda pintar el chip "Municipio: X" en
  // vez del codigo INE crudo.
  let municipioFiltroNombre: string | null = null;
  if (municipioFiltro) {
    const { data } = await supabase
      .from("municipios")
      .select("nombre, provincias!inner(nombre)")
      .eq("codigo_ine", municipioFiltro)
      .maybeSingle();
    if (data) {
      type R = { nombre: string; provincias: { nombre: string } | { nombre: string }[] };
      const r = data as unknown as R;
      const prov = Array.isArray(r.provincias) ? r.provincias[0]?.nombre : r.provincias?.nombre;
      municipioFiltroNombre = prov ? `${r.nombre} (${prov})` : r.nombre;
    }
  }

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

  // Resolvemos los aliases en bloque para detectar cuales son demos
  // (importados de PermutaDoc, alias `permutadoc_NNNN`).
  const userIdsAnuncios = Array.from(
    new Set((anunciosRes.data ?? []).map((a) => a.usuario_id as string)),
  );
  const aliasPorUserId = new Map<string, string>();
  if (userIdsAnuncios.length > 0) {
    const { data: perfilesRows } = await supabase
      .from("perfiles_publicos")
      .select("id, alias_publico")
      .in("id", userIdsAnuncios);
    for (const r of (perfilesRows ?? []) as { id: string; alias_publico: string }[]) {
      aliasPorUserId.set(r.id, r.alias_publico);
    }
  }

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

    const aliasDelDueno = aliasPorUserId.get(a.usuario_id as string) ?? "";

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
      es_demo: esAliasImportado(aliasDelDueno),
    };
  });

  const sectorPorCodigo = new Map(sectoresOpciones.map((s) => [s.value, s.label]));
  const ccaaPorCodigo = new Map(ccaasOpciones.map((c) => [c.value, c.label]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Buscar anuncios
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Explora los anuncios de permuta publicados. Filtra por sector, CCAA o por palabra clave.
      </p>

      <div className="mt-6">
        <Filtros
          sectores={sectoresOpciones}
          ccaas={ccaasOpciones}
          cuerpos={cuerposOpciones}
          especialidades={especialidadesOpciones}
          municipioFiltroNombre={municipioFiltroNombre}
        />
      </div>

      <div className="mt-4 text-sm text-slate-600">
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
            <strong>{totalAnunciosFiltrados}</strong>{" "}
            {totalAnunciosFiltrados === 1 ? "anuncio encontrado" : "anuncios encontrados"}
            {totalPaginas > 1 && ` · página ${pageActual} de ${totalPaginas}`}
            {qFiltro && ` · texto: "${qFiltro}"`}
            {sectorFiltro && ` · sector: ${sectorPorCodigo.get(sectorFiltro) ?? sectorFiltro}`}
            {ccaaFiltro && ` · ${ccaaPorCodigo.get(ccaaFiltro) ?? ccaaFiltro}`}
            {municipioFiltroNombre && ` · ${municipioFiltroNombre}`}
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-3">
        {anuncios.map((a) => (
          <li
            key={a.id}
            className="rounded-xl2 border border-slate-200 bg-white shadow-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {sectorPorCodigo.get(a.sector_codigo) ?? a.sector_codigo}
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {a.cuerpo?.codigo_oficial ? `${a.cuerpo.codigo_oficial} · ` : ""}
                  {a.cuerpo?.denominacion ?? "Cuerpo sin especificar"}
                </p>
                {a.especialidad && (
                  <p className="text-sm text-slate-600">
                    {a.especialidad.codigo_oficial ? `${a.especialidad.codigo_oficial} · ` : ""}
                    {a.especialidad.denominacion}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="rounded-full bg-brand-bg px-2 py-0.5 text-xs text-brand-text">
                  Activo
                </span>
                {a.es_demo && (
                  <span
                    className="whitespace-nowrap rounded-full bg-warn-bg px-2 py-0.5 text-[10px] text-warn-text"
                    title="Anuncio importado de PermutaDoc, sin usuario activo"
                  >
                    📦 Demo
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <div>
                <span className="text-xs font-medium text-slate-500">Plaza actual</span>
                <p>
                  {a.municipio_nombre ?? "—"}
                  {a.provincia_nombre && (
                    <span className="text-slate-500">
                      {" "}
                      ({a.provincia_nombre})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Aceptaría irse a
                </span>
                <p>
                  <strong>{a.total_plazas}</strong>{" "}
                  {a.total_plazas === 1 ? "municipio" : "municipios"}
                </p>
                <ChipsAtajos atajos={a.atajos_legibles} />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Publicado el {new Date(a.creado_el).toLocaleDateString("es-ES")}
              </p>
              <a
                href={`/anuncios/${a.id}`}
                className="text-xs font-medium text-brand-text hover:text-brand"
              >
                Ver detalle →
              </a>
            </div>
          </li>
        ))}
      </ul>

      {totalPaginas > 1 && (
        <Paginacion
          paginaActual={pageActual}
          totalPaginas={totalPaginas}
          searchParams={params}
        />
      )}
    </main>
  );
}

function Paginacion({
  paginaActual,
  totalPaginas,
  searchParams,
}: {
  paginaActual: number;
  totalPaginas: number;
  searchParams: Record<string, string | undefined>;
}) {
  function urlPara(p: number): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") qs.set(k, v);
    }
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/anuncios?${s}` : "/anuncios";
  }

  // Construye una lista compacta tipo: 1 ... 4 5 [6] 7 8 ... 20
  const paginas = paginasVisibles(paginaActual, totalPaginas);

  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="Paginación">
      {paginaActual > 1 ? (
        <a
          href={urlPara(paginaActual - 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          ← Anterior
        </a>
      ) : (
        <span className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-300">
          ← Anterior
        </span>
      )}

      <div className="flex items-center gap-1 px-2">
        {paginas.map((p, i) =>
          p === "..." ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">
              …
            </span>
          ) : p === paginaActual ? (
            <span
              key={p}
              className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-md bg-brand px-2 text-xs font-semibold text-white"
              aria-current="page"
            >
              {p}
            </span>
          ) : (
            <a
              key={p}
              href={urlPara(p)}
              className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-md border border-slate-200 px-2 text-xs text-slate-700 hover:border-brand-light hover:text-brand"
            >
              {p}
            </a>
          ),
        )}
      </div>

      {paginaActual < totalPaginas ? (
        <a
          href={urlPara(paginaActual + 1)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Siguiente →
        </a>
      ) : (
        <span className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-300">
          Siguiente →
        </span>
      )}
    </nav>
  );
}

/**
 * Devuelve la lista de números de página a mostrar, comprimiendo con
 * "..." los rangos lejanos para no saturar la UI cuando hay muchas
 * páginas. Patrón típico: 1 ... 4 5 [6] 7 8 ... 20.
 */
function paginasVisibles(
  actual: number,
  total: number,
): Array<number | "...">{
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: Array<number | "..."> = [1];
  const desde = Math.max(2, actual - 2);
  const hasta = Math.min(total - 1, actual + 2);
  if (desde > 2) items.push("...");
  for (let i = desde; i <= hasta; i++) items.push(i);
  if (hasta < total - 1) items.push("...");
  items.push(total);
  return items;
}

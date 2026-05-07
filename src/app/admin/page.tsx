import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TablaAnuncios, type AnuncioAdminRow } from "./TablaAnuncios";
import { TablaReportes, type ReporteAdminRow } from "./TablaReportes";

export const metadata: Metadata = {
  title: "Panel de administración",
  description: "Operación interna de PermutaES.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ q?: string; sector?: string }>;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/admin");
  }

  const { data: esAdminRpc } = await supabase.rpc("es_admin_actual");
  if (esAdminRpc !== true) {
    // Acceso denegado. Redirigimos a la home en vez de mostrar la ruta
    // (no queremos que se note que existe el panel).
    redirect("/");
  }

  const { q = "", sector = "" } = await searchParams;
  const qTrim = q.trim();

  // Estadísticas globales + reportes pendientes (los reportes los traemos
  // por RPC porque la consulta hace varios JOINs y la RPC ya valida admin).
  const [
    totalAnunciosRes,
    totalUsersRes,
    totalConvsRes,
    totalMensajesRes,
    reportesRes,
  ] = await Promise.all([
    supabase.from("anuncios").select("id", { count: "exact", head: true }),
    supabase.from("perfiles_usuario").select("id", { count: "exact", head: true }),
    supabase.from("conversaciones").select("id", { count: "exact", head: true }),
    supabase.from("mensajes").select("id", { count: "exact", head: true }),
    supabase.rpc("listar_reportes_pendientes"),
  ]);
  const reportes = (reportesRes.data ?? []) as ReporteAdminRow[];

  // Catálogo de sectores para el filtro
  const { data: sectoresData } = await supabase
    .from("sectores")
    .select("codigo, nombre")
    .order("nombre");

  // Listado paginado (50) con joins. Igual que en /anuncios/[id]:
  // anuncios.usuario_id apunta a auth.users(id) y perfiles_usuario.id
  // tambien apunta a auth.users(id), pero NO hay FK directa entre
  // anuncios y perfiles_usuario, asi que PostgREST no puede inferir el
  // JOIN. El alias lo cargamos en una segunda query.
  let q1 = supabase
    .from("anuncios")
    .select(
      `id, sector_codigo, ccaa_codigo, estado, creado_el, observaciones, usuario_id,
       cuerpo:cuerpos(codigo_oficial, denominacion),
       especialidad:especialidades(codigo_oficial, denominacion),
       municipio:municipios!municipio_actual_codigo(nombre, provincias!inner(nombre))`,
    )
    .order("creado_el", { ascending: false })
    .limit(50);
  if (sector) q1 = q1.eq("sector_codigo", sector);
  if (qTrim.length >= 2) {
    // Búsqueda por alias del usuario u observaciones (ilike).
    const ilike = `%${qTrim}%`;
    const aliasRes = await supabase
      .from("perfiles_usuario")
      .select("id")
      .ilike("alias_publico", ilike);
    const aliasIds = (aliasRes.data ?? []).map((r) => r.id as string);
    if (aliasIds.length > 0) {
      q1 = q1.or(
        `usuario_id.in.(${aliasIds.join(",")}),observaciones.ilike.${ilike.replace(/,/g, "")}`,
      );
    } else {
      q1 = q1.ilike("observaciones", ilike);
    }
  }
  const { data: anunciosData } = await q1;

  type Row = {
    id: string;
    sector_codigo: string;
    ccaa_codigo: string;
    estado: string;
    creado_el: string;
    observaciones: string | null;
    usuario_id: string;
    cuerpo: { codigo_oficial: string | null; denominacion: string } | null
      | { codigo_oficial: string | null; denominacion: string }[]
      | null;
    especialidad: { codigo_oficial: string | null; denominacion: string } | null
      | { codigo_oficial: string | null; denominacion: string }[]
      | null;
    municipio:
      | { nombre: string; provincias: { nombre: string } | { nombre: string }[] | null }
      | { nombre: string; provincias: { nombre: string } | { nombre: string }[] | null }[]
      | null;
  };

  function unwrap<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  }

  const filas = (anunciosData ?? []) as Row[];

  // Segunda query: aliases de los usuarios involucrados (en bloque).
  const userIds = Array.from(new Set(filas.map((r) => r.usuario_id)));
  const aliasPorUsuario = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: perfilesData } = await supabase
      .from("perfiles_usuario")
      .select("id, alias_publico")
      .in("id", userIds);
    for (const p of (perfilesData ?? []) as { id: string; alias_publico: string }[]) {
      aliasPorUsuario.set(p.id, p.alias_publico);
    }
  }

  const anuncios: AnuncioAdminRow[] = filas.map((r) => {
    const cuerpo = unwrap(r.cuerpo);
    const esp = unwrap(r.especialidad);
    const muni = unwrap(r.municipio);
    const prov = muni ? unwrap(muni.provincias) : null;
    const alias = aliasPorUsuario.get(r.usuario_id) ?? "—";
    return {
      id: r.id,
      sector_codigo: r.sector_codigo,
      ccaa_codigo: r.ccaa_codigo,
      estado: r.estado,
      creado_el: r.creado_el,
      cuerpo_label: cuerpo
        ? `${cuerpo.codigo_oficial ? cuerpo.codigo_oficial + " · " : ""}${cuerpo.denominacion}`
        : "—",
      especialidad_label: esp
        ? `${esp.codigo_oficial ? esp.codigo_oficial + " · " : ""}${esp.denominacion}`
        : null,
      municipio_label: muni
        ? `${muni.nombre}${prov?.nombre ? " (" + prov.nombre + ")" : ""}`
        : "—",
      alias,
      es_test: alias.startsWith("permutadoc_"),
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          Solo administradores
        </p>
        <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
          Panel de administración
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Vista interna para operación. Si has llegado aquí por error,
          puedes volver a la <a href="/" className="text-brand-text hover:text-brand">home</a>.
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Anuncios" valor={totalAnunciosRes.count ?? 0} />
        <Stat label="Usuarios" valor={totalUsersRes.count ?? 0} />
        <Stat label="Conversaciones" valor={totalConvsRes.count ?? 0} />
        <Stat label="Mensajes" valor={totalMensajesRes.count ?? 0} />
        <Stat
          label="Reportes pendientes"
          valor={reportes.length}
          destacado={reportes.length > 0}
        />
      </section>

      {reportes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-head text-lg font-semibold text-slate-900">
            🚩 Reportes pendientes ({reportes.length})
          </h2>
          <TablaReportes reportes={reportes} />
        </section>
      )}

      <section>
        <h2 className="mb-3 font-head text-lg font-semibold text-slate-900">
          Anuncios ({anuncios.length} mostrados, máx. 50)
        </h2>
        <TablaAnuncios
          anuncios={anuncios}
          sectores={(sectoresData ?? []).map((s) => ({
            codigo: s.codigo as string,
            nombre: s.nombre as string,
          }))}
          qInicial={qTrim}
          sectorInicial={sector}
        />
      </section>
    </main>
  );
}

function Stat({
  label,
  valor,
  destacado,
}: {
  label: string;
  valor: number;
  destacado?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl2 border p-4 shadow-card " +
        (destacado
          ? "border-red-300 bg-red-50"
          : "border-slate-200 bg-white")
      }
    >
      <p
        className={
          "text-[11px] uppercase tracking-wide " +
          (destacado ? "text-red-700" : "text-slate-500")
        }
      >
        {label}
      </p>
      <p
        className={
          "mt-1 font-head text-2xl font-semibold " +
          (destacado ? "text-red-700" : "text-brand")
        }
      >
        {valor.toLocaleString("es-ES")}
      </p>
    </div>
  );
}

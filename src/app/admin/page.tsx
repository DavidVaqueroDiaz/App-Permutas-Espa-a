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

type SearchParams = Promise<{ q?: string; sector?: string; demos?: string }>;

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

  const { q = "", sector = "", demos = "" } = await searchParams;
  const qTrim = q.trim();
  // Por defecto el panel oculta los anuncios demo (pueden ser cientos
  // generados al vuelo cuando los visitantes usan el modo demo y dan
  // ruido al admin). Para verlos, anadir ?demos=1 a la URL.
  const incluirDemos = demos === "1";

  // Estadísticas globales + reportes pendientes (los reportes los traemos
  // por RPC porque la consulta hace varios JOINs y la RPC ya valida admin).
  // Tambien cargamos las 20 ultimas conversaciones y los 20 ultimos
  // usuarios para tener visibilidad operacional sin ir a Supabase.
  const [
    totalAnunciosRes,
    totalUsersRes,
    totalConvsRes,
    totalMensajesRes,
    reportesRes,
    usuariosRecientesRes,
    convsRecientesRes,
  ] = await Promise.all([
    supabase.from("anuncios").select("id", { count: "exact", head: true }).eq("es_demo", false),
    // Para el contador, perfiles_publicos (vista) sirve perfecto: no
    // tiene RLS bloqueante. Para el LISTADO, necesitamos campos que
    // la vista no expone (creado_el, es_admin), asi que llamamos a la
    // RPC SECURITY DEFINER `listar_usuarios_recientes_admin` que
    // valida admin internamente.
    supabase.from("perfiles_publicos").select("id", { count: "exact", head: true }),
    supabase.from("conversaciones").select("id", { count: "exact", head: true }),
    supabase.from("mensajes").select("id", { count: "exact", head: true }),
    supabase.rpc("listar_reportes_pendientes"),
    supabase.rpc("listar_usuarios_recientes_admin"),
    supabase
      .from("conversaciones")
      .select("id, creado_el, ultimo_mensaje_el, usuario_a_id, usuario_b_id")
      .order("ultimo_mensaje_el", { ascending: false, nullsFirst: false })
      .limit(20),
  ]);
  const reportes = (reportesRes.data ?? []) as ReporteAdminRow[];
  type UsuarioReciente = {
    id: string;
    alias_publico: string;
    ano_nacimiento: number;
    creado_el: string;
    es_admin: boolean;
  };
  type ConvReciente = {
    id: string;
    creado_el: string;
    ultimo_mensaje_el: string | null;
    usuario_a_id: string;
    usuario_b_id: string;
  };
  const usuariosRecientes = (usuariosRecientesRes.data ?? []) as UsuarioReciente[];
  const convsRecientes = (convsRecientesRes.data ?? []) as ConvReciente[];

  // Mapa id -> alias para resolver los participantes de conversaciones.
  const idsParaAlias = new Set<string>();
  for (const c of convsRecientes) {
    idsParaAlias.add(c.usuario_a_id);
    idsParaAlias.add(c.usuario_b_id);
  }
  const aliasMap = new Map<string, string>();
  if (idsParaAlias.size > 0) {
    // perfiles_publicos no tiene RLS, asi que devuelve los aliases
    // de todos los participantes de las conversaciones (no solo el
    // propio del admin como ocurria con perfiles_usuario).
    const { data: aliasRows } = await supabase
      .from("perfiles_publicos")
      .select("id, alias_publico")
      .in("id", Array.from(idsParaAlias));
    for (const r of (aliasRows ?? []) as { id: string; alias_publico: string }[]) {
      aliasMap.set(r.id, r.alias_publico);
    }
  }

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
      `id, sector_codigo, ccaa_codigo, estado, creado_el, observaciones, usuario_id, es_demo,
       cuerpo:cuerpos(codigo_oficial, denominacion),
       especialidad:especialidades(codigo_oficial, denominacion),
       municipio:municipios!municipio_actual_codigo(nombre, provincias!inner(nombre))`,
    )
    .order("creado_el", { ascending: false })
    .limit(50);
  if (!incluirDemos) q1 = q1.eq("es_demo", false);
  if (sector) q1 = q1.eq("sector_codigo", sector);
  if (qTrim.length >= 2) {
    // Búsqueda por alias del usuario u observaciones (ilike).
    // Usamos perfiles_publicos (sin RLS bloqueante).
    const ilike = `%${qTrim}%`;
    const aliasRes = await supabase
      .from("perfiles_publicos")
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
  // perfiles_publicos en lugar de perfiles_usuario por la misma razon
  // que arriba — la tabla tiene RLS que filtra a auth.uid().
  const userIds = Array.from(new Set(filas.map((r) => r.usuario_id)));
  const aliasPorUsuario = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: perfilesData } = await supabase
      .from("perfiles_publicos")
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
            Reportes pendientes ({reportes.length})
          </h2>
          <TablaReportes reportes={reportes} />
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-head text-lg font-semibold text-slate-900">
            Anuncios ({anuncios.length} mostrados, máx. 50)
            {!incluirDemos && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                — solo reales
              </span>
            )}
          </h2>
          <a
            href={incluirDemos ? "/admin" : "/admin?demos=1"}
            className="text-xs font-medium text-brand-text hover:text-brand"
          >
            {incluirDemos ? "Ocultar demos" : "Mostrar también demos"}
          </a>
        </div>
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

      {/* Usuarios recientes — solo metadatos, no datos sensibles. Para
          ver el detalle (email, etc.) ve a Supabase. */}
      <section className="mt-10">
        <h2 className="mb-3 font-head text-lg font-semibold text-slate-900">
          Usuarios recientes ({usuariosRecientes.length} de {totalUsersRes.count ?? 0})
        </h2>
        <div className="overflow-x-auto rounded-xl2 border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Alias</th>
                <th className="px-4 py-2 text-left">Año nac.</th>
                <th className="px-4 py-2 text-left">Registrado</th>
                <th className="px-4 py-2 text-left">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuariosRecientes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">
                    No hay usuarios todavía.
                  </td>
                </tr>
              ) : (
                usuariosRecientes.map((u) => {
                  const esTest = u.alias_publico.startsWith("permutadoc_");
                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {u.alias_publico}
                      </td>
                      <td className="px-4 py-2 text-slate-600">{u.ano_nacimiento}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {new Date(u.creado_el).toLocaleDateString("es-ES", {
                          timeZone: "Europe/Madrid",
                        })}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {u.es_admin ? (
                          <span className="rounded-full bg-brand px-2 py-0.5 text-white">admin</span>
                        ) : esTest ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">import</span>
                        ) : (
                          <span className="rounded-full bg-brand-bg px-2 py-0.5 text-brand-text">real</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Conversaciones recientes — solo metadatos. NO mostramos
          contenido de mensajes (RLS y privacidad). */}
      <section className="mt-10">
        <h2 className="mb-3 font-head text-lg font-semibold text-slate-900">
          Conversaciones recientes ({convsRecientes.length} de {totalConvsRes.count ?? 0})
        </h2>
        <div className="overflow-x-auto rounded-xl2 border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Participantes</th>
                <th className="px-4 py-2 text-left">Creada</th>
                <th className="px-4 py-2 text-left">Último mensaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {convsRecientes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-xs text-slate-500">
                    Aún no hay conversaciones.
                  </td>
                </tr>
              ) : (
                convsRecientes.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-slate-700">
                      {aliasMap.get(c.usuario_a_id) ?? "—"} ↔{" "}
                      {aliasMap.get(c.usuario_b_id) ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {new Date(c.creado_el).toLocaleDateString("es-ES", {
                        timeZone: "Europe/Madrid",
                      })}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {c.ultimo_mensaje_el
                        ? new Date(c.ultimo_mensaje_el).toLocaleString("es-ES", {
                            timeZone: "Europe/Madrid",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Solo metadatos. El contenido de los mensajes está protegido por
          RLS y no es visible desde el panel — si necesitas leerlo, accede
          directamente a Supabase.
        </p>
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

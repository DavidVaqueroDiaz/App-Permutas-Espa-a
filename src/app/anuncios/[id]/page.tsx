import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BotonContactarAnuncio } from "./BotonContactarAnuncio";
import { BotonReportar } from "./BotonReportar";

type AnuncioDetalle = {
  id: string;
  estado: string;
  creado_el: string;
  caduca_el: string;
  observaciones: string | null;
  usuario_id: string;
  cuerpo: { codigo_oficial: string | null; denominacion: string } | null;
  especialidad: { codigo_oficial: string | null; denominacion: string } | null;
  sector: { nombre: string } | null;
  municipio_nombre: string;
  provincia_nombre: string;
  ccaa_nombre: string;
  alias_publico: string;
  plazas_count: number;
  atajos: { tipo: string; valor: string }[];
};

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function cargarAnuncio(id: string): Promise<AnuncioDetalle | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("anuncios")
    .select(
      `id, estado, creado_el, caduca_el, observaciones, usuario_id,
       cuerpo:cuerpos(codigo_oficial, denominacion),
       especialidad:especialidades(codigo_oficial, denominacion),
       sector:sectores(nombre),
       municipio:municipios!municipio_actual_codigo(
         nombre,
         provincias!inner(nombre, ccaa:ccaa(nombre))
       ),
       perfil:perfiles_usuario!usuario_id(alias_publico),
       anuncio_plazas_deseadas(count),
       anuncio_atajos(tipo, valor)`,
    )
    .eq("id", id)
    .neq("estado", "eliminado")
    .maybeSingle();
  if (!data) return null;

  type Row = {
    id: string;
    estado: string;
    creado_el: string;
    caduca_el: string;
    observaciones: string | null;
    usuario_id: string;
    cuerpo: { codigo_oficial: string | null; denominacion: string } | null;
    especialidad: { codigo_oficial: string | null; denominacion: string } | null;
    sector: { nombre: string } | null;
    municipio: {
      nombre: string;
      provincias: {
        nombre: string;
        ccaa: { nombre: string } | { nombre: string }[] | null;
      } | { nombre: string; ccaa: { nombre: string } | { nombre: string }[] | null }[] | null;
    } | null;
    perfil: { alias_publico: string } | { alias_publico: string }[] | null;
    anuncio_plazas_deseadas: { count: number }[];
    anuncio_atajos: { tipo: string; valor: string }[];
  };
  const r = data as unknown as Row;

  const muni = unwrap(r.municipio);
  const prov = muni ? unwrap(muni.provincias) : null;
  const ccaa = prov ? unwrap(prov.ccaa) : null;

  return {
    id: r.id,
    estado: r.estado,
    creado_el: r.creado_el,
    caduca_el: r.caduca_el,
    observaciones: r.observaciones,
    usuario_id: r.usuario_id,
    cuerpo: unwrap(r.cuerpo),
    especialidad: unwrap(r.especialidad),
    sector: unwrap(r.sector),
    municipio_nombre: muni?.nombre ?? "—",
    provincia_nombre: prov?.nombre ?? "",
    ccaa_nombre: ccaa?.nombre ?? "",
    alias_publico: unwrap(r.perfil)?.alias_publico ?? "—",
    plazas_count: r.anuncio_plazas_deseadas?.[0]?.count ?? 0,
    atajos: r.anuncio_atajos ?? [],
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const a = await cargarAnuncio(id);
  if (!a) {
    return { title: "Anuncio no encontrado", robots: { index: false } };
  }
  const titulo =
    `${a.cuerpo?.denominacion ?? "Permuta"} en ${a.municipio_nombre}` +
    (a.provincia_nombre ? ` (${a.provincia_nombre})` : "");
  return {
    title: titulo,
    description:
      `Anuncio de permuta de ${a.alias_publico}. ` +
      `Plaza actual en ${a.municipio_nombre}. ` +
      `Aceptaría irse a ${a.plazas_count} municipios. ` +
      `Cuerpo ${a.cuerpo?.denominacion ?? "—"}.`,
    alternates: { canonical: `/anuncios/${id}` },
    openGraph: { title: titulo, type: "article" },
  };
}

export default async function AnuncioDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await cargarAnuncio(id);
  if (!a) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const esMio = user?.id === a.usuario_id;
  const yoTengoEmail = !!user?.email_confirmed_at;

  // Resolvemos los nombres legibles de los atajos.
  const codigosCcaa = new Set<string>();
  const codigosProv = new Set<string>();
  const codigosMuni = new Set<string>();
  for (const at of a.atajos) {
    if (at.tipo === "ccaa") codigosCcaa.add(at.valor);
    else if (at.tipo === "provincia") codigosProv.add(at.valor);
    else if (at.tipo === "municipio_individual") codigosMuni.add(at.valor);
  }
  const [ccaaRes, provRes, muniRes] = await Promise.all([
    codigosCcaa.size
      ? supabase.from("ccaa").select("codigo_ine, nombre").in("codigo_ine", [...codigosCcaa])
      : Promise.resolve({ data: [] as { codigo_ine: string; nombre: string }[] }),
    codigosProv.size
      ? supabase.from("provincias").select("codigo_ine, nombre").in("codigo_ine", [...codigosProv])
      : Promise.resolve({ data: [] as { codigo_ine: string; nombre: string }[] }),
    codigosMuni.size
      ? supabase.from("municipios").select("codigo_ine, nombre").in("codigo_ine", [...codigosMuni])
      : Promise.resolve({ data: [] as { codigo_ine: string; nombre: string }[] }),
  ]);
  const nombreCcaa = new Map((ccaaRes.data ?? []).map((r) => [r.codigo_ine, r.nombre]));
  const nombreProv = new Map((provRes.data ?? []).map((r) => [r.codigo_ine, r.nombre]));
  const nombreMuni = new Map((muniRes.data ?? []).map((r) => [r.codigo_ine, r.nombre]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10">
      <a
        href="/anuncios"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand"
      >
        ← Volver al listado
      </a>

      <article className="rounded-xl2 border border-slate-200 bg-white p-6 shadow-card md:p-8">
        <header className="border-b border-slate-100 pb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {a.sector?.nombre ?? "Permuta"}
          </p>
          <h1 className="mt-1 font-head text-2xl font-semibold text-slate-900 md:text-3xl">
            {a.cuerpo?.codigo_oficial ? `${a.cuerpo.codigo_oficial} · ` : ""}
            {a.cuerpo?.denominacion ?? "Cuerpo sin especificar"}
          </h1>
          {a.especialidad && (
            <p className="mt-1 text-base text-slate-700">
              {a.especialidad.codigo_oficial ? `${a.especialidad.codigo_oficial} · ` : ""}
              {a.especialidad.denominacion}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={
                a.estado === "permutado"
                  ? "rounded-full bg-brand px-2 py-0.5 font-medium text-white"
                  : a.estado === "activo"
                    ? "rounded-full bg-brand-bg px-2 py-0.5 text-brand-text"
                    : "rounded-full bg-slate-200 px-2 py-0.5 text-slate-700"
              }
            >
              {a.estado === "permutado" ? "🎉 permuta cerrada" : a.estado}
            </span>
            <span className="text-slate-500">
              Publicado el {new Date(a.creado_el).toLocaleDateString("es-ES")}
            </span>
            {a.estado === "activo" && (
              <span className="text-slate-500">
                · Caduca el {new Date(a.caduca_el).toLocaleDateString("es-ES")}
              </span>
            )}
          </div>
        </header>

        {a.estado === "permutado" && (
          <div className="mt-4 rounded-md border border-brand-mint/40 bg-brand-bg p-3 text-sm text-brand-text">
            <strong>Esta permuta ya está cerrada.</strong>{" "}
            {a.alias_publico} consiguió la plaza. Este anuncio queda como
            archivo histórico — no se puede contactar.
          </div>
        )}

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <Bloque label="Plaza actual">
            <p className="text-base font-medium text-slate-900">
              {a.municipio_nombre}
            </p>
            <p className="text-sm text-slate-600">
              {a.provincia_nombre}
              {a.ccaa_nombre && ` · ${a.ccaa_nombre}`}
            </p>
          </Bloque>
          <Bloque label="Anunciante">
            <p className="text-base font-medium text-slate-900">
              {a.alias_publico}
              {esMio && (
                <span className="ml-2 rounded-full bg-brand-bg px-2 py-0.5 text-[10px] text-brand-text">
                  TÚ
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500">
              La identidad real solo se comparte vía mensajería interna si
              ambas partes lo deciden.
            </p>
          </Bloque>
        </section>

        <section className="mt-5">
          <h2 className="font-head text-sm font-semibold uppercase tracking-wide text-slate-500">
            Aceptaría irse a
          </h2>
          <p className="mt-1 text-base text-slate-900">
            <strong>{a.plazas_count}</strong>{" "}
            {a.plazas_count === 1 ? "municipio" : "municipios"} en total
          </p>
          {a.atajos.length > 0 && (
            <div className="mt-3 space-y-2 text-sm">
              {a.atajos.filter((x) => x.tipo === "ccaa").length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Comunidades enteras:
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.atajos
                      .filter((x) => x.tipo === "ccaa")
                      .map((x) => (
                        <span
                          key={`c-${x.valor}`}
                          className="rounded-full bg-brand-bg px-2 py-0.5 text-xs text-brand-text"
                        >
                          {nombreCcaa.get(x.valor) ?? x.valor}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {a.atajos.filter((x) => x.tipo === "provincia").length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Provincias enteras:
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.atajos
                      .filter((x) => x.tipo === "provincia")
                      .map((x) => (
                        <span
                          key={`p-${x.valor}`}
                          className="rounded-full bg-brand-bg px-2 py-0.5 text-xs text-brand-text"
                        >
                          {nombreProv.get(x.valor) ?? x.valor}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {a.atajos.filter((x) => x.tipo === "municipio_individual").length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Municipios sueltos:
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.atajos
                      .filter((x) => x.tipo === "municipio_individual")
                      .map((x) => (
                        <span
                          key={`m-${x.valor}`}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                        >
                          {nombreMuni.get(x.valor) ?? x.valor}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {a.observaciones && (
          <section className="mt-5">
            <h2 className="font-head text-sm font-semibold uppercase tracking-wide text-slate-500">
              Observaciones
            </h2>
            <p className="mt-1 whitespace-pre-line text-sm italic text-slate-600">
              “{a.observaciones}”
            </p>
          </section>
        )}

        <footer className="mt-6 border-t border-slate-100 pt-5">
          {esMio ? (
            a.estado === "permutado" ? (
              <p className="text-sm text-brand-text">
                Tu anuncio está cerrado. Si fue un error y quieres volver a
                publicarlo, créalo de nuevo.
              </p>
            ) : (
              <a
                href={`/anuncios/${a.id}/editar`}
                className="inline-flex items-center gap-1 rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Editar mi anuncio →
              </a>
            )
          ) : a.estado !== "activo" ? (
            <p className="text-sm text-slate-600">
              Este anuncio ya no está activo, no se puede contactar.
            </p>
          ) : !user ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                Para contactar con {a.alias_publico} necesitas tener una
                cuenta y haber publicado tu propio anuncio.
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/registro"
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                >
                  Crear cuenta
                </a>
                <a
                  href="/login"
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Iniciar sesión
                </a>
              </div>
            </div>
          ) : !yoTengoEmail ? (
            <p className="text-sm text-amber-800">
              Confirma tu email primero para poder contactar.
            </p>
          ) : (
            <BotonContactarAnuncio anuncioId={a.id} alias={a.alias_publico} />
          )}
        </footer>

        {/* Reportar: solo visible si esta autenticado y NO es propio.
            No mostramos el boton si el anuncio ya esta cerrado/inactivo. */}
        {!esMio && a.estado === "activo" && user && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <BotonReportar anuncioId={a.id} />
          </div>
        )}
      </article>
    </main>
  );
}

function Bloque({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
      <p className="text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

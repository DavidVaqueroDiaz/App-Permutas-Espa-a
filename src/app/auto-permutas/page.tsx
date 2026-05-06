import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Buscador } from "./Buscador";
import type {
  CuerpoRow,
  EspecialidadRow,
  SectorRow,
} from "@/app/anuncios/nuevo/types";

export const metadata: Metadata = {
  title: "Auto permutas",
  description:
    "Buscador inteligente de cadenas de permuta de plaza para funcionarios públicos en España. Detección automática de permutas directas, a 3 y a 4 personas.",
};

export default async function AutoPermutasPage() {
  const supabase = await createClient();

  // Pública: NO requiere login. Solo se necesita registro para publicar
  // un anuncio propio o iniciar contacto con otro participante.
  const [
    sectoresRes,
    cuerposRes,
    especialidadesRes,
    ccaaRes,
    provinciasRes,
  ] = await Promise.all([
    supabase
      .from("sectores")
      .select("codigo, nombre, descripcion")
      .order("nombre"),
    supabase
      .from("cuerpos")
      .select("id, sector_codigo, codigo_oficial, denominacion, subgrupo")
      .order("codigo_oficial"),
    supabase
      .from("especialidades")
      .select("id, cuerpo_id, codigo_oficial, denominacion")
      .order("codigo_oficial"),
    // CCAA y provincias para el desplegable del mapa visual.
    supabase.from("ccaa").select("codigo_ine, nombre").order("nombre"),
    supabase.from("provincias").select("codigo_ine, ccaa_codigo").order("codigo_ine"),
  ]);

  // Municipios CON coordenadas — paginados porque Supabase corta a
  // 1000 filas por defecto y nosotros tenemos 8.132. Se cargan los
  // 9 lotes en paralelo para no añadir latencia.
  type MuniRaw = {
    codigo_ine: string;
    nombre: string;
    provincias: { nombre: string } | { nombre: string }[];
  };
  const PAGE = 1000;
  const TOTAL = 8500;
  const lotes = await Promise.all(
    Array.from({ length: Math.ceil(TOTAL / PAGE) }, (_, i) =>
      supabase
        .from("municipios")
        .select("codigo_ine, nombre, provincias!inner(nombre)")
        .not("latitud", "is", null)
        .order("codigo_ine")
        .range(i * PAGE, (i + 1) * PAGE - 1),
    ),
  );
  const muniRows: MuniRaw[] = lotes.flatMap(
    (l) => (l.data ?? []) as unknown as MuniRaw[],
  );

  const municipios = muniRows
    .map((r) => {
      const provNombre = Array.isArray(r.provincias)
        ? r.provincias[0]?.nombre ?? ""
        : r.provincias.nombre;
      return {
        codigo_ine: r.codigo_ine,
        nombre: r.nombre,
        provincia_nombre: provNombre,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
          Auto permutas
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Define tu perfil y descubre cadenas de permuta posibles entre los
          anuncios publicados. No necesitas estar registrado para buscar — solo
          si quieres publicar tu propio anuncio o contactar con otro participante.
        </p>
      </header>

      <Buscador
        sectores={(sectoresRes.data ?? []) as SectorRow[]}
        cuerpos={(cuerposRes.data ?? []) as CuerpoRow[]}
        especialidades={(especialidadesRes.data ?? []) as EspecialidadRow[]}
        municipios={municipios}
        ccaa={(ccaaRes.data ?? []) as { codigo_ine: string; nombre: string }[]}
        provincias={
          (provinciasRes.data ?? []) as { codigo_ine: string; ccaa_codigo: string }[]
        }
      />
    </main>
  );
}

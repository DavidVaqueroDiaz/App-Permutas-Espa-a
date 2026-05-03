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
  const [sectoresRes, cuerposRes, especialidadesRes, municipiosConCoordsRes] =
    await Promise.all([
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
      // Municipios CON coordenadas (los únicos en los que la búsqueda
      // por radio funciona). Se envían al cliente para autocompletado
      // instantáneo en memoria.
      supabase
        .from("municipios")
        .select("codigo_ine, nombre, provincias!inner(nombre)")
        .not("latitud", "is", null)
        .order("nombre"),
    ]);

  type MuniRow = {
    codigo_ine: string;
    nombre: string;
    provincias: { nombre: string } | { nombre: string }[];
  };
  const municipios = (municipiosConCoordsRes.data ?? []).map((m) => {
    const r = m as unknown as MuniRow;
    const provNombre = Array.isArray(r.provincias) ? r.provincias[0]?.nombre ?? "" : r.provincias.nombre;
    return {
      codigo_ine: r.codigo_ine,
      nombre: r.nombre,
      provincia_nombre: provNombre,
    };
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Auto permutas
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
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
      />
    </main>
  );
}

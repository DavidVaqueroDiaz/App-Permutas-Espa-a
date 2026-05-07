import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wizard } from "./Wizard";
import type {
  CcaaRow,
  CuerpoRow,
  EspecialidadRow,
  ProvinciaRow,
  SectorRow,
  ServicioSaludRow,
} from "./types";

export const metadata: Metadata = {
  title: "Publicar anuncio",
  description: "Crea tu anuncio de permuta de plaza en PermutaES.",
  robots: { index: false, follow: false },
};

export default async function NuevoAnuncioPage() {
  const supabase = await createClient();

  // Solo usuarios autenticados con email confirmado pueden publicar.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  if (!user.email_confirmed_at) {
    redirect("/mi-cuenta");
  }

  // Cargamos en paralelo:
  //   - los 7 sectores (la UI marca cuáles están activos en Fase 1)
  //   - los cuerpos LOE (12) — solo el sector docente_loe está activo
  //   - las especialidades de esos cuerpos (~318)
  // Es poco volumen, podemos enviarlo todo al cliente sin problema.
  const [
    sectoresRes,
    cuerposRes,
    especialidadesRes,
    ccaaRes,
    provinciasRes,
    serviciosSaludRes,
  ] = await Promise.all([
    supabase
      .from("sectores")
      .select("codigo, nombre, descripcion")
      .order("nombre", { ascending: true }),
    // Cargamos los cuerpos de TODOS los sectores activos. Total < 60
    // filas, podemos enviarlo todo al cliente sin problema.
    supabase
      .from("cuerpos")
      .select("id, sector_codigo, codigo_oficial, denominacion, subgrupo")
      .order("codigo_oficial", { ascending: true }),
    supabase
      .from("especialidades")
      .select("id, cuerpo_id, codigo_oficial, denominacion")
      .order("codigo_oficial", { ascending: true }),
    supabase
      .from("ccaa")
      .select("codigo_ine, nombre")
      .order("nombre", { ascending: true }),
    supabase
      .from("provincias")
      .select("codigo_ine, nombre, ccaa_codigo")
      .order("nombre", { ascending: true }),
    supabase
      .from("servicios_salud")
      .select("codigo, nombre_corto, nombre_oficial, ccaa_codigo")
      .order("nombre_corto", { ascending: true }),
  ]);

  const sectores = (sectoresRes.data ?? []) as SectorRow[];
  const cuerpos = (cuerposRes.data ?? []) as CuerpoRow[];
  const especialidades = (especialidadesRes.data ?? []) as EspecialidadRow[];
  const ccaa = (ccaaRes.data ?? []) as CcaaRow[];
  const provincias = (provinciasRes.data ?? []) as ProvinciaRow[];
  const serviciosSalud = (serviciosSaludRes.data ?? []) as ServicioSaludRow[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Publicar anuncio
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Te guiamos paso a paso. Lo que rellenes se guarda automáticamente en tu navegador, así que puedes salir y volver más tarde.
      </p>

      <div className="mt-8">
        <Wizard
          sectores={sectores}
          cuerpos={cuerpos}
          especialidades={especialidades}
          ccaa={ccaa}
          provincias={provincias}
          serviciosSalud={serviciosSalud}
        />
      </div>
    </main>
  );
}

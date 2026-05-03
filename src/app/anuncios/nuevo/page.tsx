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
  const [sectoresRes, cuerposRes, especialidadesRes, ccaaRes, provinciasRes] =
    await Promise.all([
      supabase
        .from("sectores")
        .select("codigo, nombre, descripcion")
        .order("nombre", { ascending: true }),
      supabase
        .from("cuerpos")
        .select("id, sector_codigo, codigo_oficial, denominacion, subgrupo")
        .eq("sector_codigo", "docente_loe")
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
    ]);

  const sectores = (sectoresRes.data ?? []) as SectorRow[];
  const cuerpos = (cuerposRes.data ?? []) as CuerpoRow[];
  const especialidades = (especialidadesRes.data ?? []) as EspecialidadRow[];
  const ccaa = (ccaaRes.data ?? []) as CcaaRow[];
  const provincias = (provinciasRes.data ?? []) as ProvinciaRow[];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Publicar anuncio
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Te guiamos paso a paso. Lo que rellenes se guarda automáticamente en tu navegador, así que puedes salir y volver más tarde.
      </p>

      <div className="mt-8">
        <Wizard
          sectores={sectores}
          cuerpos={cuerpos}
          especialidades={especialidades}
          ccaa={ccaa}
          provincias={provincias}
        />
      </div>
    </main>
  );
}

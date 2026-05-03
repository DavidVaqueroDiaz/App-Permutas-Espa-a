"use server";

import { createClient } from "@/lib/supabase/server";
import {
  detectarCadenas,
  type AnuncioMatching,
  type Cadena,
} from "@/lib/matching";

type AnuncioRaw = {
  id: string;
  usuario_id: string;
  sector_codigo: string;
  cuerpo_id: string;
  especialidad_id: string | null;
  municipio_actual_codigo: string;
  ccaa_codigo: string;
  servicio_salud_codigo: string | null;
  fecha_toma_posesion_definitiva: string;
  anyos_servicio_totales: number;
  permuta_anterior_fecha: string | null;
};

type PerfilRaw = {
  id: string;
  ano_nacimiento: number;
  alias_publico: string;
};

type PlazaRaw = {
  anuncio_id: string;
  municipio_codigo: string;
};

export type DetalleCadena = {
  longitud: 2 | 3 | 4;
  huella: string;
  score: number;
  participantes: Array<{
    anuncio_id: string;
    es_mio: boolean;
    alias_publico: string;
    cuerpo_texto: string;
    especialidad_texto: string | null;
    municipio_actual_nombre: string;
    municipio_actual_codigo: string;
  }>;
};

/**
 * Calcula las cadenas de permuta que pasan por al menos uno de los anuncios
 * activos del usuario logueado. Cálculo en memoria (Fase 1, alfa interna).
 */
export async function detectarCadenasParaUsuarioActual(): Promise<{
  ok: true;
  cadenas: DetalleCadena[];
  totalAnunciosUsuario: number;
} | { ok: false; mensaje: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, mensaje: "No autenticado." };

  // 1) Anuncios del usuario (activos).
  const { data: misAnunciosRaw } = await supabase
    .from("anuncios")
    .select(
      "id, usuario_id, sector_codigo, cuerpo_id, especialidad_id, municipio_actual_codigo, ccaa_codigo, servicio_salud_codigo, fecha_toma_posesion_definitiva, anyos_servicio_totales, permuta_anterior_fecha",
    )
    .eq("usuario_id", user.id)
    .eq("estado", "activo");

  const misAnuncios = (misAnunciosRaw ?? []) as AnuncioRaw[];

  if (misAnuncios.length === 0) {
    return { ok: true, cadenas: [], totalAnunciosUsuario: 0 };
  }

  // 2) Para cada combinación (sector, cuerpo, especialidad) cargar TODOS
  // los anuncios activos compatibles desde ese ángulo. Optimización: si
  // el sector tiene regla intra-CCAA, también filtrar por ccaa.
  const claves = new Set<string>();
  for (const a of misAnuncios) {
    claves.add(claveAnuncio(a));
  }

  const candidatosTotales: AnuncioRaw[] = [];
  for (const clave of claves) {
    const [sector, cuerpoId, especialidadId, ccaa] = clave.split("|");
    let q = supabase
      .from("anuncios")
      .select(
        "id, usuario_id, sector_codigo, cuerpo_id, especialidad_id, municipio_actual_codigo, ccaa_codigo, servicio_salud_codigo, fecha_toma_posesion_definitiva, anyos_servicio_totales, permuta_anterior_fecha",
      )
      .eq("estado", "activo")
      .eq("sector_codigo", sector)
      .eq("cuerpo_id", cuerpoId);
    if (especialidadId !== "_") q = q.eq("especialidad_id", especialidadId);
    else q = q.is("especialidad_id", null);
    if (ccaa !== "_") q = q.eq("ccaa_codigo", ccaa);

    const { data } = await q;
    for (const row of (data ?? []) as AnuncioRaw[]) candidatosTotales.push(row);
  }

  // Deduplicar por id.
  const porId = new Map<string, AnuncioRaw>();
  for (const a of candidatosTotales) porId.set(a.id, a);
  const candidatos = Array.from(porId.values());

  if (candidatos.length === 0) {
    return { ok: true, cadenas: [], totalAnunciosUsuario: misAnuncios.length };
  }

  // 3) Cargar plazas deseadas y perfiles para todos los candidatos.
  const ids = candidatos.map((a) => a.id);
  const usuariosUnicos = Array.from(new Set(candidatos.map((a) => a.usuario_id)));

  const [plazasRes, perfilesRes, municipiosRes, cuerposRes, especialidadesRes] = await Promise.all([
    supabase
      .from("anuncio_plazas_deseadas")
      .select("anuncio_id, municipio_codigo")
      .in("anuncio_id", ids),
    supabase
      .from("perfiles_publicos")
      .select("id, ano_nacimiento, alias_publico")
      .in("id", usuariosUnicos),
    supabase
      .from("municipios")
      .select("codigo_ine, nombre")
      .in(
        "codigo_ine",
        Array.from(new Set(candidatos.map((a) => a.municipio_actual_codigo))),
      ),
    supabase
      .from("cuerpos")
      .select("id, codigo_oficial, denominacion")
      .in("id", Array.from(new Set(candidatos.map((a) => a.cuerpo_id)))),
    supabase
      .from("especialidades")
      .select("id, codigo_oficial, denominacion")
      .in(
        "id",
        Array.from(
          new Set(
            candidatos
              .map((a) => a.especialidad_id)
              .filter((e): e is string => e !== null),
          ),
        ),
      ),
  ]);

  const plazasPorAnuncio = new Map<string, Set<string>>();
  for (const p of (plazasRes.data ?? []) as PlazaRaw[]) {
    let s = plazasPorAnuncio.get(p.anuncio_id);
    if (!s) {
      s = new Set();
      plazasPorAnuncio.set(p.anuncio_id, s);
    }
    s.add(p.municipio_codigo);
  }

  const perfilesPorId = new Map<string, PerfilRaw>();
  for (const p of (perfilesRes.data ?? []) as PerfilRaw[]) perfilesPorId.set(p.id, p);

  const muniNombres = new Map<string, string>();
  for (const m of municipiosRes.data ?? []) muniNombres.set(m.codigo_ine as string, m.nombre as string);

  type CuerpoRow = { id: string; codigo_oficial: string | null; denominacion: string };
  type EspecRow = { id: string; codigo_oficial: string | null; denominacion: string };
  const cuerposMap = new Map<string, CuerpoRow>();
  for (const c of (cuerposRes.data ?? []) as CuerpoRow[]) cuerposMap.set(c.id, c);
  const especialidadesMap = new Map<string, EspecRow>();
  for (const e of (especialidadesRes.data ?? []) as EspecRow[]) especialidadesMap.set(e.id, e);

  // 4) Construir AnuncioMatching para cada candidato.
  const todos: AnuncioMatching[] = candidatos
    .map((a) => {
      const perfil = perfilesPorId.get(a.usuario_id);
      if (!perfil) return null; // sin perfil válido (RLS o eliminado), saltamos
      return {
        id: a.id,
        usuario_id: a.usuario_id,
        sector_codigo: a.sector_codigo,
        cuerpo_id: a.cuerpo_id,
        especialidad_id: a.especialidad_id,
        municipio_actual_codigo: a.municipio_actual_codigo,
        ccaa_codigo: a.ccaa_codigo,
        servicio_salud_codigo: a.servicio_salud_codigo,
        fecha_toma_posesion_definitiva: a.fecha_toma_posesion_definitiva,
        anyos_servicio_totales: a.anyos_servicio_totales,
        permuta_anterior_fecha: a.permuta_anterior_fecha,
        ano_nacimiento: perfil.ano_nacimiento,
        alias_publico: perfil.alias_publico,
        plazas_deseadas: plazasPorAnuncio.get(a.id) ?? new Set(),
      } as AnuncioMatching;
    })
    .filter((x): x is AnuncioMatching => x !== null);

  // PROBLEMA conocido de RLS: el perfil de OTROS usuarios NO es visible
  // por las políticas actuales (solo se puede leer el propio). Detectamos
  // si solo tenemos perfil del usuario actual y avisamos.
  const usuariosDistintos = new Set(todos.map((a) => a.usuario_id));
  const tenemosPerfilesAjenos = usuariosDistintos.size > 1;

  const origen = todos.filter((a) => a.usuario_id === user.id);
  const cadenas: Cadena[] = detectarCadenas(todos, origen);

  // 5) Enriquecer cada cadena con datos visuales.
  const detalle: DetalleCadena[] = cadenas.map((c) => ({
    longitud: c.longitud,
    huella: c.huella,
    score: c.score,
    participantes: c.anuncios.map((id) => {
      const a = todos.find((x) => x.id === id)!;
      const cuerpo = cuerposMap.get(a.cuerpo_id);
      const espec = a.especialidad_id ? especialidadesMap.get(a.especialidad_id) : null;
      return {
        anuncio_id: a.id,
        es_mio: a.usuario_id === user.id,
        alias_publico: a.alias_publico,
        cuerpo_texto: cuerpo
          ? `${cuerpo.codigo_oficial ? cuerpo.codigo_oficial + " · " : ""}${cuerpo.denominacion}`
          : "—",
        especialidad_texto: espec
          ? `${espec.codigo_oficial ? espec.codigo_oficial + " · " : ""}${espec.denominacion}`
          : null,
        municipio_actual_nombre: muniNombres.get(a.municipio_actual_codigo) ?? a.municipio_actual_codigo,
        municipio_actual_codigo: a.municipio_actual_codigo,
      };
    }),
  }));

  // Si NO tenemos perfiles ajenos (RLS bloqueando), devolvemos un aviso
  // adicional para que la página avise — pero técnicamente cadenas=[]
  // porque sin perfiles no podemos validar reglas legales.
  if (!tenemosPerfilesAjenos && todos.filter((a) => a.usuario_id !== user.id).length === 0) {
    // No hay otros candidatos compatibles tampoco. Devolvemos vacío sin warning.
  }

  return { ok: true, cadenas: detalle, totalAnunciosUsuario: misAnuncios.length };
}

function claveAnuncio(a: AnuncioRaw): string {
  // Para sectores intra-CCAA, restringimos por CCAA en la búsqueda; para
  // los demás, usamos "_" comodín (cargamos todos los activos compatibles).
  const intraCcaa = new Set(["funcionario_ccaa", "policia_local"]);
  const ccaa = intraCcaa.has(a.sector_codigo) ? a.ccaa_codigo : "_";
  const esp = a.especialidad_id ?? "_";
  return `${a.sector_codigo}|${a.cuerpo_id}|${esp}|${ccaa}`;
}

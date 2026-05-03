"use server";

import { createClient } from "@/lib/supabase/server";
import {
  detectarCadenas,
  type AnuncioMatching,
  type Cadena,
} from "@/lib/matching";

export type PerfilBusqueda = {
  cuerpo_id: string;
  especialidad_id: string | null;
  municipio_actual_codigo: string;
  plazas_deseadas: string[]; // códigos INE de municipios
  // Datos legales razonables por defecto: la persona que busca puede
  // tener más restricciones que las del default. Para una búsqueda
  // pública sin perfil, asumimos valores que pasan todas las reglas.
  ano_nacimiento: number;
  anyos_servicio_totales: number;
  fecha_toma_posesion_definitiva: string; // YYYY-MM-DD
  permuta_anterior_fecha: string | null;
};

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
  observaciones: string | null;
};

export type ParticipanteCadena = {
  anuncio_id: string;
  es_perfil_busqueda: boolean;
  alias_publico: string;
  cuerpo_texto: string;
  especialidad_texto: string | null;
  municipio_actual_nombre: string;
  municipio_actual_codigo: string;
  provincia_nombre: string;
  observaciones: string | null;
  contacto_disponible: boolean; // true si hay sesión activa para iniciar contacto
};

export type DetalleCadena = {
  longitud: 2 | 3 | 4;
  huella: string;
  score: number;
  compatibilidad: number; // 0-100
  participantes: ParticipanteCadena[];
};

export type ResultadoBusqueda = {
  ok: true;
  cadenas: DetalleCadena[];
  totalAnunciosAnalizados: number;
} | { ok: false; mensaje: string };

const VIRTUAL_PREFIX = "virtual-";

/**
 * Busca cadenas de permuta que pasen por un perfil de búsqueda dado.
 * El perfil se trata como un "anuncio virtual" en memoria — no se
 * persiste en la BD. Es accesible para usuarios anónimos.
 */
export async function buscarCadenasDesdePerfil(
  input: PerfilBusqueda,
): Promise<ResultadoBusqueda> {
  const supabase = await createClient();

  // Resolver sector y ccaa del cuerpo y municipio del input.
  const { data: cuerpoRow } = await supabase
    .from("cuerpos")
    .select("sector_codigo")
    .eq("id", input.cuerpo_id)
    .maybeSingle();
  if (!cuerpoRow) return { ok: false, mensaje: "Cuerpo no encontrado." };

  const { data: muniInputRow } = await supabase
    .from("municipios")
    .select("provincia_codigo, provincias!inner(ccaa_codigo)")
    .eq("codigo_ine", input.municipio_actual_codigo)
    .maybeSingle();
  type ProvJoin = { ccaa_codigo: string } | { ccaa_codigo: string }[];
  const provJoin = (muniInputRow as unknown as { provincias: ProvJoin } | null)?.provincias;
  const ccaaInput = Array.isArray(provJoin) ? provJoin[0]?.ccaa_codigo : provJoin?.ccaa_codigo;
  if (!ccaaInput) return { ok: false, mensaje: "Municipio actual no válido." };

  const sector = (cuerpoRow as { sector_codigo: string }).sector_codigo;

  // Cargar anuncios reales compatibles a nivel de sector/cuerpo/especialidad.
  // Si el sector es intra-CCAA, restringimos por ccaa.
  const intraCcaa = new Set(["funcionario_ccaa", "policia_local"]);
  let q = supabase
    .from("anuncios")
    .select(
      "id, usuario_id, sector_codigo, cuerpo_id, especialidad_id, municipio_actual_codigo, ccaa_codigo, servicio_salud_codigo, fecha_toma_posesion_definitiva, anyos_servicio_totales, permuta_anterior_fecha, observaciones",
    )
    .eq("estado", "activo")
    .eq("sector_codigo", sector)
    .eq("cuerpo_id", input.cuerpo_id);
  if (input.especialidad_id) q = q.eq("especialidad_id", input.especialidad_id);
  else q = q.is("especialidad_id", null);
  if (intraCcaa.has(sector)) q = q.eq("ccaa_codigo", ccaaInput);

  const { data: anunciosCompat } = await q;
  const anuncios = (anunciosCompat ?? []) as AnuncioRaw[];

  if (anuncios.length === 0) {
    return { ok: true, cadenas: [], totalAnunciosAnalizados: 0 };
  }

  // Cargar plazas deseadas de cada anuncio.
  const ids = anuncios.map((a) => a.id);
  const { data: plazasData } = await supabase
    .from("anuncio_plazas_deseadas")
    .select("anuncio_id, municipio_codigo")
    .in("anuncio_id", ids);
  const plazasPorAnuncio = new Map<string, Set<string>>();
  for (const p of plazasData ?? []) {
    const key = (p as { anuncio_id: string }).anuncio_id;
    const code = (p as { municipio_codigo: string }).municipio_codigo;
    let s = plazasPorAnuncio.get(key);
    if (!s) {
      s = new Set();
      plazasPorAnuncio.set(key, s);
    }
    s.add(code);
  }

  // Cargar perfiles públicos (alias + ano_nacimiento) de los autores.
  const usuariosUnicos = Array.from(new Set(anuncios.map((a) => a.usuario_id)));
  const { data: perfilesData } = await supabase
    .from("perfiles_publicos")
    .select("id, alias_publico, ano_nacimiento")
    .in("id", usuariosUnicos);
  const perfilesPorId = new Map<string, { alias_publico: string; ano_nacimiento: number }>();
  for (const p of perfilesData ?? []) {
    perfilesPorId.set((p as { id: string }).id, {
      alias_publico: (p as { alias_publico: string }).alias_publico,
      ano_nacimiento: (p as { ano_nacimiento: number }).ano_nacimiento,
    });
  }

  // Cargar nombres de municipios y provincias para visualización + cuerpo + especialidad.
  const codigosMuni = Array.from(
    new Set([
      ...anuncios.map((a) => a.municipio_actual_codigo),
      input.municipio_actual_codigo,
    ]),
  );

  const [muniRowsRes, cuerposRowsRes, espRowsRes] = await Promise.all([
    supabase
      .from("municipios")
      .select("codigo_ine, nombre, provincias!inner(nombre)")
      .in("codigo_ine", codigosMuni),
    supabase
      .from("cuerpos")
      .select("id, codigo_oficial, denominacion")
      .eq("id", input.cuerpo_id),
    input.especialidad_id
      ? supabase
          .from("especialidades")
          .select("id, codigo_oficial, denominacion")
          .eq("id", input.especialidad_id)
      : Promise.resolve({ data: [] as { id: string; codigo_oficial: string | null; denominacion: string }[] }),
  ]);

  const muniInfo = new Map<string, { nombre: string; provincia_nombre: string }>();
  for (const m of muniRowsRes.data ?? []) {
    type ProvSub = { nombre: string } | { nombre: string }[];
    const ps = (m as unknown as { provincias: ProvSub }).provincias;
    const provNombre = Array.isArray(ps) ? ps[0]?.nombre ?? "" : ps?.nombre ?? "";
    muniInfo.set((m as { codigo_ine: string }).codigo_ine, {
      nombre: (m as { nombre: string }).nombre,
      provincia_nombre: provNombre,
    });
  }
  const cuerpo = (cuerposRowsRes.data ?? [])[0];
  const cuerpoTexto = cuerpo
    ? `${cuerpo.codigo_oficial ? cuerpo.codigo_oficial + " · " : ""}${cuerpo.denominacion}`
    : "—";
  const especialidad = (espRowsRes.data ?? [])[0];
  const especialidadTexto = especialidad
    ? `${especialidad.codigo_oficial ? especialidad.codigo_oficial + " · " : ""}${especialidad.denominacion}`
    : null;

  // Construir AnuncioMatching para cada anuncio real, descartando los que
  // no tengan perfil asociado (RLS o perfil eliminado).
  const reales: AnuncioMatching[] = anuncios
    .map((a) => {
      const perfil = perfilesPorId.get(a.usuario_id);
      if (!perfil) return null;
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

  // Construir el "anuncio virtual" del perfil de búsqueda.
  const virtualId = `${VIRTUAL_PREFIX}${Math.random().toString(36).slice(2)}`;
  const virtualUserId = `${VIRTUAL_PREFIX}user`;
  const virtual: AnuncioMatching = {
    id: virtualId,
    usuario_id: virtualUserId,
    sector_codigo: sector,
    cuerpo_id: input.cuerpo_id,
    especialidad_id: input.especialidad_id,
    municipio_actual_codigo: input.municipio_actual_codigo,
    ccaa_codigo: ccaaInput,
    servicio_salud_codigo: null,
    fecha_toma_posesion_definitiva: input.fecha_toma_posesion_definitiva,
    anyos_servicio_totales: input.anyos_servicio_totales,
    permuta_anterior_fecha: input.permuta_anterior_fecha,
    ano_nacimiento: input.ano_nacimiento,
    alias_publico: "Tu perfil",
    plazas_deseadas: new Set(input.plazas_deseadas),
  };

  // Detectar cadenas que pasan por el perfil virtual.
  const todos = [...reales, virtual];
  const cadenas: Cadena[] = detectarCadenas(todos, [virtual]);

  // ¿Hay sesión activa? (para habilitar el botón "Iniciar contacto").
  const { data: { user } } = await supabase.auth.getUser();
  const haySesion = !!user;

  // Enriquecer cada cadena con detalles visuales.
  const detalle: DetalleCadena[] = cadenas.map((c) => {
    const participantes: ParticipanteCadena[] = c.anuncios.map((id) => {
      const a = todos.find((x) => x.id === id)!;
      const esVirtual = a.id === virtualId;
      const muni = muniInfo.get(a.municipio_actual_codigo);
      return {
        anuncio_id: a.id,
        es_perfil_busqueda: esVirtual,
        alias_publico: a.alias_publico,
        cuerpo_texto: cuerpoTexto,
        especialidad_texto: especialidadTexto,
        municipio_actual_nombre: muni?.nombre ?? a.municipio_actual_codigo,
        municipio_actual_codigo: a.municipio_actual_codigo,
        provincia_nombre: muni?.provincia_nombre ?? "",
        observaciones: esVirtual
          ? null
          : (anuncios.find((r) => r.id === id)?.observaciones ?? null),
        contacto_disponible: !esVirtual && haySesion,
      };
    });
    return {
      longitud: c.longitud,
      huella: c.huella,
      score: c.score,
      compatibilidad: Math.min(100, Math.round(c.score)),
      participantes,
    };
  });

  return { ok: true, cadenas: detalle, totalAnunciosAnalizados: reales.length };
}

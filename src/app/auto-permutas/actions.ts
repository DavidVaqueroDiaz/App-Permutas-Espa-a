"use server";

import { createClient } from "@/lib/supabase/server";
import {
  detectarCadenas,
  type AnuncioMatching,
  type Cadena,
} from "@/lib/matching";
import { haversine } from "@/lib/haversine";

export type PerfilBusqueda = {
  cuerpo_id: string;
  especialidad_id: string | null;
  municipio_actual_codigo: string;
  municipio_objetivo_codigo: string;
  radio_km: number;
  // Datos legales razonables por defecto.
  ano_nacimiento: number;
  anyos_servicio_totales: number;
  fecha_toma_posesion_definitiva: string;
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
  contacto_disponible: boolean;
  km_al_destino: number | null; // distancia al objetivo del que recibe la plaza
};

export type DetalleCadena = {
  longitud: 2 | 3 | 4;
  huella: string;
  score: number;
  compatibilidad: number;
  participantes: ParticipanteCadena[];
};

export type ResultadoBusqueda =
  | {
      ok: true;
      cadenas: DetalleCadena[];
      totalAnunciosAnalizados: number;
      municipios_en_radio: number;
    }
  | { ok: false; mensaje: string };

const VIRTUAL_PREFIX = "virtual-";
const RADIO_DEFAULT_OTROS_KM = 40;

/**
 * Buscador inteligente de cadenas tipo PermutaDoc:
 *   - El usuario indica localidad actual + localidad objetivo + radio.
 *   - Las "plazas deseadas" del perfil son los municipios cuyo centro
 *     está dentro del radio km de la localidad objetivo (usando haversine).
 *   - Los OTROS anuncios usan sus plazas deseadas reales (las que el
 *     usuario puso al publicar).
 *   - Si el otro anuncio no tiene coordenadas, no se puede medir distancia.
 */
export async function buscarCadenasDesdePerfil(
  input: PerfilBusqueda,
): Promise<ResultadoBusqueda> {
  const supabase = await createClient();

  // 1) Resolver sector y ccaa del cuerpo + municipio actual.
  const { data: cuerpoRow } = await supabase
    .from("cuerpos")
    .select("sector_codigo")
    .eq("id", input.cuerpo_id)
    .maybeSingle();
  if (!cuerpoRow) return { ok: false, mensaje: "Cuerpo no encontrado." };

  const { data: muniInputRow } = await supabase
    .from("municipios")
    .select("provincia_codigo, latitud, longitud, provincias!inner(ccaa_codigo)")
    .eq("codigo_ine", input.municipio_actual_codigo)
    .maybeSingle();
  type ProvJoin = { ccaa_codigo: string } | { ccaa_codigo: string }[];
  const provJoin = (muniInputRow as unknown as { provincias: ProvJoin } | null)?.provincias;
  const ccaaInput = Array.isArray(provJoin) ? provJoin[0]?.ccaa_codigo : provJoin?.ccaa_codigo;
  if (!ccaaInput) return { ok: false, mensaje: "Municipio actual no válido." };

  const muniActualCoords = muniInputRow as unknown as {
    latitud: number | null;
    longitud: number | null;
  } | null;

  const sector = (cuerpoRow as { sector_codigo: string }).sector_codigo;

  // 2) Coordenadas del municipio objetivo y municipios en su radio.
  const { data: muniObjRow } = await supabase
    .from("municipios")
    .select("codigo_ine, latitud, longitud")
    .eq("codigo_ine", input.municipio_objetivo_codigo)
    .maybeSingle();
  if (!muniObjRow) return { ok: false, mensaje: "Municipio objetivo no válido." };

  const objLat = (muniObjRow as { latitud: number | null }).latitud;
  const objLon = (muniObjRow as { longitud: number | null }).longitud;
  if (objLat === null || objLon === null) {
    return {
      ok: false,
      mensaje:
        "El municipio objetivo no tiene coordenadas cargadas. Por ahora la búsqueda por radio solo funciona en Galicia.",
    };
  }

  // Cargar municipios con coordenadas en el ámbito del sector. Para
  // sectores intra-CCAA, restringimos a la misma CCAA.
  const intraCcaa = new Set(["funcionario_ccaa", "policia_local"]);

  let muniQ = supabase
    .from("municipios")
    .select("codigo_ine, latitud, longitud, provincia_codigo")
    .not("latitud", "is", null);
  if (intraCcaa.has(sector)) {
    // Las provincias de esa CCAA.
    const { data: provs } = await supabase
      .from("provincias")
      .select("codigo_ine")
      .eq("ccaa_codigo", ccaaInput);
    const codigos = (provs ?? []).map((p) => p.codigo_ine as string);
    if (codigos.length > 0) muniQ = muniQ.in("provincia_codigo", codigos);
  }
  const { data: muniRows } = await muniQ;

  const codigosEnRadio: string[] = [];
  for (const r of muniRows ?? []) {
    const lat = (r as { latitud: number | null }).latitud;
    const lon = (r as { longitud: number | null }).longitud;
    if (lat === null || lon === null) continue;
    const km = haversine(objLat, objLon, lat, lon);
    if (km <= input.radio_km) {
      codigosEnRadio.push((r as { codigo_ine: string }).codigo_ine);
    }
  }
  // El propio municipio actual nunca puede estar en plazas deseadas.
  const setRadio = new Set(codigosEnRadio);
  setRadio.delete(input.municipio_actual_codigo);

  if (setRadio.size === 0) {
    return {
      ok: true,
      cadenas: [],
      totalAnunciosAnalizados: 0,
      municipios_en_radio: 0,
    };
  }

  // 3) Cargar anuncios reales compatibles (sector/cuerpo/especialidad).
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
    return {
      ok: true,
      cadenas: [],
      totalAnunciosAnalizados: 0,
      municipios_en_radio: setRadio.size,
    };
  }

  // 4) Cargar plazas deseadas, perfiles, datos de visualización.
  const ids = anuncios.map((a) => a.id);
  const usuariosUnicos = Array.from(new Set(anuncios.map((a) => a.usuario_id)));

  const [plazasRes, perfilesRes, muniInfoRes, cuerpoInfoRes, espInfoRes] =
    await Promise.all([
      supabase
        .from("anuncio_plazas_deseadas")
        .select("anuncio_id, municipio_codigo")
        .in("anuncio_id", ids),
      supabase
        .from("perfiles_publicos")
        .select("id, alias_publico, ano_nacimiento")
        .in("id", usuariosUnicos),
      supabase
        .from("municipios")
        .select("codigo_ine, nombre, latitud, longitud, provincias!inner(nombre)")
        .in(
          "codigo_ine",
          Array.from(
            new Set([
              ...anuncios.map((a) => a.municipio_actual_codigo),
              input.municipio_actual_codigo,
              input.municipio_objetivo_codigo,
            ]),
          ),
        ),
      supabase
        .from("cuerpos")
        .select("id, codigo_oficial, denominacion")
        .eq("id", input.cuerpo_id),
      input.especialidad_id
        ? supabase
            .from("especialidades")
            .select("id, codigo_oficial, denominacion")
            .eq("id", input.especialidad_id)
        : Promise.resolve({
            data: [] as { id: string; codigo_oficial: string | null; denominacion: string }[],
          }),
    ]);

  const plazasPorAnuncio = new Map<string, Set<string>>();
  for (const p of plazasRes.data ?? []) {
    const k = (p as { anuncio_id: string }).anuncio_id;
    const c = (p as { municipio_codigo: string }).municipio_codigo;
    let s = plazasPorAnuncio.get(k);
    if (!s) {
      s = new Set();
      plazasPorAnuncio.set(k, s);
    }
    s.add(c);
  }

  const perfilesPorId = new Map<string, { alias_publico: string; ano_nacimiento: number }>();
  for (const p of perfilesRes.data ?? []) {
    perfilesPorId.set((p as { id: string }).id, {
      alias_publico: (p as { alias_publico: string }).alias_publico,
      ano_nacimiento: (p as { ano_nacimiento: number }).ano_nacimiento,
    });
  }

  type MuniRow = {
    codigo_ine: string;
    nombre: string;
    latitud: number | null;
    longitud: number | null;
    provincias: { nombre: string } | { nombre: string }[] | null;
  };
  const muniInfo = new Map<
    string,
    { nombre: string; provincia_nombre: string; lat: number | null; lon: number | null }
  >();
  for (const m of (muniInfoRes.data ?? []) as MuniRow[]) {
    const ps = Array.isArray(m.provincias) ? m.provincias[0]?.nombre ?? "" : m.provincias?.nombre ?? "";
    muniInfo.set(m.codigo_ine, {
      nombre: m.nombre,
      provincia_nombre: ps,
      lat: m.latitud,
      lon: m.longitud,
    });
  }

  const cuerpo = (cuerpoInfoRes.data ?? [])[0];
  const cuerpoTexto = cuerpo
    ? `${cuerpo.codigo_oficial ? cuerpo.codigo_oficial + " · " : ""}${cuerpo.denominacion}`
    : "—";
  const especialidad = (espInfoRes.data ?? [])[0];
  const especialidadTexto = especialidad
    ? `${especialidad.codigo_oficial ? especialidad.codigo_oficial + " · " : ""}${especialidad.denominacion}`
    : null;

  // 5) Construir AnuncioMatching para cada anuncio real.
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

  // 6) Anuncio virtual del usuario buscador.
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
    plazas_deseadas: setRadio,
  };

  // 7) Detectar cadenas que pasan por el virtual.
  const todos = [...reales, virtual];
  const cadenas: Cadena[] = detectarCadenas(todos, [virtual]);

  // 8) ¿Hay sesión activa?
  const { data: { user } } = await supabase.auth.getUser();
  const haySesion = !!user;

  // 9) Enriquecer cada cadena con datos visuales y distancias.
  const detalle: DetalleCadena[] = cadenas.map((c) => {
    const participantes: ParticipanteCadena[] = c.anuncios.map((id, i) => {
      const a = todos.find((x) => x.id === id)!;
      const esVirtual = a.id === virtualId;
      const muni = muniInfo.get(a.municipio_actual_codigo);

      // Distancia: el "siguiente" del ciclo es a quien voy a permutar (su
      // plaza actual será la mía). Para el usuario virtual eso es la
      // distancia al objetivo. Para los demás, distancia entre sus plazas.
      const siguienteIdx = (i + 1) % c.anuncios.length;
      const siguiente = todos.find((x) => x.id === c.anuncios[siguienteIdx])!;
      const muniSig = muniInfo.get(siguiente.municipio_actual_codigo);
      let km: number | null = null;
      if (esVirtual && objLat !== null && objLon !== null && muniSig?.lat && muniSig?.lon) {
        km = haversine(objLat, objLon, muniSig.lat, muniSig.lon);
      } else if (
        muni?.lat !== null && muni?.lat !== undefined &&
        muni?.lon !== null && muni?.lon !== undefined &&
        muniSig?.lat !== null && muniSig?.lat !== undefined &&
        muniSig?.lon !== null && muniSig?.lon !== undefined
      ) {
        km = haversine(muni.lat!, muni.lon!, muniSig.lat!, muniSig.lon!);
      }

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
        km_al_destino: km,
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

  // Suprimir no-usados
  void RADIO_DEFAULT_OTROS_KM;
  void muniActualCoords;

  return {
    ok: true,
    cadenas: detalle,
    totalAnunciosAnalizados: reales.length,
    municipios_en_radio: setRadio.size,
  };
}

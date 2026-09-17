/**
 * Cadenas de un usuario concreto a partir de sus anuncios publicados.
 * Lo usan /mi-cuenta (contador) y /mis-cadenas (detalle con boton de
 * contactar), asi que ambos ven exactamente las mismas cadenas que
 * disparan los avisos por email.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { detectarCadenas, type Cadena } from "@/lib/matching";
import { haversine } from "@/lib/haversine";
import {
  verificarReglasPareja,
  verificarReglasParticipante,
} from "@/lib/reglas-personales";
import type {
  DetalleCadena,
  ParticipanteCadena,
} from "@/app/auto-permutas/actions";
import {
  cargarMunicipios,
  cargarUniversoCombo,
  claveCombo,
  textoCategoria,
  type AnuncioDelUniverso,
  type ComboTaxonomia,
} from "./universo";

export type GrupoCadenas = {
  combo: ComboTaxonomia;
  universo: AnuncioDelUniverso[];
  idsMios: Set<string>;
  cadenas: Cadena[];
};

export async function cadenasDeUsuario(
  sb: SupabaseClient,
  usuarioId: string,
): Promise<GrupoCadenas[]> {
  const { data, error } = await sb
    .from("anuncios")
    .select("id, sector_codigo, cuerpo_id, especialidad_id")
    .eq("usuario_id", usuarioId)
    .eq("estado", "activo")
    .eq("es_demo", false)
    .gt("caduca_el", new Date().toISOString());
  if (error) throw new Error(error.message);

  const combos = new Map<string, ComboTaxonomia>();
  for (const a of (data ?? []) as ComboTaxonomia[]) {
    combos.set(claveCombo(a), {
      sector_codigo: a.sector_codigo,
      cuerpo_id: a.cuerpo_id,
      especialidad_id: a.especialidad_id,
    });
  }

  const grupos: GrupoCadenas[] = [];
  for (const combo of combos.values()) {
    const universo = await cargarUniversoCombo(sb, combo);
    const mios = universo.filter((x) => x.usuario_id === usuarioId);
    if (mios.length === 0 || universo.length < 2) continue;
    const cadenas = detectarCadenas(universo, mios);
    if (cadenas.length === 0) continue;
    grupos.push({ combo, universo, idsMios: new Set(mios.map((m) => m.id)), cadenas });
  }
  return grupos;
}

/** Gira el ciclo para que empiece por un anuncio concreto (sigue siendo
 *  el mismo ciclo: cada uno acepta la plaza del siguiente). */
export function rotarCiclo(ids: string[], primero: string): string[] {
  const i = ids.indexOf(primero);
  if (i <= 0) return ids;
  return [...ids.slice(i), ...ids.slice(0, i)];
}

export type CadenasDeAnuncio = {
  anuncioId: string;
  cuerpoTexto: string;
  especialidadTexto: string | null;
  municipioActual: string;
  cadenas: DetalleCadena[];
};

/**
 * Convierte las cadenas de un usuario al formato de las tarjetas del
 * buscador, con el anuncio del usuario siempre en primer lugar ("TÚ").
 */
export async function detallarCadenasDeUsuario(
  sb: SupabaseClient,
  usuarioId: string,
): Promise<CadenasDeAnuncio[]> {
  const grupos = await cadenasDeUsuario(sb, usuarioId);
  if (grupos.length === 0) return [];

  const municipios = await cargarMunicipios(
    sb,
    grupos.flatMap((g) => g.universo.map((x) => x.municipio_actual_codigo)),
  );
  const salida: CadenasDeAnuncio[] = [];

  for (const g of grupos) {
    const porId = new Map(g.universo.map((x) => [x.id, x]));
    const textos = await textoCategoria(sb, g.combo);
    const porAnuncio = new Map<string, DetalleCadena[]>();

    for (const c of g.cadenas) {
      const mio = c.anuncios.find((id) => g.idsMios.has(id));
      if (!mio) continue;
      const orden = rotarCiclo(c.anuncios, mio)
        .map((id) => porId.get(id))
        .filter((x): x is AnuncioDelUniverso => x !== undefined);
      if (orden.length !== c.longitud) continue;
      const yo = orden[0];

      const participantes: ParticipanteCadena[] = orden.map((p, i) => {
        const siguiente = orden[(i + 1) % orden.length];
        const muni = municipios.get(p.municipio_actual_codigo);
        const muniSig = municipios.get(siguiente.municipio_actual_codigo);
        const km =
          muni?.lat != null && muni?.lon != null && muniSig?.lat != null && muniSig?.lon != null
            ? haversine(muni.lat, muni.lon, muniSig.lat, muniSig.lon)
            : null;
        const esMio = g.idsMios.has(p.id);
        const datos = {
          ano_nacimiento: p.ano_nacimiento,
          fecha_toma_posesion_definitiva: p.fecha_toma_posesion_definitiva,
          anyos_servicio_totales: p.anyos_servicio_totales,
          permuta_anterior_fecha: p.permuta_anterior_fecha,
        };
        return {
          anuncio_id: p.id,
          es_perfil_busqueda: esMio,
          alias_publico: p.alias_publico,
          cuerpo_texto: textos.cuerpo,
          especialidad_texto: textos.especialidad,
          municipio_actual_nombre: muni?.nombre ?? p.municipio_actual_codigo,
          municipio_actual_codigo: p.municipio_actual_codigo,
          municipio_destino_nombre: muniSig?.nombre ?? siguiente.municipio_actual_codigo,
          provincia_nombre: muni?.provincia_nombre ?? "",
          tipo: null,
          zona_deseada: null,
          centro_origen: null,
          observaciones: esMio ? null : p.fila.observaciones,
          fecha_publicacion: p.fila.creado_el.slice(0, 10),
          contacto_disponible: !esMio,
          km_recta: km,
          avisos_legales: esMio
            ? []
            : [
                ...verificarReglasParticipante(datos),
                ...verificarReglasPareja(
                  {
                    ano_nacimiento: yo.ano_nacimiento,
                    fecha_toma_posesion_definitiva: yo.fecha_toma_posesion_definitiva,
                    anyos_servicio_totales: yo.anyos_servicio_totales,
                    permuta_anterior_fecha: yo.permuta_anterior_fecha,
                  },
                  datos,
                ),
              ],
        };
      });

      const lista = porAnuncio.get(mio) ?? [];
      lista.push({
        longitud: c.longitud,
        huella: c.huella,
        score: c.score,
        compatibilidad: Math.min(100, Math.round(c.score)),
        participantes,
      });
      porAnuncio.set(mio, lista);
    }

    for (const [anuncioId, cadenas] of porAnuncio) {
      const mio = porId.get(anuncioId)!;
      salida.push({
        anuncioId,
        cuerpoTexto: textos.cuerpo,
        especialidadTexto: textos.especialidad,
        municipioActual:
          municipios.get(mio.municipio_actual_codigo)?.nombre ?? mio.municipio_actual_codigo,
        cadenas,
      });
    }
  }
  return salida;
}

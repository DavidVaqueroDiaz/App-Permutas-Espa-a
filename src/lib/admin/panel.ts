/**
 * Datos del panel de administracion: cifras de salud, cadenas actuales,
 * si sus participantes recibieron el aviso, si han hablado entre ellos,
 * cuando les toca el correo de seguimiento y que paso con las cadenas
 * avisadas en el pasado.
 *
 * Se llama SOLO desde /admin, despues de comprobar que quien entra es
 * administrador, y con el cliente de servidor (service_role). De los
 * mensajes solo se leen recuentos y fechas, nunca el contenido.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { detectarCadenas, idsDeHuella } from "@/lib/matching";
import {
  aAnunciosMatching,
  cargarAnunciosActivos,
  cargarMunicipios,
  cargarPerfilesPublicos,
  claveCombo,
  COLUMNAS_ANUNCIO,
  leerPorLotes,
  leerTodo,
  type AnuncioDelUniverso,
  type FilaAnuncio,
} from "@/lib/cadenas/universo";
import {
  cargarActividad,
  cargarAdmins,
  cargarConversaciones,
  clavePar,
  inicioMutuo,
  type ActividadConversacion,
  type ConversacionFila,
} from "@/lib/cadenas/contactos";
import { estadoAviso, type RegistroAviso } from "@/lib/cadenas/notificar";
import {
  cargarDatosSeguimiento,
  seguimientoAtrasado,
  situacionSeguimiento,
  type RegistroSeguimiento,
} from "@/lib/cadenas/seguimiento";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type Tarea = {
  nombre: string;
  programacion: string;
  activa: boolean;
  ultima: string | null;
  ultimo_estado: string | null;
  fallos_7d: number;
};

export type Metricas = {
  usuarios: {
    total: number;
    confirmados: number;
    nuevos_7d: number;
    nuevos_30d: number;
    entraron_30d: number;
    con_anuncio_activo: number;
  };
  anuncios: {
    activos: number;
    caducados: number;
    permutados: number;
    eliminados: number;
    nuevos_7d: number;
    nuevos_30d: number;
    caducan_30d: number;
    vencidos_sin_marcar: number;
    renovados: number;
    ultima_permuta: string | null;
  };
  /** Anuncios marcados como permuta conseguida (migracion 0043). */
  permutas?: { total: number; ultimos_30d: number; tras_seguimiento: number };
  conversaciones: {
    total: number;
    sin_mensajes: number;
    solo_uno: number;
    con_respuesta: number;
  };
  mensajes: { total: number; ultimos_7d: number; ultimos_30d: number };
  avisos_cadena: {
    total: number;
    ultimos_30d: number;
    ultimo: string | null;
    /** Envios cortados a medias hace mas de una hora (0043). */
    sin_confirmar?: number;
    sin_correo?: number;
  };
  seguimientos?: {
    primeros: number;
    recordatorios: number;
    ultimo: string | null;
    sin_confirmar: number;
  };
  recordatorios_caducidad: { total: number; ultimo: string | null };
  /** Anuncios que entraron hace mas de un dia en los 30 dias previos a
   *  caducar y no tienen recordatorio: el cron de Vercel no va. */
  recordatorios_atrasados?: number;
  correos_30d: { tipo: string; enviados: number; fallidos: number; ultimo: string | null }[];
  ultimo_fallo_correo: { tipo: string; error: string | null; fecha: string } | null;
  demos_sinteticos_activos: number;
  reportes_pendientes: number;
  anuncios_plazas_incompletas: number;
  tareas: Tarea[];
};

export type EstadoContacto = "hablan" | "solo_uno" | "conversacion_vacia" | "sin_contacto";

export type ParContacto = {
  usuarioA: string;
  usuarioB: string;
  aliasA: string;
  aliasB: string;
  mensajesA: number;
  mensajesB: number;
  ultimoMensaje: string | null;
  creada: string;
  /** Desde cuando se han escrito las dos (null si alguna no ha escrito). */
  hablanDesde: string | null;
};

/** enviado: el correo salio; enviando: se esta enviando ahora mismo;
 *  sin_correo: la cuenta no tiene correo utilizable; falta: lo enviara la
 *  revision diaria. */
export type AvisoAdmin = "enviado" | "enviando" | "sin_correo" | "falta";

export type SeguimientoAdmin = {
  /** Desde cuando habla con alguien de la cadena (ida y vuelta). */
  hablanDesde: string | null;
  primeroEl: string | null;
  segundoEl: string | null;
  /** Ese correo se envio por otra cadena con las mismas personas. */
  primeroDeOtra: boolean;
  segundoDeOtra: boolean;
  /** Siguiente correo de seguimiento y cuando toca (puede ser pasado:
   *  sale en la siguiente revision diaria). */
  proximo: { numero: 1 | 2; fecha: string } | null;
  /** Ya toca: sale en la siguiente revision diaria. */
  toca: boolean;
  /** Se esta enviando ahora mismo. */
  enviando: boolean;
  /** Debia haber salido en una revision anterior y no salio. */
  atrasado: boolean;
};

export type ParticipanteAdmin = {
  anuncioId: string;
  usuarioId: string;
  alias: string;
  municipio: string;
  provincia: string;
  destino: string;
  estadoAnuncio: string;
  aviso: AvisoAdmin;
  avisadoEl: string | null;
  /** Su anuncio es el ultimo creado o cambiado de la cadena: probablemente
   *  fue quien la completo. */
  completo: boolean;
  seguimiento: SeguimientoAdmin;
};

export type CadenaAdmin = {
  huella: string;
  longitud: number;
  categoria: string;
  participantes: ParticipanteAdmin[];
  formadaEl: string;
  contacto: EstadoContacto;
  pares: ParContacto[];
  /** Personas de la cadena a las que aun les falta el aviso (la revision
   *  diaria se lo envia). */
  sinAviso: number;
};

export type ResultadoHistorico =
  | "permuta_conseguida"
  | "caducada"
  | "anuncio_retirado"
  | "cambio_anuncio";

export type CadenaHistorica = {
  huella: string;
  longitud: number;
  categoria: string;
  participantes: { alias: string; municipio: string; estado: string }[];
  avisadaEl: string;
  resultado: ResultadoHistorico;
  contacto: EstadoContacto;
  pares: ParContacto[];
};

export type ResumenCadenas = {
  total: number;
  directas: number;
  aTres: number;
  aCuatro: number;
  personas: number;
  anuncios: number;
  conContacto: number;
  hablan: number;
  /** Cadenas con alguien al que le falta el aviso. */
  sinAviso: number;
  /** Personas de alguna cadena sin correo utilizable. */
  sinCorreo: number;
  /** Seguimientos (persona y cadena) que salen en la proxima revision. */
  seguimientosPendientes: number;
  /** Personas que recibiran esos seguimientos (un correo cada una). */
  personasSeguimiento: number;
  /** Seguimientos que debian haber salido ya. */
  seguimientosAtrasados: number;
};

export type DatosPanel = {
  metricas: Metricas | null;
  resumen: ResumenCadenas;
  cadenas: CadenaAdmin[];
  historicas: CadenaHistorica[];
  errores: string[];
};

// ---------------------------------------------------------------------------
// Reglas puras (con tests)
// ---------------------------------------------------------------------------

/** Pares de personas distintas de una cadena. */
export function paresDeUsuarios(usuarios: string[]): [string, string][] {
  const unicos = Array.from(new Set(usuarios));
  const pares: [string, string][] = [];
  for (let i = 0; i < unicos.length; i++) {
    for (let j = i + 1; j < unicos.length; j++) pares.push([unicos[i], unicos[j]]);
  }
  return pares;
}

/** El mejor estado de contacto entre los pares de una cadena. */
export function estadoContacto(pares: ParContacto[]): EstadoContacto {
  if (pares.some((p) => p.mensajesA > 0 && p.mensajesB > 0)) return "hablan";
  if (pares.some((p) => p.mensajesA + p.mensajesB > 0)) return "solo_uno";
  if (pares.length > 0) return "conversacion_vacia";
  return "sin_contacto";
}

export function resultadoHistorico(estados: (string | null)[]): ResultadoHistorico {
  if (estados.includes("permutado")) return "permuta_conseguida";
  if (estados.some((e) => e === null || e === "eliminado")) return "anuncio_retirado";
  if (estados.includes("caducado")) return "caducada";
  return "cambio_anuncio";
}

/** Traduce lo apuntado en cadenas_notificadas a lo que ve el panel. */
export function avisoAdmin(r: RegistroAviso | undefined, ahora = Date.now()): AvisoAdmin {
  const e = estadoAviso(r, ahora);
  if (e === "hecho") return "enviado";
  if (e === "en_curso") return "enviando";
  return e === "sin_correo" ? "sin_correo" : "falta";
}

function enviadoDe(r: RegistroSeguimiento | undefined): string | null {
  return r && r.enviadoEl && !r.sinCorreo ? r.enviadoEl : null;
}

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

function mensajeError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function construirPares(
  usuarios: string[],
  alias: (u: string) => string,
  convPorPar: Map<string, ConversacionFila>,
  actividad: Map<string, ActividadConversacion>,
): ParContacto[] {
  const pares: ParContacto[] = [];
  for (const [a, b] of paresDeUsuarios(usuarios)) {
    const conv = convPorPar.get(clavePar(a, b));
    if (!conv) continue;
    const act = actividad.get(conv.id);
    pares.push({
      usuarioA: a,
      usuarioB: b,
      aliasA: alias(a),
      aliasB: alias(b),
      mensajesA: act?.porRemitente.get(a) ?? 0,
      mensajesB: act?.porRemitente.get(b) ?? 0,
      ultimoMensaje: act?.ultimo ?? null,
      creada: conv.creado_el,
      hablanDesde: inicioMutuo(act, a, b),
    });
  }
  return pares;
}

async function cargarCategorias(
  sb: SupabaseClient,
  cuerpoIds: string[],
  especialidadIds: string[],
): Promise<{ cuerpos: Map<string, string>; especialidades: Map<string, string> }> {
  type Tax = { id: string; codigo_oficial: string | null; denominacion: string };
  const fmt = (t: Tax) => `${t.codigo_oficial ? t.codigo_oficial + " · " : ""}${t.denominacion}`;
  const [c, e] = await Promise.all([
    leerPorLotes<Tax>(cuerpoIds, (lote, desde, hasta) =>
      sb.from("cuerpos").select("id, codigo_oficial, denominacion").in("id", lote).order("id").range(desde, hasta),
    ),
    leerPorLotes<Tax>(especialidadIds, (lote, desde, hasta) =>
      sb
        .from("especialidades")
        .select("id, codigo_oficial, denominacion")
        .in("id", lote)
        .order("id")
        .range(desde, hasta),
    ),
  ]);
  return {
    cuerpos: new Map(c.map((t) => [t.id, fmt(t)])),
    especialidades: new Map(e.map((t) => [t.id, fmt(t)])),
  };
}

function tocadoEl(f: FilaAnuncio): string {
  return f.actualizado_el > f.creado_el ? f.actualizado_el : f.creado_el;
}

type FilaAviso = {
  usuario_id: string;
  cadena_huella: string;
  notificada_el: string;
  enviado_el: string | null;
  sin_correo: boolean;
};

export async function cargarDatosPanel(sb: SupabaseClient): Promise<DatosPanel> {
  const errores: string[] = [];
  const ahora = Date.now();
  const resumen: ResumenCadenas = {
    total: 0,
    directas: 0,
    aTres: 0,
    aCuatro: 0,
    personas: 0,
    anuncios: 0,
    conContacto: 0,
    hablan: 0,
    sinAviso: 0,
    sinCorreo: 0,
    seguimientosPendientes: 0,
    personasSeguimiento: 0,
    seguimientosAtrasados: 0,
  };

  let metricas: Metricas | null = null;
  try {
    const { data, error } = await sb.rpc("admin_metricas");
    if (error) throw new Error(error.message);
    metricas = data as Metricas;
  } catch (e) {
    errores.push(`Cifras generales: ${mensajeError(e)}`);
  }

  const cadenas: CadenaAdmin[] = [];
  const historicas: CadenaHistorica[] = [];
  try {
    // 1) Cadenas actuales entre anuncios reales activos.
    const activos = await aAnunciosMatching(sb, await cargarAnunciosActivos(sb));
    const grupos = new Map<string, AnuncioDelUniverso[]>();
    for (const a of activos) {
      const k = claveCombo(a);
      const g = grupos.get(k) ?? [];
      g.push(a);
      grupos.set(k, g);
    }
    const encontradas: { huella: string; longitud: number; anuncios: AnuncioDelUniverso[] }[] = [];
    const porId = new Map(activos.map((a) => [a.id, a]));
    for (const g of grupos.values()) {
      if (g.length < 2) continue;
      for (const c of detectarCadenas(g, g)) {
        encontradas.push({
          huella: c.huella,
          longitud: c.longitud,
          anuncios: c.anuncios.map((id) => porId.get(id)!),
        });
      }
    }
    const huellasActuales = new Set(encontradas.map((c) => c.huella));

    // 2) Avisos apuntados.
    const avisos = await leerTodo<FilaAviso>((desde, hasta) =>
      sb
        .from("cadenas_notificadas")
        .select("usuario_id, cadena_huella, notificada_el, enviado_el, sin_correo")
        .order("id")
        .range(desde, hasta),
    );
    const avisoPor = new Map<string, FilaAviso>();
    const avisadaPorHuella = new Map<string, string>();
    for (const a of avisos) {
      avisoPor.set(`${a.cadena_huella}|${a.usuario_id}`, a);
      if (!a.enviado_el || a.sin_correo) continue;
      const previo = avisadaPorHuella.get(a.cadena_huella);
      if (!previo || a.enviado_el < previo) avisadaPorHuella.set(a.cadena_huella, a.enviado_el);
    }

    // 3) Anuncios de cadenas avisadas que ya no existen como cadena.
    const huellasPasadas = Array.from(avisadaPorHuella.keys()).filter((h) => !huellasActuales.has(h));
    const idsPasados = Array.from(new Set(huellasPasadas.flatMap(idsDeHuella)));
    const filasPasadas = await leerPorLotes<FilaAnuncio>(idsPasados, (lote, desde, hasta) =>
      sb.from("anuncios").select(COLUMNAS_ANUNCIO).in("id", lote).order("id").range(desde, hasta),
    );
    const pasadoPorId = new Map(filasPasadas.map((f) => [f.id, f]));

    // 4) Nombres, alias, categorias y seguimientos.
    const todasLasFilas = [...activos.map((a) => a.fila), ...filasPasadas];
    const usuariosCadenas = new Set<string>();
    for (const c of encontradas) for (const a of c.anuncios) usuariosCadenas.add(a.usuario_id);
    for (const f of filasPasadas) usuariosCadenas.add(f.usuario_id);

    const anunciosConocidos = new Map(todasLasFilas.map((f) => [f.id, f.usuario_id]));
    const [municipios, perfiles, categorias, admins, conversaciones, seguimientos] = await Promise.all([
      cargarMunicipios(sb, todasLasFilas.map((f) => f.municipio_actual_codigo)),
      cargarPerfilesPublicos(sb, todasLasFilas.map((f) => f.usuario_id)),
      cargarCategorias(
        sb,
        todasLasFilas.map((f) => f.cuerpo_id),
        todasLasFilas.map((f) => f.especialidad_id).filter((x): x is string => !!x),
      ),
      cargarAdmins(sb),
      cargarConversaciones(sb, Array.from(usuariosCadenas)),
      cargarDatosSeguimiento(sb, Array.from(usuariosCadenas), anunciosConocidos),
    ]);
    const alias = (u: string) => perfiles.get(u)?.alias_publico ?? "cuenta eliminada";
    const categoria = (f: FilaAnuncio) => {
      const c = categorias.cuerpos.get(f.cuerpo_id) ?? "—";
      const e = f.especialidad_id ? categorias.especialidades.get(f.especialidad_id) : null;
      return e ? `${c} · ${e}` : c;
    };
    const nombreMuni = (codigo: string) => municipios.get(codigo)?.nombre ?? codigo;

    // 5) Actividad de las conversaciones entre las personas de las cadenas.
    const actividad = await cargarActividad(sb, conversaciones.map((c) => c.id));
    const convPorPar = new Map(conversaciones.map((c) => [clavePar(c.usuario_a_id, c.usuario_b_id), c]));

    // 6) Cadenas actuales.
    const personas = new Set<string>();
    const personasSinCorreo = new Set<string>();
    const personasConSeguimiento = new Set<string>();
    const anunciosEnCadena = new Set<string>();
    for (const c of encontradas) {
      const filas = c.anuncios.map((a) => a.fila);
      const ultimo = filas.reduce((x, y) => (tocadoEl(y) > tocadoEl(x) ? y : x));
      const usuarios = c.anuncios.map((a) => a.usuario_id);
      const unicos = Array.from(new Set(usuarios));

      const participantes: ParticipanteAdmin[] = c.anuncios.map((a, i) => {
        const siguiente = c.anuncios[(i + 1) % c.anuncios.length];
        const muni = municipios.get(a.municipio_actual_codigo);
        const fila = avisoPor.get(`${c.huella}|${a.usuario_id}`);
        const registro: RegistroAviso | undefined = fila
          ? { enviadoEl: fila.enviado_el, sinCorreo: fila.sin_correo, reservadoEl: fila.notificada_el }
          : undefined;
        const s = situacionSeguimiento({
          yo: a.usuario_id,
          huella: c.huella,
          personas: unicos,
          admins,
          convPorPar,
          actividad,
          avisoEnviadoEl: fila && !fila.sin_correo ? fila.enviado_el : null,
          filas: seguimientos.filasDe(a.usuario_id),
          usuariosDeHuella: seguimientos.usuariosDeHuella,
          ahora,
        });
        return {
          anuncioId: a.id,
          usuarioId: a.usuario_id,
          alias: a.alias_publico,
          municipio: muni?.nombre ?? a.municipio_actual_codigo,
          provincia: muni?.provincia_nombre ?? "",
          destino: nombreMuni(siguiente.municipio_actual_codigo),
          estadoAnuncio: a.fila.estado,
          aviso: avisoAdmin(registro, ahora),
          avisadoEl: fila && fila.enviado_el && !fila.sin_correo ? fila.enviado_el : null,
          completo: a.usuario_id === ultimo.usuario_id,
          seguimiento: {
            hablanDesde: s.hablanDesde,
            primeroEl: enviadoDe(s.primero),
            segundoEl: enviadoDe(s.segundo),
            primeroDeOtra: s.primeroDeOtra,
            segundoDeOtra: s.segundoDeOtra,
            proximo: s.proximo,
            toca: s.toca !== 0,
            enviando: s.enviando,
            atrasado: s.toca !== 0 && s.proximo !== null && seguimientoAtrasado(s.proximo.fecha, ahora),
          },
        };
      });
      const pares = construirPares(usuarios, alias, convPorPar, actividad);
      const contacto = estadoContacto(pares);
      const sinAviso = new Set(
        participantes.filter((p) => p.aviso === "falta").map((p) => p.usuarioId),
      ).size;

      cadenas.push({
        huella: c.huella,
        longitud: c.longitud,
        categoria: categoria(c.anuncios[0].fila),
        participantes,
        formadaEl: tocadoEl(ultimo),
        contacto,
        pares,
        sinAviso,
      });

      resumen.total++;
      if (c.longitud === 2) resumen.directas++;
      else if (c.longitud === 3) resumen.aTres++;
      else resumen.aCuatro++;
      if (contacto !== "sin_contacto" && contacto !== "conversacion_vacia") resumen.conContacto++;
      if (contacto === "hablan") resumen.hablan++;
      if (sinAviso > 0) resumen.sinAviso++;
      const vistos = new Set<string>();
      for (const p of participantes) {
        if (p.aviso === "sin_correo") personasSinCorreo.add(p.usuarioId);
        if (vistos.has(p.usuarioId)) continue;
        vistos.add(p.usuarioId);
        if (p.seguimiento.toca) {
          resumen.seguimientosPendientes++;
          personasConSeguimiento.add(p.usuarioId);
        }
        if (p.seguimiento.atrasado) resumen.seguimientosAtrasados++;
      }
      for (const u of usuarios) personas.add(u);
      for (const a of c.anuncios) anunciosEnCadena.add(a.id);
    }
    resumen.personas = personas.size;
    resumen.anuncios = anunciosEnCadena.size;
    resumen.sinCorreo = personasSinCorreo.size;
    resumen.personasSeguimiento = personasConSeguimiento.size;
    cadenas.sort((x, y) => (x.formadaEl < y.formadaEl ? 1 : -1));

    // 7) Cadenas avisadas en el pasado que ya no estan.
    for (const huella of huellasPasadas) {
      const ids = idsDeHuella(huella);
      if (ids.length < 2) continue;
      const filas = ids.map((id) => pasadoPorId.get(id) ?? null);
      const conocidas = filas.filter((f): f is FilaAnuncio => f !== null);
      if (conocidas.length === 0) continue;
      const usuarios = conocidas.map((f) => f.usuario_id);
      const pares = construirPares(usuarios, alias, convPorPar, actividad);
      historicas.push({
        huella,
        longitud: ids.length,
        categoria: categoria(conocidas[0]),
        participantes: filas.map((f) =>
          f
            ? { alias: alias(f.usuario_id), municipio: nombreMuni(f.municipio_actual_codigo), estado: f.estado }
            : { alias: "—", municipio: "—", estado: "borrado" },
        ),
        avisadaEl: avisadaPorHuella.get(huella)!,
        resultado: resultadoHistorico(filas.map((f) => f?.estado ?? null)),
        contacto: estadoContacto(pares),
        pares,
      });
    }
    historicas.sort((x, y) => (x.avisadaEl < y.avisadaEl ? 1 : -1));
  } catch (e) {
    errores.push(`Cadenas: ${mensajeError(e)}`);
  }

  return { metricas, resumen, cadenas, historicas, errores };
}

/**
 * Avisos por email relacionados con cadenas:
 *
 *  - `notificarCadenasNuevas`: al publicar, editar o renovar un anuncio,
 *    busca las cadenas que lo incluyen y avisa a TODAS las personas de
 *    cada cadena, tambien a quien la acaba de completar.
 *  - `revisarAvisosPendientes`: red de seguridad diaria (cron). Recalcula
 *    todas las cadenas y avisa a quien aun no tenga su aviso: correos que
 *    fallaron o se cortaron, cadenas que aparecen sin que nadie publique
 *    (datos reparados, cambios en el motor) o cualquier fallo puntual.
 *  - `notificarCadenaCerradaPorPermuta`: al marcar un anuncio como
 *    permutado, avisa a quienes estaban en cadenas con el.
 *
 * Cada aviso (persona y cadena) se reserva en `cadenas_notificadas`, se
 * envia y solo entonces se confirma: si el correo falla se suelta, y si
 * el proceso se corta a medias la reserva se reintenta pasados 30
 * minutos. Una persona recibe un solo correo por revision aunque tenga
 * varias cadenas nuevas. Todo con el cliente de servidor (service_role).
 * Los avisos por evento son best-effort: un fallo se registra y no rompe
 * la accion del usuario.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectarCadenas, type AnuncioMatching, type Cadena } from "@/lib/matching";
import { anotarEnvio, claveIdempotencia, enviarEmail } from "@/lib/email/resend";
import {
  plantillaCadenasNuevas,
  plantillaCadenaCerradaPorOtro,
  type CadenaParaCorreo,
} from "@/lib/email/plantillas";
import {
  aAnunciosMatching,
  cargarAnunciosActivos,
  cargarMunicipios,
  cargarUniversoCombo,
  claveCombo,
  COLUMNAS_ANUNCIO,
  leerTodo,
  textoCategoria,
  trocear,
  type AnuncioDelUniverso,
  type FilaAnuncio,
} from "./universo";

/** Municipios de la cadena empezando por el participante `desde` y
 *  volviendo a el: ["Vigo", "Lugo", "Vigo"]. */
export function recorridoDesde<T extends { municipio_actual_codigo: string }>(
  participantes: T[],
  desde: number,
  nombre: (codigo: string) => string,
): string[] {
  const k = participantes.length;
  const orden = Array.from({ length: k }, (_, i) => participantes[(desde + i) % k]);
  return [...orden, orden[0]].map((p) => nombre(p.municipio_actual_codigo));
}

/** Alias de las demas personas de la cadena, vista desde `usuarioId`
 *  (nunca el suyo propio), en el orden del recorrido desde esa persona:
 *  sale igual empiece donde empiece la lista de la cadena. */
export function aliasDeLosDemas(
  participantes: { usuario_id: string; alias_publico: string }[],
  usuarioId: string,
): string[] {
  const desde = Math.max(0, participantes.findIndex((p) => p.usuario_id === usuarioId));
  const orden = [...participantes.slice(desde), ...participantes.slice(0, desde)];
  return Array.from(
    new Set(orden.filter((p) => p.usuario_id !== usuarioId).map((p) => p.alias_publico)),
  );
}

async function textoCuerpo(
  sb: SupabaseClient,
  combo: { cuerpo_id: string; especialidad_id: string | null },
): Promise<string> {
  const t = await textoCategoria(sb, combo, " · ");
  return t.cuerpo + (t.especialidad ? ` (${t.especialidad})` : "");
}

type ClienteAdmin = ReturnType<typeof createAdminClient>;

export type ResultadoAvisos = {
  cadenas: number;
  /** Avisos (persona y cadena) enviados y confirmados. */
  enviados: number;
  /** Correos enviados: una persona con varias cadenas recibe uno. */
  correos: number;
  fallidos: number;
  /** Avisos a cuentas sin correo utilizable (de prueba o sin confirmar). */
  sinCorreo: number;
  /** Avisos que otro proceso esta enviando en este momento. */
  enCurso: number;
  /** Solo en simulacion: avisos que se enviarian, como "huella|usuario". */
  pendientes: string[];
  /** Categorias que fallaron (las demas se revisaron igual). */
  gruposConError: number;
  /** Se acabo el tiempo antes de terminar: el resto, en la siguiente. */
  sinTerminar: boolean;
};

function resultadoVacio(): ResultadoAvisos {
  return {
    cadenas: 0,
    enviados: 0,
    correos: 0,
    fallidos: 0,
    sinCorreo: 0,
    enCurso: 0,
    pendientes: [],
    gruposConError: 0,
    sinTerminar: false,
  };
}

export type RegistroAviso = { enviadoEl: string | null; sinCorreo: boolean; reservadoEl: string };
export type EstadoAviso = "enviar" | "hecho" | "sin_correo" | "en_curso";

const RESERVA_ATASCADA_MS = 30 * 60_000;

/** Que hacer con el aviso de una persona segun lo apuntado. */
export function estadoAviso(r: RegistroAviso | undefined, ahora = Date.now()): EstadoAviso {
  if (!r) return "enviar";
  if (r.sinCorreo) return "sin_correo";
  if (r.enviadoEl !== null) return "hecho";
  return ahora - Date.parse(r.reservadoEl) > RESERVA_ATASCADA_MS ? "enviar" : "en_curso";
}

/**
 * Confirma un envio ya hecho (aviso_cadena_confirmar o
 * seguimiento_confirmar). Si falla, lo reintenta una vez: una reserva sin
 * confirmar se volveria a enviar pasada media hora.
 */
export async function confirmarConReintento(
  sb: SupabaseClient,
  funcion: "aviso_cadena_confirmar" | "seguimiento_confirmar",
  args: Record<string, unknown>,
  esperados: number,
): Promise<void> {
  for (let intento = 1; intento <= 2; intento++) {
    const { data, error } = await sb.rpc(funcion, args);
    if (!error) {
      if (typeof data === "number" && data < esperados) {
        console.warn(`[${funcion}] confirmados ${data} de ${esperados}`);
      }
      return;
    }
    console.error(`[${funcion}] intento ${intento} fallido:`, error.message);
    if (intento === 1) await new Promise((r) => setTimeout(r, 500));
  }
}

/** Avisos apuntados de estas cadenas, por "huella|usuario". Las huellas
 *  miden hasta 147 caracteres: se consultan de 20 en 20 para no pasar del
 *  tamano maximo de peticion. */
export async function avisosRegistrados(
  sb: SupabaseClient,
  huellas: string[],
): Promise<Map<string, RegistroAviso>> {
  const mapa = new Map<string, RegistroAviso>();
  for (const lote of trocear(Array.from(new Set(huellas)), 20)) {
    const filas = await leerTodo<{
      usuario_id: string;
      cadena_huella: string;
      notificada_el: string;
      enviado_el: string | null;
      sin_correo: boolean;
    }>((desde, hasta) =>
      sb
        .from("cadenas_notificadas")
        .select("usuario_id, cadena_huella, notificada_el, enviado_el, sin_correo")
        .in("cadena_huella", lote)
        .order("id")
        .range(desde, hasta),
    );
    for (const f of filas) {
      mapa.set(`${f.cadena_huella}|${f.usuario_id}`, {
        enviadoEl: f.enviado_el,
        sinCorreo: f.sin_correo,
        reservadoEl: f.notificada_el,
      });
    }
  }
  return mapa;
}

/**
 * Borra las reservas que se cortaron a medias (mas de 30 minutos sin
 * confirmar) de cadenas que ya no existen: nunca se enviaran y solo
 * ensuciarian las cifras del panel. `huellasActuales` debe tener TODAS
 * las cadenas de ahora.
 */
export async function soltarReservasHuerfanas(
  sb: SupabaseClient,
  tabla: "cadenas_notificadas" | "seguimientos_permuta",
  huellasActuales: Set<string>,
): Promise<number> {
  const columnaFecha = tabla === "cadenas_notificadas" ? "notificada_el" : "reservado_el";
  const limite = new Date(Date.now() - RESERVA_ATASCADA_MS).toISOString();
  const filas = await leerTodo<{ id: string; cadena_huella: string }>((desde, hasta) =>
    sb
      .from(tabla)
      .select("id, cadena_huella")
      .is("enviado_el", null)
      .lt(columnaFecha, limite)
      .order("id")
      .range(desde, hasta),
  );
  const ids = filas.filter((f) => !huellasActuales.has(f.cadena_huella)).map((f) => f.id);
  for (const lote of trocear(ids, 100)) {
    // Se repiten las condiciones: si entre la lectura y el borrado alguien
    // vuelve a reservar la fila (misma id), ya no esta atascada y no se toca.
    const { error } = await sb
      .from(tabla)
      .delete()
      .in("id", lote)
      .is("enviado_el", null)
      .lt(columnaFecha, limite);
    if (error) throw new Error(error.message);
  }
  return ids.length;
}

export type AvisoPendiente = CadenaParaCorreo & {
  usuarioId: string;
  huella: string;
  estado: "enviar" | "sin_correo";
};

/** Agrupa los avisos por persona, sin repetir cadena. */
export function agruparPorPersona(avisos: AvisoPendiente[]): Map<string, AvisoPendiente[]> {
  const mapa = new Map<string, AvisoPendiente[]>();
  for (const a of avisos) {
    const lista = mapa.get(a.usuarioId) ?? [];
    if (!lista.some((x) => x.huella === a.huella)) lista.push(a);
    mapa.set(a.usuarioId, lista);
  }
  return mapa;
}

/**
 * Avisos que faltan en estas cadenas, todas de la misma categoria. Las
 * cuentas sin correo se incluyen para volver a mirar si ya lo tienen.
 */
async function avisosQueFaltan(
  sb: ClienteAdmin,
  universo: AnuncioDelUniverso[],
  cadenas: Cadena[],
  combo: { cuerpo_id: string; especialidad_id: string | null },
  resultado: ResultadoAvisos,
): Promise<AvisoPendiente[]> {
  if (cadenas.length === 0) return [];
  const porId = new Map(universo.map((x) => [x.id, x]));
  const [municipios, cuerpoTexto, registrados] = await Promise.all([
    cargarMunicipios(sb, universo.map((x) => x.municipio_actual_codigo)),
    textoCuerpo(sb, combo),
    avisosRegistrados(sb, cadenas.map((c) => c.huella)),
  ]);
  const nombre = (c: string) => municipios.get(c)?.nombre ?? c;
  const ahora = Date.now();
  const faltan: AvisoPendiente[] = [];

  for (const c of cadenas) {
    const participantes = c.anuncios
      .map((id) => porId.get(id))
      .filter((x): x is AnuncioDelUniverso => x !== undefined);
    if (participantes.length !== c.longitud) continue;
    resultado.cadenas++;

    for (const usuarioId of new Set(participantes.map((p) => p.usuario_id))) {
      const estado = estadoAviso(registrados.get(`${c.huella}|${usuarioId}`), ahora);
      if (estado === "hecho") continue;
      if (estado === "en_curso") {
        resultado.enCurso++;
        continue;
      }
      const suPosicion = participantes.findIndex((p) => p.usuario_id === usuarioId);
      faltan.push({
        usuarioId,
        huella: c.huella,
        estado,
        longitud: c.longitud,
        recorrido: recorridoDesde(participantes, Math.max(0, suPosicion), nombre),
        aliasOtros: aliasDeLosDemas(participantes, usuarioId),
        cuerpoTexto,
      });
    }
  }
  return faltan;
}

/** Reserva, envia un correo por persona y confirma (o suelta si falla). */
async function enviarAvisos(
  sb: ClienteAdmin,
  avisos: AvisoPendiente[],
  resultado: ResultadoAvisos,
  opciones: { simular: boolean; hasta: number },
): Promise<void> {
  for (const [usuarioId, lista] of agruparPorPersona(avisos)) {
    if (Date.now() > opciones.hasta) {
      resultado.sinTerminar = true;
      break;
    }
    if (opciones.simular) {
      for (const a of lista) {
        if (a.estado === "sin_correo") resultado.sinCorreo++;
        else resultado.pendientes.push(`${a.huella}|${usuarioId}`);
      }
      continue;
    }

    const aEnviar: AvisoPendiente[] = [];
    let correo: string | null = null;
    for (const a of lista) {
      const { data, error } = await sb.rpc("aviso_cadena_reservar", {
        p_destinatario: usuarioId,
        p_huella: a.huella,
      });
      if (error) {
        console.warn("[avisos-cadena] no se pudo reservar el aviso:", error.message);
        resultado.fallidos++;
        continue;
      }
      const fila = (Array.isArray(data) ? data[0] : data) as
        | { accion: string; correo: string | null }
        | undefined;
      if (fila?.accion === "enviar" && fila.correo) {
        aEnviar.push(a);
        correo = fila.correo;
      } else if (fila?.accion === "sin_correo" || a.estado === "sin_correo") {
        resultado.sinCorreo++;
      } else {
        resultado.enCurso++;
      }
    }
    if (!correo || aEnviar.length === 0) continue;

    const huellas = aEnviar.map((a) => a.huella);
    const plantilla = plantillaCadenasNuevas({ cadenas: aEnviar });
    const registro = { tipo: "cadena_nueva" as const, referencia: huellas.join(" ") };
    const r = await enviarEmail({
      to: correo,
      subject: plantilla.subject,
      html: plantilla.html,
      text: plantilla.text,
      idempotencyKey: claveIdempotencia("cadenas", usuarioId, huellas, plantilla),
    });
    if (r.ok) {
      resultado.correos++;
      resultado.enviados += huellas.length;
      // Primero se confirma (lo que evita repetir el correo) y despues se
      // anota en el registro.
      await confirmarConReintento(
        sb,
        "aviso_cadena_confirmar",
        { p_destinatario: usuarioId, p_huellas: huellas },
        huellas.length,
      );
      await anotarEnvio(registro, true, null);
    } else {
      resultado.fallidos += huellas.length;
      await anotarEnvio(registro, false, r.error);
      const { error } = await sb.rpc("aviso_cadena_soltar", {
        p_destinatario: usuarioId,
        p_huellas: huellas,
      });
      if (error) console.error("[avisos-cadena] aviso fallido sin poder soltarlo:", error.message);
    }
  }
}

/** Margen para enviar tras una accion: la funcion tiene 60 s en total
 *  (maxDuration de la pagina) y ya ha gastado parte en responder. */
const MARGEN_TRAS_ACCION_MS = 40_000;

/**
 * Avisa de las cadenas nuevas que incluyen este anuncio. `inicio`: cuando
 * empezo la accion que lo pide (el tiempo cuenta desde ahi). Lo que no de
 * tiempo a enviar lo envia la revision diaria.
 */
export async function notificarCadenasNuevas(
  anuncioId: string,
  opciones: { inicio?: number } = {},
): Promise<void> {
  const hasta = (opciones.inicio ?? Date.now()) + MARGEN_TRAS_ACCION_MS;
  try {
    const sb = createAdminClient();

    const { data: a, error } = await sb
      .from("anuncios")
      .select("id, sector_codigo, cuerpo_id, especialidad_id, estado, es_demo")
      .eq("id", anuncioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const ref = a as {
      id: string;
      sector_codigo: string;
      cuerpo_id: string;
      especialidad_id: string | null;
      estado: string;
      es_demo: boolean;
    } | null;
    if (!ref || ref.estado !== "activo" || ref.es_demo) return;

    const universo = await cargarUniversoCombo(sb, ref);
    const origen = universo.filter((x) => x.id === anuncioId);
    if (origen.length === 0 || universo.length < 2) return;

    const resultado = resultadoVacio();
    const faltan = await avisosQueFaltan(sb, universo, detectarCadenas(universo, origen), ref, resultado);
    await enviarAvisos(sb, faltan, resultado, { simular: false, hasta });
    if (resultado.fallidos > 0 || resultado.sinTerminar) {
      console.warn("[notificarCadenasNuevas] avisos pendientes para la revision diaria:", {
        fallidos: resultado.fallidos,
        sinTerminar: resultado.sinTerminar,
      });
    }
  } catch (e) {
    console.warn("[notificarCadenasNuevas] error best-effort:", e);
  }
}

/**
 * Red de seguridad: recalcula TODAS las cadenas entre anuncios reales y
 * avisa a quien falte. Lo llama el cron diario. Lanza error si no puede
 * leer los anuncios (para que el cron lo marque como fallido). Con
 * `simular`, no envia ni apunta nada: solo lista los avisos pendientes.
 */
export async function revisarAvisosPendientes(
  opciones: { simular?: boolean; cliente?: ClienteAdmin; limiteMs?: number } = {},
): Promise<ResultadoAvisos> {
  const sb = opciones.cliente ?? createAdminClient();
  const inicio = Date.now();
  const limiteMs = opciones.limiteMs ?? 50_000;
  const resultado = resultadoVacio();
  const activos = await aAnunciosMatching(sb, await cargarAnunciosActivos(sb));

  const grupos = new Map<string, AnuncioDelUniverso[]>();
  for (const a of activos) {
    const k = claveCombo(a);
    const g = grupos.get(k) ?? [];
    g.push(a);
    grupos.set(k, g);
  }
  // Primero las categorias pequenas (rapidas), empezando cada dia por una
  // distinta para que, si alguna vez falta tiempo, no se quede siempre la
  // misma sin revisar. Un fallo en una categoria no impide revisar las
  // demas. Se reserva tiempo para enviar.
  const ordenados = Array.from(grupos.values())
    .filter((g) => g.length >= 2)
    .sort((a, b) => a.length - b.length);
  const desplazamiento = ordenados.length > 0 ? Math.floor(inicio / 86_400_000) % ordenados.length : 0;
  const recorrido = [...ordenados.slice(desplazamiento), ...ordenados.slice(0, desplazamiento)];

  const faltan: AvisoPendiente[] = [];
  const huellasActuales = new Set<string>();
  for (const g of recorrido) {
    if (Date.now() - inicio > limiteMs * 0.6) {
      resultado.sinTerminar = true;
      break;
    }
    try {
      const cadenas = detectarCadenas(g, g);
      for (const c of cadenas) huellasActuales.add(c.huella);
      faltan.push(...(await avisosQueFaltan(sb, g, cadenas, g[0], resultado)));
    } catch (e) {
      resultado.gruposConError++;
      console.warn("[avisos-cadena] error en una categoria:", e);
    }
  }
  const simular = opciones.simular === true;
  await enviarAvisos(sb, faltan, resultado, { simular, hasta: inicio + limiteMs });

  if (!simular && !resultado.sinTerminar && resultado.gruposConError === 0) {
    try {
      const soltadas = await soltarReservasHuerfanas(sb, "cadenas_notificadas", huellasActuales);
      if (soltadas > 0) console.info(`[avisos-cadena] ${soltadas} reservas de cadenas que ya no existen`);
    } catch (e) {
      console.warn("[avisos-cadena] no se pudieron limpiar las reservas cortadas:", e);
    }
  }
  return resultado;
}

/**
 * Manda un email a cada OTRO participante de cadenas que incluian este
 * anuncio, avisando de que ya no son viables. No usa la deduplicacion de
 * `cadenas_notificadas`: es un evento puntual de cierre.
 */
export async function notificarCadenaCerradaPorPermuta(
  anuncioId: string,
  opciones: { inicio?: number } = {},
): Promise<void> {
  const hasta = (opciones.inicio ?? Date.now()) + MARGEN_TRAS_ACCION_MS;
  try {
    const sb = createAdminClient();

    const { data, error } = await sb
      .from("anuncios")
      .select(COLUMNAS_ANUNCIO)
      .eq("id", anuncioId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const cerradoFila = data as FilaAnuncio | null;
    if (!cerradoFila || cerradoFila.estado !== "permutado") return;

    const activos = (await cargarUniversoCombo(sb, cerradoFila)).filter(
      (x) => x.id !== cerradoFila.id,
    );
    if (activos.length === 0) return;
    const [cerrado] = await aAnunciosMatching(sb, [cerradoFila]);
    if (!cerrado) return;

    // Cadenas que existian antes del cierre (metemos el anuncio cerrado
    // como si siguiera activo).
    const conCerrado: AnuncioMatching[] = [...activos, cerrado];
    const afectadas = detectarCadenas(conCerrado, [cerrado]);
    if (afectadas.length === 0) return;

    // Cadenas que siguen abiertas sin el, por usuario.
    const restantesPorUsuario = new Map<string, number>();
    const porIdActivos = new Map(activos.map((x) => [x.id, x]));
    for (const c of detectarCadenas(activos, activos)) {
      const usuarios = new Set(
        c.anuncios.map((id) => porIdActivos.get(id)?.usuario_id).filter(Boolean) as string[],
      );
      for (const u of usuarios) {
        restantesPorUsuario.set(u, (restantesPorUsuario.get(u) ?? 0) + 1);
      }
    }

    const porId = new Map(conCerrado.map((x) => [x.id, x]));
    const municipios = await cargarMunicipios(
      sb,
      conCerrado.map((x) => x.municipio_actual_codigo),
    );
    const nombre = (c: string) => municipios.get(c)?.nombre ?? c;

    const recorridosPorUsuario = new Map<string, string[]>();
    for (const c of afectadas) {
      const participantes = c.anuncios
        .map((id) => porId.get(id))
        .filter((x): x is AnuncioMatching => x !== undefined);
      if (participantes.length !== c.longitud) continue;
      const recorrido = recorridoDesde(participantes, 0, nombre).join(" → ");
      for (const u of new Set(participantes.map((p) => p.usuario_id))) {
        if (u === cerrado.usuario_id) continue;
        const lista = recorridosPorUsuario.get(u) ?? [];
        if (!lista.includes(recorrido)) lista.push(recorrido);
        recorridosPorUsuario.set(u, lista);
      }
    }
    if (recorridosPorUsuario.size === 0) return;

    const { data: filas, error: errEmails } = await sb.rpc("emails_aviso_cierre", {
      p_anuncio_cerrado: cerrado.id,
      p_destinatarios: Array.from(recorridosPorUsuario.keys()),
    });
    if (errEmails) throw new Error(errEmails.message);

    const cuerpoTexto = await textoCuerpo(sb, cerradoFila);
    const destinatarios = (filas ?? []) as { usuario_id: string; email: string }[];
    for (const [i, f] of destinatarios.entries()) {
      if (Date.now() > hasta) {
        console.warn(
          `[notificarCadenaCerradaPorPermuta] sin tiempo: ${destinatarios.length - i} avisos de cierre sin enviar`,
        );
        break;
      }
      const recorridos = recorridosPorUsuario.get(f.usuario_id);
      if (!recorridos || !f.email) continue;
      const plantilla = plantillaCadenaCerradaPorOtro({
        aliasQueCerro: cerrado.alias_publico,
        recorridosAfectados: recorridos,
        cuerpoTexto,
        cadenasRestantes: restantesPorUsuario.get(f.usuario_id) ?? 0,
      });
      await enviarEmail({
        to: f.email,
        subject: plantilla.subject,
        html: plantilla.html,
        text: plantilla.text,
        registro: { tipo: "cadena_cerrada", referencia: cerrado.id },
        idempotencyKey: claveIdempotencia("cierre", f.usuario_id, [cerrado.id], plantilla),
      });
    }
  } catch (e) {
    console.warn("[notificarCadenaCerradaPorPermuta] error best-effort:", e);
  }
}

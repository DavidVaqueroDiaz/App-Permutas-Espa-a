/**
 * Seguimiento de permutas: «¿Conseguisteis la permuta?».
 *
 * A cada persona de una cadena actual que ya recibio el aviso de esa
 * cadena y se ha escrito en las dos direcciones con otra persona de ella,
 * a los 30 dias le llega un correo para que marque la permuta si ya la
 * tiene. El plazo cuenta desde lo ultimo de las dos cosas (aviso y
 * conversacion de ida y vuelta). Si no marca nada, recibe un unico
 * recordatorio cuando se cumplen 90 dias (y al menos 30 desde el primero).
 * Si ya se le pregunto por otra cadena en la que estaban las mismas
 * personas con las que habla, no se le vuelve a preguntar: ese correo
 * cuenta como propio. Las conversaciones con administradores no cuentan
 * (son pruebas o soporte). Lo envia el cron diario
 * /api/cron/seguimiento-permutas.
 *
 * Igual que los avisos de cadena: cada correo se reserva, se envia y se
 * confirma (tabla seguimientos_permuta), una persona recibe un solo
 * correo por revision y nada se repite.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectarCadenas, idsDeHuella } from "@/lib/matching";
import { anotarEnvio, claveIdempotencia, enviarEmail } from "@/lib/email/resend";
import {
  plantillaSeguimientoPermuta,
  type SeguimientoParaCorreo,
} from "@/lib/email/plantillas";
import {
  aAnunciosMatching,
  cargarAnunciosActivos,
  cargarMunicipios,
  claveCombo,
  leerPorLotes,
  textoCategoria,
  type AnuncioDelUniverso,
} from "./universo";
import {
  cargarActividad,
  cargarAdmins,
  cargarConversaciones,
  clavePar,
  inicioMutuo,
  type ActividadConversacion,
  type ConversacionFila,
} from "./contactos";
import {
  avisosRegistrados,
  confirmarConReintento,
  recorridoDesde,
  soltarReservasHuerfanas,
} from "./notificar";

export const DIAS_PRIMER_SEGUIMIENTO = 30;
export const DIAS_RECORDATORIO = 90;
export const DIAS_ENTRE_SEGUIMIENTOS = 30;
const DIA_MS = 86_400_000;
const RESERVA_ATASCADA_MS = 30 * 60_000;

export type RegistroSeguimiento = {
  enviadoEl: string | null;
  reservadoEl: string;
  sinCorreo: boolean;
};

export type FilaSeguimiento = RegistroSeguimiento & {
  huella: string;
  numero: 1 | 2;
};

const atascado = (r: RegistroSeguimiento, ahora: number) =>
  r.enviadoEl === null && ahora - Date.parse(r.reservadoEl) > RESERVA_ATASCADA_MS;

/**
 * Que seguimiento toca a una persona en una cadena: 1, 2 o ninguno (0).
 * `inicio` es desde cuando cuenta el plazo.
 */
export function seguimientoQueToca(opts: {
  inicio: string;
  ahora: number;
  primero?: RegistroSeguimiento;
  segundo?: RegistroSeguimiento;
}): 0 | 1 | 2 {
  const { ahora, primero, segundo } = opts;
  const dias = (ahora - Date.parse(opts.inicio)) / DIA_MS;

  if (!primero || atascado(primero, ahora)) return dias >= DIAS_PRIMER_SEGUIMIENTO ? 1 : 0;
  if (primero.enviadoEl === null || primero.sinCorreo) return 0;

  if (segundo && !atascado(segundo, ahora)) return 0;
  const desdePrimero = (ahora - Date.parse(primero.enviadoEl)) / DIA_MS;
  return dias >= DIAS_RECORDATORIO && desdePrimero >= DIAS_ENTRE_SEGUIMIENTOS ? 2 : 0;
}

/** Cuando toca el siguiente seguimiento (aunque sea en el pasado), o null
 *  si ya no toca ninguno. Para el panel. */
export function proximoSeguimiento(r: {
  inicio: string | null;
  primero?: RegistroSeguimiento;
  segundo?: RegistroSeguimiento;
}): { numero: 1 | 2; fecha: string } | null {
  if (!r.inicio) return null;
  const base = Date.parse(r.inicio);
  if (!r.primero || r.primero.enviadoEl === null) {
    return { numero: 1, fecha: new Date(base + DIAS_PRIMER_SEGUIMIENTO * DIA_MS).toISOString() };
  }
  if (r.primero.sinCorreo) return null;
  if (r.segundo && r.segundo.enviadoEl !== null) return null;
  const fecha = Math.max(
    base + DIAS_RECORDATORIO * DIA_MS,
    Date.parse(r.primero.enviadoEl) + DIAS_ENTRE_SEGUIMIENTOS * DIA_MS,
  );
  return { numero: 2, fecha: new Date(fecha).toISOString() };
}

/** El seguimiento empezo a enviarse la noche del 17/09/2026: lo que
 *  tocaba antes cuenta como pendiente desde entonces. */
const SEGUIMIENTO_ACTIVO_DESDE = Date.parse("2026-09-18T00:00:00Z");
const MARGEN_REVISION_DIARIA_MS = 26 * 3_600_000;

/** Un seguimiento que debia haber salido en una revision diaria anterior
 *  y no ha salido: la tarea diaria no funciona o los correos fallan. */
export function seguimientoAtrasado(fecha: string, ahora = Date.now()): boolean {
  return Math.max(Date.parse(fecha), SEGUIMIENTO_ACTIVO_DESDE) + MARGEN_REVISION_DIARIA_MS < ahora;
}

/**
 * Desde cuando `yo` y alguna otra persona de la cadena se han escrito las
 * dos (la fecha mas antigua), y con quienes. Sin administradores.
 */
export function inicioDePersona(
  yo: string,
  personas: string[],
  admins: Set<string>,
  convPorPar: Map<string, ConversacionFila>,
  actividad: Map<string, ActividadConversacion>,
): { inicio: string | null; con: string[] } {
  if (admins.has(yo)) return { inicio: null, con: [] };
  let inicio: string | null = null;
  const con: string[] = [];
  for (const otro of personas) {
    if (otro === yo || admins.has(otro)) continue;
    const conv = convPorPar.get(clavePar(yo, otro));
    const desde = conv ? inicioMutuo(actividad.get(conv.id), yo, otro) : null;
    if (!desde) continue;
    con.push(otro);
    if (!inicio || desde < inicio) inicio = desde;
  }
  return { inicio, con };
}

/**
 * Seguimiento numero `numero` ya enviado a esta persona por OTRA cadena en
 * la que estaban todas las personas con las que habla en esta (`con`). Si
 * hay varios, el mas antiguo.
 */
export function seguimientoDeOtraCadena(
  filas: FilaSeguimiento[],
  numero: 1 | 2,
  huella: string,
  con: string[],
  usuariosDeHuella: (h: string) => Set<string>,
): RegistroSeguimiento | undefined {
  if (con.length === 0) return undefined;
  let elegido: FilaSeguimiento | undefined;
  for (const f of filas) {
    if (f.numero !== numero || f.huella === huella || !f.enviadoEl || f.sinCorreo) continue;
    const usuarios = usuariosDeHuella(f.huella);
    if (!con.every((u) => usuarios.has(u))) continue;
    if (!elegido || f.enviadoEl < (elegido.enviadoEl as string)) elegido = f;
  }
  return elegido && { enviadoEl: elegido.enviadoEl, reservadoEl: elegido.reservadoEl, sinCorreo: false };
}

export type SituacionSeguimiento = {
  /** Personas de la cadena con las que habla (ida y vuelta). */
  con: string[];
  /** Desde cuando habla con alguna de ellas. */
  hablanDesde: string | null;
  /** Desde cuando cuenta el plazo (null: aun no habla o no tiene el aviso). */
  inicio: string | null;
  primero?: RegistroSeguimiento;
  segundo?: RegistroSeguimiento;
  /** El primero o el segundo se lo enviamos por otra cadena. */
  primeroDeOtra: boolean;
  segundoDeOtra: boolean;
  /** Seguimiento que toca enviar ahora (0: ninguno). */
  toca: 0 | 1 | 2;
  /** Se esta enviando ahora mismo. */
  enviando: boolean;
  proximo: { numero: 1 | 2; fecha: string } | null;
};

/** Situacion del seguimiento de una persona en una cadena actual. */
export function situacionSeguimiento(opts: {
  yo: string;
  huella: string;
  personas: string[];
  admins: Set<string>;
  convPorPar: Map<string, ConversacionFila>;
  actividad: Map<string, ActividadConversacion>;
  /** Cuando se le envio el aviso de esta cadena (null: aun no o sin correo). */
  avisoEnviadoEl: string | null;
  /** Todos los seguimientos de esta persona. */
  filas: FilaSeguimiento[];
  usuariosDeHuella: (h: string) => Set<string>;
  ahora: number;
}): SituacionSeguimiento {
  const { yo, huella, filas, ahora } = opts;
  const { inicio: hablanDesde, con } = inicioDePersona(
    yo,
    opts.personas,
    opts.admins,
    opts.convPorPar,
    opts.actividad,
  );
  const aviso = opts.avisoEnviadoEl;
  const inicio = hablanDesde && aviso ? (hablanDesde > aviso ? hablanDesde : aviso) : null;

  const propio = (n: 1 | 2) => filas.find((f) => f.huella === huella && f.numero === n);
  const p1 = propio(1);
  const p2 = propio(2);
  const o1 = p1 ? undefined : seguimientoDeOtraCadena(filas, 1, huella, con, opts.usuariosDeHuella);
  const o2 = p2 ? undefined : seguimientoDeOtraCadena(filas, 2, huella, con, opts.usuariosDeHuella);
  const primero = p1 ?? o1;
  const segundo = p2 ?? o2;
  const enCurso = (r?: RegistroSeguimiento) => !!r && r.enviadoEl === null && !atascado(r, ahora);

  return {
    con,
    hablanDesde,
    inicio,
    primero,
    segundo,
    primeroDeOtra: !!o1,
    segundoDeOtra: !!o2,
    toca: inicio ? seguimientoQueToca({ inicio, ahora, primero, segundo }) : 0,
    enviando: enCurso(p1) || enCurso(p2),
    proximo: proximoSeguimiento({ inicio, primero, segundo }),
  };
}

type FilaBd = {
  usuario_id: string;
  cadena_huella: string;
  numero: number;
  reservado_el: string;
  enviado_el: string | null;
  sin_correo: boolean;
};

/**
 * Seguimientos ya apuntados de estas personas, y a quien pertenecen los
 * anuncios de esas cadenas (para saber con quien se hablo). `conocidos`:
 * anuncio -> usuario que ya se tengan cargados.
 */
export async function cargarDatosSeguimiento(
  sb: SupabaseClient,
  usuarioIds: string[],
  conocidos: Map<string, string>,
): Promise<{
  filasDe: (usuarioId: string) => FilaSeguimiento[];
  usuariosDeHuella: (huella: string) => Set<string>;
}> {
  const filas = await leerPorLotes<FilaBd>(usuarioIds, (lote, desde, hasta) =>
    sb
      .from("seguimientos_permuta")
      .select("usuario_id, cadena_huella, numero, reservado_el, enviado_el, sin_correo")
      .in("usuario_id", lote)
      .order("id")
      .range(desde, hasta),
  );
  const porUsuario = new Map<string, FilaSeguimiento[]>();
  for (const f of filas) {
    const lista = porUsuario.get(f.usuario_id) ?? [];
    lista.push({
      huella: f.cadena_huella,
      numero: f.numero === 2 ? 2 : 1,
      enviadoEl: f.enviado_el,
      reservadoEl: f.reservado_el,
      sinCorreo: f.sin_correo,
    });
    porUsuario.set(f.usuario_id, lista);
  }

  const duenos = new Map(conocidos);
  const faltan = Array.from(
    new Set(filas.flatMap((f) => idsDeHuella(f.cadena_huella)).filter((id) => !duenos.has(id))),
  );
  const anuncios = await leerPorLotes<{ id: string; usuario_id: string }>(faltan, (lote, desde, hasta) =>
    sb.from("anuncios").select("id, usuario_id").in("id", lote).order("id").range(desde, hasta),
  );
  for (const a of anuncios) duenos.set(a.id, a.usuario_id);

  return {
    filasDe: (u) => porUsuario.get(u) ?? [],
    usuariosDeHuella: (h) =>
      new Set(idsDeHuella(h).map((id) => duenos.get(id)).filter((u): u is string => !!u)),
  };
}

export type SeguimientoPendiente = SeguimientoParaCorreo & {
  usuarioId: string;
  alias: string;
  huella: string;
  /** Desde cuando cuenta el plazo. */
  inicio: string;
};

export type EstadoSeguimientos = {
  /** Seguimientos que tocan hoy. */
  pendientes: SeguimientoPendiente[];
  /** Huellas de todas las cadenas actuales. */
  huellasActuales: Set<string>;
};

/**
 * Calcula, con los datos de ahora, que seguimientos tocan. Recorre las
 * cadenas actuales entre anuncios reales.
 */
export async function calcularSeguimientos(
  sb: SupabaseClient,
  ahora = Date.now(),
): Promise<EstadoSeguimientos> {
  const estado: EstadoSeguimientos = { pendientes: [], huellasActuales: new Set() };
  const activos = await aAnunciosMatching(sb, await cargarAnunciosActivos(sb));

  const grupos = new Map<string, AnuncioDelUniverso[]>();
  for (const a of activos) {
    const k = claveCombo(a);
    const g = grupos.get(k) ?? [];
    g.push(a);
    grupos.set(k, g);
  }
  const cadenas: { huella: string; longitud: 2 | 3 | 4; participantes: AnuncioDelUniverso[] }[] = [];
  const porId = new Map(activos.map((a) => [a.id, a]));
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    for (const c of detectarCadenas(g, g)) {
      const participantes = c.anuncios
        .map((id) => porId.get(id))
        .filter((x): x is AnuncioDelUniverso => x !== undefined);
      if (participantes.length === c.longitud) {
        cadenas.push({ huella: c.huella, longitud: c.longitud, participantes });
        estado.huellasActuales.add(c.huella);
      }
    }
  }
  if (cadenas.length === 0) return estado;

  const usuarios = Array.from(new Set(cadenas.flatMap((c) => c.participantes.map((p) => p.usuario_id))));
  const [admins, conversaciones, datos, avisos, municipios] = await Promise.all([
    cargarAdmins(sb),
    cargarConversaciones(sb, usuarios),
    cargarDatosSeguimiento(
      sb,
      usuarios,
      new Map(activos.map((a) => [a.id, a.usuario_id])),
    ),
    avisosRegistrados(sb, cadenas.map((c) => c.huella)),
    cargarMunicipios(
      sb,
      cadenas.flatMap((c) => c.participantes.map((p) => p.municipio_actual_codigo)),
    ),
  ]);
  const actividad = await cargarActividad(sb, conversaciones.map((c) => c.id));
  const convPorPar = new Map(conversaciones.map((c) => [clavePar(c.usuario_a_id, c.usuario_b_id), c]));
  const nombre = (codigo: string) => municipios.get(codigo)?.nombre ?? codigo;

  const textos = new Map<string, string>();
  const cuerpoDe = async (a: AnuncioDelUniverso) => {
    const k = claveCombo(a);
    if (!textos.has(k)) {
      const t = await textoCategoria(sb, a, " · ");
      textos.set(k, t.cuerpo + (t.especialidad ? ` (${t.especialidad})` : ""));
    }
    return textos.get(k)!;
  };

  for (const c of cadenas) {
    const personas = Array.from(new Set(c.participantes.map((p) => p.usuario_id)));
    for (const yo of personas) {
      const aviso = avisos.get(`${c.huella}|${yo}`);
      const s = situacionSeguimiento({
        yo,
        huella: c.huella,
        personas,
        admins,
        convPorPar,
        actividad,
        avisoEnviadoEl: aviso && !aviso.sinCorreo ? aviso.enviadoEl : null,
        filas: datos.filasDe(yo),
        usuariosDeHuella: datos.usuariosDeHuella,
        ahora,
      });
      if (s.toca === 0 || !s.inicio) continue;

      const posicion = c.participantes.findIndex((p) => p.usuario_id === yo);
      const mio = c.participantes[posicion];
      const hablados = s.con
        .map((u) => c.participantes.find((p) => p.usuario_id === u)?.alias_publico)
        .filter((a): a is string => !!a);
      estado.pendientes.push({
        usuarioId: yo,
        alias: mio.alias_publico,
        huella: c.huella,
        inicio: s.inicio,
        numero: s.toca,
        anuncioId: mio.id,
        longitud: c.longitud,
        recorrido: recorridoDesde(c.participantes, posicion, nombre),
        aliasHablados: Array.from(new Set(hablados)),
        cuerpoTexto: await cuerpoDe(mio),
      });
    }
  }
  return estado;
}

export type ResultadoSeguimiento = {
  /** Seguimientos que tocaban (persona, cadena). */
  tocaban: number;
  enviados: number;
  correos: number;
  fallidos: number;
  sinCorreo: number;
  enCurso: number;
  /** Solo en simulacion: "huella|usuario|numero". */
  pendientes: string[];
  sinTerminar: boolean;
};

/**
 * Envia los seguimientos que tocan: un correo por persona. Con `simular`
 * no envia ni apunta nada.
 */
export async function enviarSeguimientos(
  opciones: { simular?: boolean; cliente?: ReturnType<typeof createAdminClient>; limiteMs?: number } = {},
): Promise<ResultadoSeguimiento> {
  const sb = opciones.cliente ?? createAdminClient();
  const hasta = Date.now() + (opciones.limiteMs ?? 50_000);
  const { pendientes, huellasActuales } = await calcularSeguimientos(sb);
  if (!opciones.simular) {
    try {
      await soltarReservasHuerfanas(sb, "seguimientos_permuta", huellasActuales);
    } catch (e) {
      console.warn("[seguimiento] no se pudieron limpiar las reservas cortadas:", e);
    }
  }
  const resultado: ResultadoSeguimiento = {
    tocaban: pendientes.length,
    enviados: 0,
    correos: 0,
    fallidos: 0,
    sinCorreo: 0,
    enCurso: 0,
    pendientes: [],
    sinTerminar: false,
  };

  const porPersona = new Map<string, SeguimientoPendiente[]>();
  for (const p of pendientes) {
    const lista = porPersona.get(p.usuarioId) ?? [];
    lista.push(p);
    porPersona.set(p.usuarioId, lista);
  }

  for (const [usuarioId, lista] of porPersona) {
    if (Date.now() > hasta) {
      resultado.sinTerminar = true;
      break;
    }
    if (opciones.simular) {
      for (const p of lista) resultado.pendientes.push(`${p.huella}|${usuarioId}|${p.numero}`);
      continue;
    }

    const aEnviar: SeguimientoPendiente[] = [];
    let correo: string | null = null;
    for (const p of lista) {
      const { data, error } = await sb.rpc("seguimiento_reservar", {
        p_destinatario: usuarioId,
        p_huella: p.huella,
        p_numero: p.numero,
      });
      if (error) {
        console.warn("[seguimiento] no se pudo reservar:", error.message);
        resultado.fallidos++;
        continue;
      }
      const fila = (Array.isArray(data) ? data[0] : data) as
        | { accion: string; correo: string | null }
        | undefined;
      if (fila?.accion === "enviar" && fila.correo) {
        aEnviar.push(p);
        correo = fila.correo;
      } else if (fila?.accion === "sin_correo") {
        resultado.sinCorreo++;
      } else {
        resultado.enCurso++;
      }
    }
    if (!correo || aEnviar.length === 0) continue;

    const huellas = aEnviar.map((p) => p.huella);
    const numeros = aEnviar.map((p) => p.numero);
    const plantilla = plantillaSeguimientoPermuta({ alias: aEnviar[0].alias, items: aEnviar });
    const registro = { tipo: "seguimiento_permuta" as const, referencia: huellas.join(" ") };
    const r = await enviarEmail({
      to: correo,
      subject: plantilla.subject,
      html: plantilla.html,
      text: plantilla.text,
      idempotencyKey: claveIdempotencia(
        "seguimiento",
        usuarioId,
        aEnviar.map((p) => `${p.huella}#${p.numero}`),
        plantilla,
      ),
    });
    if (r.ok) {
      resultado.correos++;
      resultado.enviados += aEnviar.length;
      // Primero se confirma (lo que evita repetir el correo) y despues se
      // anota en el registro.
      await confirmarConReintento(
        sb,
        "seguimiento_confirmar",
        { p_destinatario: usuarioId, p_huellas: huellas, p_numeros: numeros },
        aEnviar.length,
      );
      await anotarEnvio(registro, true, null);
    } else {
      resultado.fallidos += aEnviar.length;
      await anotarEnvio(registro, false, r.error);
      const { error } = await sb.rpc("seguimiento_soltar", {
        p_destinatario: usuarioId,
        p_huellas: huellas,
        p_numeros: numeros,
      });
      if (error) console.error("[seguimiento] correo fallido sin poder soltarlo:", error.message);
    }
  }
  return resultado;
}

/**
 * Avisos por email relacionados con cadenas:
 *
 *  - `notificarCadenasNuevas`: al publicar, editar o renovar un anuncio,
 *    busca las cadenas que lo incluyen y avisa a TODAS las personas de
 *    cada cadena, tambien a quien la acaba de completar.
 *  - `revisarAvisosPendientes`: red de seguridad diaria (cron). Recalcula
 *    todas las cadenas y avisa a quien aun no tenga su aviso: correos que
 *    fallaron, cadenas que aparecen sin que nadie publique (datos
 *    reparados, cambios en el motor) o cualquier fallo puntual.
 *  - `notificarCadenaCerradaPorPermuta`: al marcar un anuncio como
 *    permutado, avisa a quienes estaban en cadenas con el.
 *
 * Cada persona recibe un solo aviso por cadena (tabla
 * `cadenas_notificadas`); si el correo falla, el registro se libera para
 * reintentarlo. Todo se hace con el cliente de servidor (service_role):
 * las funciones que devuelven emails no son accesibles con la sesion de
 * un usuario. Los avisos por evento son best-effort: un fallo se registra
 * y no rompe la accion del usuario.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectarCadenas, type AnuncioMatching, type Cadena } from "@/lib/matching";
import { enviarEmail } from "@/lib/email/resend";
import {
  plantillaCadenaNueva,
  plantillaCadenaCerradaPorOtro,
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
 *  (nunca el suyo propio). */
export function aliasDeLosDemas(
  participantes: { usuario_id: string; alias_publico: string }[],
  usuarioId: string,
): string[] {
  return Array.from(
    new Set(participantes.filter((p) => p.usuario_id !== usuarioId).map((p) => p.alias_publico)),
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
  enviados: number;
  fallidos: number;
  /** Personas sin correo utilizable (cuentas de prueba o sin confirmar). */
  sinCorreo: number;
  /** Solo en simulacion: avisos que se enviarian, como "huella|usuario". */
  pendientes: string[];
  /** Categorias que fallaron (las demas se revisaron igual). */
  gruposConError: number;
  /** Se acabo el tiempo antes de revisar todas las categorias. */
  sinTerminar: boolean;
};

/** Avisos ya registrados de estas cadenas, como "huella|usuario". Las
 *  huellas miden hasta 147 caracteres: se consultan de 20 en 20 para no
 *  pasar del tamano maximo de peticion. */
async function avisosRegistrados(sb: ClienteAdmin, huellas: string[]): Promise<Set<string>> {
  const claves = new Set<string>();
  for (const lote of trocear(Array.from(new Set(huellas)), 20)) {
    const filas = await leerTodo<{ usuario_id: string; cadena_huella: string }>((desde, hasta) =>
      sb
        .from("cadenas_notificadas")
        .select("usuario_id, cadena_huella")
        .in("cadena_huella", lote)
        .order("id")
        .range(desde, hasta),
    );
    for (const f of filas) claves.add(`${f.cadena_huella}|${f.usuario_id}`);
  }
  return claves;
}

/**
 * Envia el aviso de "permuta posible" a cada persona de cada cadena que
 * aun no lo tenga. Todas las cadenas deben ser de la misma categoria.
 */
async function avisarCadenas(
  sb: ClienteAdmin,
  universo: AnuncioDelUniverso[],
  cadenas: Cadena[],
  combo: { cuerpo_id: string; especialidad_id: string | null },
  resultado: ResultadoAvisos,
  simular = false,
): Promise<void> {
  if (cadenas.length === 0) return;
  const porId = new Map(universo.map((x) => [x.id, x]));
  const [municipios, cuerpoTexto, yaAvisados] = await Promise.all([
    cargarMunicipios(sb, universo.map((x) => x.municipio_actual_codigo)),
    textoCuerpo(sb, combo),
    avisosRegistrados(sb, cadenas.map((c) => c.huella)),
  ]);
  const nombre = (c: string) => municipios.get(c)?.nombre ?? c;

  for (const c of cadenas) {
    const participantes = c.anuncios
      .map((id) => porId.get(id))
      .filter((x): x is AnuncioDelUniverso => x !== undefined);
    if (participantes.length !== c.longitud) continue;
    resultado.cadenas++;

    for (const usuarioId of new Set(participantes.map((p) => p.usuario_id))) {
      if (yaAvisados.has(`${c.huella}|${usuarioId}`)) continue;
      if (simular) {
        resultado.pendientes.push(`${c.huella}|${usuarioId}`);
        continue;
      }

      const { data: email, error: errEmail } = await sb.rpc("aviso_cadena_tomar_email", {
        p_destinatario: usuarioId,
        p_huella: c.huella,
      });
      if (errEmail) {
        console.warn("[avisos-cadena] no se pudo registrar el aviso:", errEmail.message);
        resultado.fallidos++;
        continue;
      }
      if (typeof email !== "string" || email.length === 0) {
        // Otro proceso lo acaba de avisar, o es una cuenta sin correo util.
        resultado.sinCorreo++;
        continue;
      }

      const suPosicion = participantes.findIndex((p) => p.usuario_id === usuarioId);
      const plantilla = plantillaCadenaNueva({
        longitud: c.longitud,
        recorrido: recorridoDesde(participantes, Math.max(0, suPosicion), nombre),
        aliasOtros: aliasDeLosDemas(participantes, usuarioId),
        cuerpoTexto,
      });
      const r = await enviarEmail({
        to: email,
        subject: plantilla.subject,
        html: plantilla.html,
        text: plantilla.text,
        registro: { tipo: "cadena_nueva", referencia: c.huella },
      });
      if (r.ok) {
        resultado.enviados++;
      } else {
        resultado.fallidos++;
        // Se libera para que la revision diaria lo reintente.
        const { error: errLiberar } = await sb.rpc("aviso_cadena_liberar", {
          p_destinatario: usuarioId,
          p_huella: c.huella,
        });
        if (errLiberar) {
          console.error("[avisos-cadena] aviso fallido que no se pudo liberar:", errLiberar.message);
        }
      }
    }
  }
}

function resultadoVacio(): ResultadoAvisos {
  return {
    cadenas: 0,
    enviados: 0,
    fallidos: 0,
    sinCorreo: 0,
    pendientes: [],
    gruposConError: 0,
    sinTerminar: false,
  };
}

export async function notificarCadenasNuevas(anuncioId: string): Promise<void> {
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

    await avisarCadenas(sb, universo, detectarCadenas(universo, origen), ref, resultadoVacio());
  } catch (e) {
    console.warn("[notificarCadenasNuevas] error best-effort:", e);
  }
}

/**
 * Red de seguridad: recalcula TODAS las cadenas entre anuncios reales y
 * avisa a quien falte. Lo llama el cron diario. Lanza error si no puede
 * leer los datos (para que el cron lo marque como fallido). Con
 * `simular`, no envia nada: solo lista los avisos pendientes.
 */
export async function revisarAvisosPendientes(
  opciones: { simular?: boolean; cliente?: ClienteAdmin; limiteMs?: number } = {},
): Promise<ResultadoAvisos> {
  const sb = opciones.cliente ?? createAdminClient();
  const inicio = Date.now();
  const limiteMs = opciones.limiteMs ?? 45_000;
  const resultado = resultadoVacio();
  const activos = await aAnunciosMatching(sb, await cargarAnunciosActivos(sb));

  const grupos = new Map<string, AnuncioDelUniverso[]>();
  for (const a of activos) {
    const k = claveCombo(a);
    const g = grupos.get(k) ?? [];
    g.push(a);
    grupos.set(k, g);
  }
  // Primero las categorias pequenas (rapidas). Un fallo en una categoria
  // no impide revisar las demas; si se acaba el tiempo, lo pendiente se
  // envia en la siguiente revision.
  const ordenados = Array.from(grupos.values())
    .filter((g) => g.length >= 2)
    .sort((a, b) => a.length - b.length);
  for (const g of ordenados) {
    if (Date.now() - inicio > limiteMs) {
      resultado.sinTerminar = true;
      break;
    }
    try {
      const cadenas = detectarCadenas(g, g);
      await avisarCadenas(sb, g, cadenas, g[0], resultado, opciones.simular === true);
    } catch (e) {
      resultado.gruposConError++;
      console.warn("[avisos-cadena] error en una categoria:", e);
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
): Promise<void> {
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
        lista.push(recorrido);
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
    for (const f of (filas ?? []) as { usuario_id: string; email: string }[]) {
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
      });
    }
  } catch (e) {
    console.warn("[notificarCadenaCerradaPorPermuta] error best-effort:", e);
  }
}

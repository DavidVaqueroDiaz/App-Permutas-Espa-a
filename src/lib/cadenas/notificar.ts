/**
 * Notificación por email de cadenas nuevas detectadas a partir de
 * un anuncio que se acaba de publicar o editar.
 *
 * Flujo:
 *  1. Cargamos el anuncio + todos los anuncios compatibles
 *     (mismo sector + cuerpo + especialidad).
 *  2. Corremos el matcher con el anuncio nuevo como origen.
 *  3. Para cada cadena detectada, para cada OTRO participante:
 *     a. RPC `tomar_email_para_notificar_cadena(usuario, huella)`.
 *     b. Si devuelve un email (primera vez que se notifica esa
 *        cadena al usuario), enviamos email con la plantilla
 *        `plantillaCadenaNueva`.
 *  4. Best-effort: cualquier fallo de email se loguea, no rompe la
 *     creación/edición del anuncio.
 */
import { createClient } from "@/lib/supabase/server";
import { detectarCadenas, type AnuncioMatching } from "@/lib/matching";
import { enviarEmail } from "@/lib/email/resend";
import {
  plantillaCadenaNueva,
  plantillaCadenaCerradaPorOtro,
} from "@/lib/email/plantillas";

export async function notificarCadenasNuevas(anuncioId: string): Promise<void> {
  try {
    const supabase = await createClient();

    // 1) Datos del anuncio recién creado/editado.
    const { data: a } = await supabase
      .from("anuncios")
      .select("id, sector_codigo, cuerpo_id, especialidad_id, estado")
      .eq("id", anuncioId)
      .maybeSingle();
    if (!a || (a as { estado: string }).estado !== "activo") return;
    const anuncioRef = a as {
      id: string;
      sector_codigo: string;
      cuerpo_id: string;
      especialidad_id: string | null;
      estado: string;
    };

    // 2) Universo compatible.
    let q = supabase
      .from("anuncios")
      .select(
        "id, usuario_id, sector_codigo, cuerpo_id, especialidad_id, municipio_actual_codigo, ccaa_codigo, servicio_salud_codigo, fecha_toma_posesion_definitiva, anyos_servicio_totales, permuta_anterior_fecha",
      )
      .eq("estado", "activo")
      .eq("sector_codigo", anuncioRef.sector_codigo)
      .eq("cuerpo_id", anuncioRef.cuerpo_id);
    if (anuncioRef.especialidad_id) q = q.eq("especialidad_id", anuncioRef.especialidad_id);
    else q = q.is("especialidad_id", null);
    const { data: compatRaw } = await q;
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
    const compatibles = (compatRaw ?? []) as AnuncioRaw[];
    if (compatibles.length < 2) return; // sin compañía, sin cadenas

    // 3) Datos auxiliares (plazas + perfiles + nombres muni + cuerpo).
    const ids = compatibles.map((x) => x.id);
    const usuariosUnicos = Array.from(new Set(compatibles.map((x) => x.usuario_id)));
    const muniCodigos = Array.from(new Set(compatibles.map((x) => x.municipio_actual_codigo)));

    const [plazasRes, perfilesRes, muniRes, cuerpoRes, espRes] = await Promise.all([
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
        .select("codigo_ine, nombre")
        .in("codigo_ine", muniCodigos),
      supabase
        .from("cuerpos")
        .select("codigo_oficial, denominacion")
        .eq("id", anuncioRef.cuerpo_id)
        .maybeSingle(),
      anuncioRef.especialidad_id
        ? supabase
            .from("especialidades")
            .select("codigo_oficial, denominacion")
            .eq("id", anuncioRef.especialidad_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const plazasPorAnuncio = new Map<string, Set<string>>();
    for (const p of plazasRes.data ?? []) {
      const k = (p as { anuncio_id: string }).anuncio_id;
      const c = (p as { municipio_codigo: string }).municipio_codigo;
      const s = plazasPorAnuncio.get(k) ?? new Set<string>();
      s.add(c);
      plazasPorAnuncio.set(k, s);
    }

    type PerfilLite = { alias_publico: string; ano_nacimiento: number };
    const perfilesPorId = new Map<string, PerfilLite>();
    for (const p of perfilesRes.data ?? []) {
      perfilesPorId.set((p as { id: string }).id, {
        alias_publico: (p as { alias_publico: string }).alias_publico,
        ano_nacimiento: (p as { ano_nacimiento: number }).ano_nacimiento,
      });
    }

    const muniPorCodigo = new Map<string, string>();
    for (const m of muniRes.data ?? []) {
      muniPorCodigo.set(
        (m as { codigo_ine: string }).codigo_ine,
        (m as { nombre: string }).nombre,
      );
    }

    const cuerpo = cuerpoRes.data as
      | { codigo_oficial: string | null; denominacion: string }
      | null;
    const esp = espRes.data as
      | { codigo_oficial: string | null; denominacion: string }
      | null;
    const cuerpoTexto = cuerpo
      ? `${cuerpo.codigo_oficial ? cuerpo.codigo_oficial + " — " : ""}${cuerpo.denominacion}` +
        (esp ? ` (${esp.denominacion})` : "")
      : "—";

    // 4) Matcher.
    const matching: AnuncioMatching[] = compatibles
      .map((x) => {
        const perfil = perfilesPorId.get(x.usuario_id);
        if (!perfil) return null;
        return {
          id: x.id,
          usuario_id: x.usuario_id,
          sector_codigo: x.sector_codigo,
          cuerpo_id: x.cuerpo_id,
          especialidad_id: x.especialidad_id,
          municipio_actual_codigo: x.municipio_actual_codigo,
          ccaa_codigo: x.ccaa_codigo,
          servicio_salud_codigo: x.servicio_salud_codigo,
          fecha_toma_posesion_definitiva: x.fecha_toma_posesion_definitiva,
          anyos_servicio_totales: x.anyos_servicio_totales,
          permuta_anterior_fecha: x.permuta_anterior_fecha,
          ano_nacimiento: perfil.ano_nacimiento,
          alias_publico: perfil.alias_publico,
          plazas_deseadas: plazasPorAnuncio.get(x.id) ?? new Set(),
        } satisfies AnuncioMatching;
      })
      .filter((x): x is AnuncioMatching => x !== null);

    const origen = matching.filter((x) => x.id === anuncioId);
    if (origen.length === 0) return;

    const cadenas = detectarCadenas(matching, origen);
    if (cadenas.length === 0) return;

    // 5) Notificación a cada OTRO participante por cada cadena.
    const usuarioOrigen = origen[0].usuario_id;
    for (const c of cadenas) {
      const participantes = c.anuncios
        .map((id) => matching.find((m) => m.id === id))
        .filter((x): x is AnuncioMatching => x !== undefined);
      if (participantes.length !== c.longitud) continue;

      const recorrido = [
        ...participantes.map((p) => muniPorCodigo.get(p.municipio_actual_codigo) ?? p.municipio_actual_codigo),
        muniPorCodigo.get(participantes[0].municipio_actual_codigo) ?? participantes[0].municipio_actual_codigo,
      ];

      const otros = participantes.filter((p) => p.usuario_id !== usuarioOrigen);
      const usuariosOtros = Array.from(new Set(otros.map((p) => p.usuario_id)));
      const aliasOtros = Array.from(new Set(otros.map((p) => p.alias_publico)));

      for (const otroUsuarioId of usuariosOtros) {
        const { data: emailDestino } = await supabase.rpc(
          "tomar_email_para_notificar_cadena",
          { destinatario: otroUsuarioId, cadena_huella: c.huella },
        );
        if (!emailDestino || typeof emailDestino !== "string") continue;

        const plantilla = plantillaCadenaNueva({
          longitud: c.longitud,
          recorrido,
          aliasOtros,
          cuerpoTexto,
        });
        await enviarEmail({
          to: emailDestino,
          subject: plantilla.subject,
          html: plantilla.html,
          text: plantilla.text,
        });
      }
    }
  } catch (e) {
    console.warn("[notificarCadenasNuevas] error best-effort:", e);
  }
}

// ===========================================================================
// Notificacion: el dueno de un anuncio acaba de marcarlo como permutado.
// Avisamos a los otros participantes de cadenas en las que estaba para
// que no se queden esperando una respuesta que nunca llegara.
// ===========================================================================

/**
 * Manda un email a cada OTRO participante de cadenas que incluian este
 * anuncio, avisando de que ya no son viables. Best-effort: si falla,
 * no rompe la accion de marcar como permutado.
 *
 * Nota: este flujo NO usa la deduplicacion de `cadenas_notificadas`
 * (RPC `tomar_email_para_notificar_cadena`) porque ese mecanismo esta
 * pensado para "cadena nueva detectada" (no queremos repetir el mismo
 * aviso). Aqui es un evento puntual de cierre, asi que enviamos
 * directamente. Si el matcher detectara la misma combinacion mas
 * tarde -- por ejemplo, otro anuncio similar -- generaria una cadena
 * nueva con huella distinta, asi que no hay riesgo de spam.
 */
export async function notificarCadenaCerradaPorPermuta(
  anuncioId: string,
): Promise<void> {
  try {
    const supabase = await createClient();

    // 1) Datos del anuncio que se acaba de cerrar.
    const { data: a } = await supabase
      .from("anuncios")
      .select(
        "id, usuario_id, sector_codigo, cuerpo_id, especialidad_id, municipio_actual_codigo, ccaa_codigo, servicio_salud_codigo, fecha_toma_posesion_definitiva, anyos_servicio_totales, permuta_anterior_fecha, estado",
      )
      .eq("id", anuncioId)
      .maybeSingle();
    if (!a) return;
    type AnuncioCerrado = {
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
      estado: string;
    };
    const cerrado = a as AnuncioCerrado;
    if (cerrado.estado !== "permutado") return;

    // 2) Universo de otros anuncios *activos* compatibles.
    let q = supabase
      .from("anuncios")
      .select(
        "id, usuario_id, sector_codigo, cuerpo_id, especialidad_id, municipio_actual_codigo, ccaa_codigo, servicio_salud_codigo, fecha_toma_posesion_definitiva, anyos_servicio_totales, permuta_anterior_fecha",
      )
      .eq("estado", "activo")
      .eq("sector_codigo", cerrado.sector_codigo)
      .eq("cuerpo_id", cerrado.cuerpo_id)
      .neq("id", cerrado.id);
    if (cerrado.especialidad_id) q = q.eq("especialidad_id", cerrado.especialidad_id);
    else q = q.is("especialidad_id", null);
    const { data: compatRaw } = await q;
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
    const otrosActivos = (compatRaw ?? []) as AnuncioRaw[];
    if (otrosActivos.length === 0) return; // sin nadie con quien hubiera cadena

    // 3) Datos auxiliares: plazas, perfiles, nombres de muni, cuerpo.
    const idsConCerrado = [cerrado.id, ...otrosActivos.map((x) => x.id)];
    const usuariosUnicos = Array.from(
      new Set([cerrado.usuario_id, ...otrosActivos.map((x) => x.usuario_id)]),
    );
    const muniCodigos = Array.from(
      new Set([
        cerrado.municipio_actual_codigo,
        ...otrosActivos.map((x) => x.municipio_actual_codigo),
      ]),
    );

    const [plazasRes, perfilesRes, muniRes, cuerpoRes, espRes] =
      await Promise.all([
        supabase
          .from("anuncio_plazas_deseadas")
          .select("anuncio_id, municipio_codigo")
          .in("anuncio_id", idsConCerrado),
        supabase
          .from("perfiles_publicos")
          .select("id, alias_publico, ano_nacimiento")
          .in("id", usuariosUnicos),
        supabase
          .from("municipios")
          .select("codigo_ine, nombre")
          .in("codigo_ine", muniCodigos),
        supabase
          .from("cuerpos")
          .select("codigo_oficial, denominacion")
          .eq("id", cerrado.cuerpo_id)
          .maybeSingle(),
        cerrado.especialidad_id
          ? supabase
              .from("especialidades")
              .select("codigo_oficial, denominacion")
              .eq("id", cerrado.especialidad_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    const plazasPorAnuncio = new Map<string, Set<string>>();
    for (const p of plazasRes.data ?? []) {
      const k = (p as { anuncio_id: string }).anuncio_id;
      const c = (p as { municipio_codigo: string }).municipio_codigo;
      const s = plazasPorAnuncio.get(k) ?? new Set<string>();
      s.add(c);
      plazasPorAnuncio.set(k, s);
    }

    type PerfilLite = { alias_publico: string; ano_nacimiento: number };
    const perfilesPorId = new Map<string, PerfilLite>();
    for (const p of perfilesRes.data ?? []) {
      perfilesPorId.set((p as { id: string }).id, {
        alias_publico: (p as { alias_publico: string }).alias_publico,
        ano_nacimiento: (p as { ano_nacimiento: number }).ano_nacimiento,
      });
    }

    const muniPorCodigo = new Map<string, string>();
    for (const m of muniRes.data ?? []) {
      muniPorCodigo.set(
        (m as { codigo_ine: string }).codigo_ine,
        (m as { nombre: string }).nombre,
      );
    }

    const cuerpo = cuerpoRes.data as
      | { codigo_oficial: string | null; denominacion: string }
      | null;
    const esp = espRes.data as
      | { codigo_oficial: string | null; denominacion: string }
      | null;
    const cuerpoTexto = cuerpo
      ? `${cuerpo.codigo_oficial ? cuerpo.codigo_oficial + " — " : ""}${cuerpo.denominacion}` +
        (esp ? ` (${esp.denominacion})` : "")
      : "—";

    // 4) Construir el universo de matching INCLUYENDO el anuncio cerrado
    //    (lo metemos como si estuviera activo, para revivir las cadenas
    //    que existian antes del cierre).
    function aMatching(x: AnuncioRaw | AnuncioCerrado): AnuncioMatching | null {
      const perfil = perfilesPorId.get(x.usuario_id);
      if (!perfil) return null;
      return {
        id: x.id,
        usuario_id: x.usuario_id,
        sector_codigo: x.sector_codigo,
        cuerpo_id: x.cuerpo_id,
        especialidad_id: x.especialidad_id,
        municipio_actual_codigo: x.municipio_actual_codigo,
        ccaa_codigo: x.ccaa_codigo,
        servicio_salud_codigo: x.servicio_salud_codigo,
        fecha_toma_posesion_definitiva: x.fecha_toma_posesion_definitiva,
        anyos_servicio_totales: x.anyos_servicio_totales,
        permuta_anterior_fecha: x.permuta_anterior_fecha,
        ano_nacimiento: perfil.ano_nacimiento,
        alias_publico: perfil.alias_publico,
        plazas_deseadas: plazasPorAnuncio.get(x.id) ?? new Set(),
      };
    }
    const matchingConCerrado: AnuncioMatching[] = [
      ...otrosActivos.map(aMatching),
      aMatching(cerrado),
    ].filter((x): x is AnuncioMatching => x !== null);

    const origen = matchingConCerrado.filter((x) => x.id === cerrado.id);
    if (origen.length === 0) return;
    const cadenasAfectadas = detectarCadenas(matchingConCerrado, origen);
    if (cadenasAfectadas.length === 0) return;

    // 5) Para `cadenasRestantes` necesitamos saber cuantas cadenas siguen
    //    abiertas SIN el anuncio cerrado, agrupadas por usuario.
    const matchingSinCerrado = matchingConCerrado.filter(
      (x) => x.id !== cerrado.id,
    );
    const cadenasRestantesGlobal =
      matchingSinCerrado.length >= 2
        ? detectarCadenas(matchingSinCerrado, matchingSinCerrado)
        : [];
    const cadenasRestantesPorUsuario = new Map<string, number>();
    for (const c of cadenasRestantesGlobal) {
      const usuariosEnCadena = new Set(
        c.anuncios
          .map((id) => matchingSinCerrado.find((m) => m.id === id))
          .filter((x): x is AnuncioMatching => x !== undefined)
          .map((m) => m.usuario_id),
      );
      for (const u of usuariosEnCadena) {
        cadenasRestantesPorUsuario.set(
          u,
          (cadenasRestantesPorUsuario.get(u) ?? 0) + 1,
        );
      }
    }

    // 6) Agrupar cadenas afectadas por OTRO usuario participante.
    type AfectadaPorUsuario = {
      recorridos: string[];
    };
    const afectadasPorUsuario = new Map<string, AfectadaPorUsuario>();
    const aliasCerrado =
      perfilesPorId.get(cerrado.usuario_id)?.alias_publico ?? "Otra persona";

    for (const c of cadenasAfectadas) {
      const participantes = c.anuncios
        .map((id) => matchingConCerrado.find((m) => m.id === id))
        .filter((x): x is AnuncioMatching => x !== undefined);
      if (participantes.length !== c.longitud) continue;

      const recorrido = [
        ...participantes.map(
          (p) =>
            muniPorCodigo.get(p.municipio_actual_codigo) ??
            p.municipio_actual_codigo,
        ),
        muniPorCodigo.get(participantes[0].municipio_actual_codigo) ??
          participantes[0].municipio_actual_codigo,
      ].join(" → ");

      const usuariosEnCadena = new Set(participantes.map((p) => p.usuario_id));
      for (const u of usuariosEnCadena) {
        if (u === cerrado.usuario_id) continue;
        const acc = afectadasPorUsuario.get(u) ?? { recorridos: [] };
        acc.recorridos.push(recorrido);
        afectadasPorUsuario.set(u, acc);
      }
    }
    if (afectadasPorUsuario.size === 0) return;

    // 7) Para cada otro usuario afectado, leer su email via RPC
    //    (security definer que valida que somos los duenos del anuncio).
    const afectadosIds = Array.from(afectadasPorUsuario.keys());
    const { data: emailsRows, error: errEmails } = await supabase.rpc(
      "emails_otros_participantes_post_cierre",
      {
        anuncio_origen_id: cerrado.id,
        destinatarios: afectadosIds,
      },
    );
    if (errEmails) {
      console.warn("[notificarCadenaCerradaPorPermuta] RPC error:", errEmails);
      return;
    }
    const emailPorUsuario = new Map<string, string>();
    for (const r of (emailsRows as { usuario_id: string; email: string }[]) ?? []) {
      if (r.usuario_id && r.email) emailPorUsuario.set(r.usuario_id, r.email);
    }

    for (const [usuarioId, info] of afectadasPorUsuario.entries()) {
      const email = emailPorUsuario.get(usuarioId);
      if (!email) continue;
      const plantilla = plantillaCadenaCerradaPorOtro({
        aliasQueCerro: aliasCerrado,
        recorridosAfectados: info.recorridos,
        cuerpoTexto,
        cadenasRestantes: cadenasRestantesPorUsuario.get(usuarioId) ?? 0,
      });
      await enviarEmail({
        to: email,
        subject: plantilla.subject,
        html: plantilla.html,
        text: plantilla.text,
      });
    }
  } catch (e) {
    console.warn("[notificarCadenaCerradaPorPermuta] error best-effort:", e);
  }
}

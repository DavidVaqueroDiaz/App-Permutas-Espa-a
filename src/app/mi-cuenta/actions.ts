"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  detectarCadenas,
  type AnuncioMatching,
  type Cadena,
} from "@/lib/matching";

const ALIAS_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;
const AÑO_ACTUAL = new Date().getFullYear();
const AÑO_MIN = 1940;
const AÑO_MAX = AÑO_ACTUAL - 18;

export type ActionState = {
  ok: boolean;
  message: string;
} | null;

export async function actualizarPerfil(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const alias = String(formData.get("alias_publico") ?? "").trim();
  const anoStr = String(formData.get("ano_nacimiento") ?? "").trim();

  if (!ALIAS_REGEX.test(alias)) {
    return {
      ok: false,
      message: "El alias debe tener entre 3 y 20 caracteres (letras, números, guiones).",
    };
  }
  const ano = Number.parseInt(anoStr, 10);
  if (Number.isNaN(ano) || ano < AÑO_MIN || ano > AÑO_MAX) {
    return {
      ok: false,
      message: `El año de nacimiento debe estar entre ${AÑO_MIN} y ${AÑO_MAX}.`,
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "No tienes sesión activa. Vuelve a iniciar sesión." };
  }

  const { error } = await supabase
    .from("perfiles_usuario")
    .update({ alias_publico: alias, ano_nacimiento: ano })
    .eq("id", user.id);

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { ok: false, message: "Ese alias ya está cogido. Prueba otro." };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/mi-cuenta");
  return { ok: true, message: "Perfil actualizado." };
}

export type ConteoCadenas = {
  total: number;
  porAnuncio: Record<string, number>;
  porLongitud: { directas: number; tres: number; cuatro: number };
};

/**
 * Calcula cuántas cadenas (longitud 2, 3, 4) incluyen alguno de los
 * anuncios del usuario. Se ejecuta on-demand al cargar /mi-cuenta.
 *
 * Estrategia: para cada combo (sector, cuerpo, especialidad) que
 * tienen los anuncios del usuario, cargamos todos los anuncios
 * compatibles y corremos el matcher. Es caro (O(n²) en el peor caso
 * dentro del combo) pero el dataset actual es pequeño (cientos por
 * combo). Si crece, lo convertimos en job nocturno con caché.
 */
export async function contarCadenasParaMisAnuncios(): Promise<ConteoCadenas> {
  const empty: ConteoCadenas = {
    total: 0,
    porAnuncio: {},
    porLongitud: { directas: 0, tres: 0, cuatro: 0 },
  };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data: misAnunciosRaw } = await supabase
    .from("anuncios")
    .select("id, sector_codigo, cuerpo_id, especialidad_id")
    .eq("usuario_id", user.id)
    .eq("estado", "activo");
  type MiAnuncio = {
    id: string;
    sector_codigo: string;
    cuerpo_id: string;
    especialidad_id: string | null;
  };
  const misAnuncios = (misAnunciosRaw ?? []) as MiAnuncio[];
  if (misAnuncios.length === 0) return empty;

  // Combos únicos. Cada combo genera una llamada al matcher sobre el
  // universo de anuncios compatibles.
  const combos = new Map<string, MiAnuncio>();
  for (const a of misAnuncios) {
    const k = `${a.sector_codigo}|${a.cuerpo_id}|${a.especialidad_id ?? ""}`;
    if (!combos.has(k)) combos.set(k, a);
  }

  const conteo: ConteoCadenas = {
    total: 0,
    porAnuncio: {},
    porLongitud: { directas: 0, tres: 0, cuatro: 0 },
  };
  const idsMios = new Set(misAnuncios.map((a) => a.id));

  for (const combo of combos.values()) {
    let q = supabase
      .from("anuncios")
      .select(
        "id, usuario_id, sector_codigo, cuerpo_id, especialidad_id, municipio_actual_codigo, ccaa_codigo, servicio_salud_codigo, fecha_toma_posesion_definitiva, anyos_servicio_totales, permuta_anterior_fecha",
      )
      .eq("estado", "activo")
      .eq("sector_codigo", combo.sector_codigo)
      .eq("cuerpo_id", combo.cuerpo_id);
    if (combo.especialidad_id) q = q.eq("especialidad_id", combo.especialidad_id);
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
    const anunciosCompat = (compatRaw ?? []) as AnuncioRaw[];
    if (anunciosCompat.length < 2) continue;

    const ids = anunciosCompat.map((a) => a.id);
    const usuariosUnicos = Array.from(new Set(anunciosCompat.map((a) => a.usuario_id)));

    // Paginamos plazas para evitar truncamiento por el limite de 1000
    // filas de PostgREST. Una CCAA entera = ~700-2200 plazas; con
    // varios anuncios facilmente pasamos 1000.
    async function cargarTodasPlazas() {
      const PAGE = 1000;
      let offset = 0;
      const todas: { anuncio_id: string; municipio_codigo: string }[] = [];
      while (true) {
        const { data } = await supabase
          .from("anuncio_plazas_deseadas")
          .select("anuncio_id, municipio_codigo")
          .in("anuncio_id", ids)
          .range(offset, offset + PAGE - 1);
        if (!data || data.length === 0) break;
        todas.push(...(data as { anuncio_id: string; municipio_codigo: string }[]));
        if (data.length < PAGE) break;
        offset += PAGE;
        if (offset > 100_000) break;
      }
      return todas;
    }

    const [plazasData, perfilesRes] = await Promise.all([
      cargarTodasPlazas(),
      supabase
        .from("perfiles_publicos")
        .select("id, alias_publico, ano_nacimiento")
        .in("id", usuariosUnicos),
    ]);
    const plazasRes = { data: plazasData };

    const plazasPorAnuncio = new Map<string, Set<string>>();
    for (const p of plazasRes.data ?? []) {
      const k = (p as { anuncio_id: string }).anuncio_id;
      const c = (p as { municipio_codigo: string }).municipio_codigo;
      const s = plazasPorAnuncio.get(k) ?? new Set<string>();
      s.add(c);
      plazasPorAnuncio.set(k, s);
    }

    const perfilesPorId = new Map<string, { alias_publico: string; ano_nacimiento: number }>();
    for (const p of perfilesRes.data ?? []) {
      perfilesPorId.set((p as { id: string }).id, {
        alias_publico: (p as { alias_publico: string }).alias_publico,
        ano_nacimiento: (p as { ano_nacimiento: number }).ano_nacimiento,
      });
    }

    const todosMatching: AnuncioMatching[] = anunciosCompat
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

    const miosMatching = todosMatching.filter((a) => idsMios.has(a.id));
    if (miosMatching.length === 0) continue;

    const cadenas: Cadena[] = detectarCadenas(todosMatching, miosMatching);
    for (const c of cadenas) {
      conteo.total++;
      if (c.longitud === 2) conteo.porLongitud.directas++;
      else if (c.longitud === 3) conteo.porLongitud.tres++;
      else conteo.porLongitud.cuatro++;
      for (const aid of c.anuncios) {
        if (idsMios.has(aid)) {
          conteo.porAnuncio[aid] = (conteo.porAnuncio[aid] ?? 0) + 1;
        }
      }
    }
  }

  return conteo;
}

export async function cambiarContrasena(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");

  if (password.length < 8) {
    return { ok: false, message: "La contraseña debe tener al menos 8 caracteres." };
  }
  if (password !== password2) {
    return { ok: false, message: "Las dos contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, message: "Contraseña actualizada." };
}

/**
 * Sintetizador de demos para garantizar cadenas en modo demo.
 *
 * Cuando el visitante busca con el modo demo activado y la primera
 * pasada de matching no encuentra alguna de las 3 cadenas tipo
 * (directa, a 3, a 4) con su perfil, este modulo crea anuncios demo
 * sinteticos en la BD que completan esas cadenas. La logica:
 *
 *   - Directa A↔B: A es el usuario virtual; B se crea en uno de los
 *     destinos del usuario, con la plaza del usuario en sus deseadas.
 *   - 3-cadena A→B→C→A: B en destino del usuario quiere ir a M_C;
 *     C en M_C quiere ir a la plaza del usuario.
 *   - 4-cadena A→B→C→D→A: similar con un eslabon mas.
 *
 * Los demos sinteticos:
 *   - Llevan alias `demosyn_XXXXXXXXXXXX` (asi un cron diario los
 *     puede limpiar sin tocar los demos base `demo_*`).
 *   - Se persisten via la RPC `crear_demo_sintetico` (SECURITY DEFINER).
 *   - Aparecen como anuncios normales en BD: el matcher los encuentra,
 *     el chat funciona contra ellos, y el trigger SQL responde con el
 *     mensaje del sistema cuando el usuario los contacte.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnuncioMatching } from "@/lib/matching";

// Conjunto de municipios "filler" (capitales de provincia) que usaremos
// como eslabones intermedios en cadenas de 3 y 4. Codigos INE de 5
// digitos. Si el usuario tiene su plaza o destinos en alguno, lo
// saltamos y cogemos el siguiente.
const FILLERS_NACIONAL: { codigo: string; ccaa: string }[] = [
  { codigo: "28079", ccaa: "13" }, // Madrid
  { codigo: "08019", ccaa: "09" }, // Barcelona
  { codigo: "41091", ccaa: "01" }, // Sevilla
  { codigo: "46250", ccaa: "10" }, // Valencia
  { codigo: "50297", ccaa: "02" }, // Zaragoza
  { codigo: "29067", ccaa: "01" }, // Malaga
  { codigo: "48020", ccaa: "16" }, // Bilbao
  { codigo: "30030", ccaa: "14" }, // Murcia
  { codigo: "33044", ccaa: "03" }, // Oviedo
  { codigo: "39075", ccaa: "06" }, // Santander
  { codigo: "47186", ccaa: "07" }, // Valladolid
  { codigo: "07040", ccaa: "04" }, // Palma
  { codigo: "06015", ccaa: "11" }, // Badajoz
  { codigo: "26089", ccaa: "17" }, // Logrono
  { codigo: "31201", ccaa: "15" }, // Pamplona
  { codigo: "35016", ccaa: "05" }, // Las Palmas
  { codigo: "45168", ccaa: "08" }, // Toledo
  { codigo: "15030", ccaa: "12" }, // A Coruna
];

// Sectores que solo permiten permuta intra-CCAA. Para estos, los
// fillers y destinos deben estar en la misma CCAA del usuario.
const SECTORES_INTRA_CCAA = new Set([
  "sanitario_sns",
  "funcionario_ccaa",
  "policia_local",
]);

type Necesarias = { directa: boolean; tres: boolean; cuatro: boolean };

type Resultado = {
  /** AnuncioMatching nuevos (ya persistidos en BD) que completan
   *  las cadenas faltantes. */
  nuevos: AnuncioMatching[];
};

/**
 * Sintetiza y persiste los anuncios demo necesarios para completar
 * las cadenas tipo que aun no aparecen para el perfil virtual del
 * usuario.
 */
export async function sintetizarYpersistirDemos(
  supabase: SupabaseClient,
  virtual: AnuncioMatching,
  necesarias: Necesarias,
): Promise<Resultado> {
  const sector = virtual.sector_codigo;
  const intra = SECTORES_INTRA_CCAA.has(sector);

  // El usuario debe tener al menos un destino para que tenga sentido
  // sintetizar.
  const destinos = [...virtual.plazas_deseadas];
  if (destinos.length === 0) return { nuevos: [] };

  // Para sectores intra-CCAA, los fillers deben estar en la misma CCAA
  // que el usuario. Si no hay fillers de esa CCAA disponibles, no
  // podemos sintetizar 3-cadena ni 4-cadena con esa restriccion. La
  // directa siempre funciona porque solo necesita un destino que ya
  // existe (el del usuario).
  const fillersCandidatos = intra
    ? FILLERS_NACIONAL.filter((f) => f.ccaa === virtual.ccaa_codigo)
    : FILLERS_NACIONAL;

  // Quitamos del candidato cualquier filler que coincida con la plaza
  // del usuario, sus destinos, o ya entre los nuevos.
  const usados = new Set<string>([
    virtual.municipio_actual_codigo,
    ...destinos,
  ]);
  const fillers = fillersCandidatos
    .map((f) => f.codigo)
    .filter((c) => !usados.has(c));

  const miMunicipio = virtual.municipio_actual_codigo;
  const miDestino = destinos[0];

  const nuevos: AnuncioMatching[] = [];

  // --- DIRECTA: B en miDestino quiere miMunicipio ---
  if (necesarias.directa) {
    const id = await crearDemo(supabase, virtual, miDestino, [miMunicipio]);
    if (id) nuevos.push(buildMatching(id, virtual, miDestino, [miMunicipio]));
  }

  // --- 3-CADENA: B en miDestino quiere M_C; C en M_C quiere miMunicipio ---
  if (necesarias.tres && fillers.length >= 1) {
    const mc = fillers[0];
    const idB = await crearDemo(supabase, virtual, miDestino, [mc]);
    const idC = await crearDemo(supabase, virtual, mc, [miMunicipio]);
    if (idB && idC) {
      nuevos.push(buildMatching(idB, virtual, miDestino, [mc]));
      nuevos.push(buildMatching(idC, virtual, mc, [miMunicipio]));
      usados.add(mc);
    }
  }

  // --- 4-CADENA: B (miDestino) → M_C → M_D → miMunicipio ---
  if (necesarias.cuatro) {
    const fillersDisponibles = fillers.filter((f) => !usados.has(f));
    if (fillersDisponibles.length >= 2) {
      const mc = fillersDisponibles[0];
      const md = fillersDisponibles[1];
      const idB = await crearDemo(supabase, virtual, miDestino, [mc]);
      const idC = await crearDemo(supabase, virtual, mc, [md]);
      const idD = await crearDemo(supabase, virtual, md, [miMunicipio]);
      if (idB && idC && idD) {
        nuevos.push(buildMatching(idB, virtual, miDestino, [mc]));
        nuevos.push(buildMatching(idC, virtual, mc, [md]));
        nuevos.push(buildMatching(idD, virtual, md, [miMunicipio]));
      }
    }
  }

  return { nuevos };
}

/**
 * Llama a la RPC SECURITY DEFINER que crea el demo en BD. Devuelve
 * el anuncio_id, o null si fallo.
 */
async function crearDemo(
  supabase: SupabaseClient,
  virtual: AnuncioMatching,
  municipioActual: string,
  municipiosDeseados: string[],
): Promise<string | null> {
  const ccaa = await resolveCcaaPorMunicipio(supabase, municipioActual)
    ?? virtual.ccaa_codigo;
  const { data, error } = await supabase.rpc("crear_demo_sintetico", {
    p_sector_codigo: virtual.sector_codigo,
    p_cuerpo_id: virtual.cuerpo_id,
    p_especialidad_id: virtual.especialidad_id,
    p_servicio_salud_codigo: virtual.servicio_salud_codigo,
    p_ccaa_codigo: ccaa,
    p_municipio_actual_codigo: municipioActual,
    p_municipios_deseados: municipiosDeseados,
    p_anyos_servicio: Math.max(2, virtual.anyos_servicio_totales - 1),
    p_ano_toma_posesion: 2020,
  });
  if (error) {
    console.warn("[sintetizar-demo] RPC fallo:", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}

/**
 * Mapeo rapido CCAA por municipio (in-memory por ejecucion). Lo usamos
 * para los fillers, donde los conocemos a priori.
 */
const CCAA_POR_MUNICIPIO_FILLER = new Map<string, string>(
  FILLERS_NACIONAL.map((f) => [f.codigo, f.ccaa]),
);

async function resolveCcaaPorMunicipio(
  supabase: SupabaseClient,
  codigo: string,
): Promise<string | null> {
  const cache = CCAA_POR_MUNICIPIO_FILLER.get(codigo);
  if (cache) return cache;
  const { data } = await supabase
    .from("municipios")
    .select("provincias!inner(ccaa_codigo)")
    .eq("codigo_ine", codigo)
    .maybeSingle();
  if (!data) return null;
  type Row = { provincias: { ccaa_codigo: string } | { ccaa_codigo: string }[] };
  const provs = (data as Row).provincias;
  const p = Array.isArray(provs) ? provs[0] : provs;
  return p?.ccaa_codigo ?? null;
}

/**
 * Construye un AnuncioMatching en memoria para el demo recien
 * persistido. Asi se incorpora al pool sin necesidad de re-fetch.
 */
function buildMatching(
  id: string,
  virtual: AnuncioMatching,
  municipioActual: string,
  plazasDeseadas: string[],
): AnuncioMatching {
  return {
    id,
    usuario_id: `demo-syn-user-${id}`, // placeholder; el usuario_id real esta en BD
    sector_codigo: virtual.sector_codigo,
    cuerpo_id: virtual.cuerpo_id,
    especialidad_id: virtual.especialidad_id,
    municipio_actual_codigo: municipioActual,
    ccaa_codigo: CCAA_POR_MUNICIPIO_FILLER.get(municipioActual) ?? virtual.ccaa_codigo,
    servicio_salud_codigo: virtual.servicio_salud_codigo,
    fecha_toma_posesion_definitiva: "2020-01-01",
    anyos_servicio_totales: Math.max(2, virtual.anyos_servicio_totales - 1),
    permuta_anterior_fecha: null,
    ano_nacimiento: 1985,
    alias_publico: `Demo · ${virtual.sector_codigo}`,
    plazas_deseadas: new Set(plazasDeseadas),
  };
}

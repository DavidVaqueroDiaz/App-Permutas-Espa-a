/**
 * Lógica de detección de cadenas de permuta.
 *
 * Una "cadena" es un ciclo dirigido en el grafo de anuncios donde cada
 * anuncio acepta irse a la plaza actual del siguiente del ciclo y se
 * cumplen TODAS las reglas legales aplicables al sector.
 *
 * Longitudes admitidas: 2 (permuta directa), 3 y 4. No buscamos más.
 *
 * Las reglas se han extraído de los documentos TAREA_2 y TAREA_3 del
 * proyecto. En esta primera versión solo docencia LOE está totalmente
 * cubierta; los demás sectores se implementan con reglas conservadoras
 * (más restrictivas) y se irán refinando.
 */

export type AnuncioMatching = {
  id: string;
  usuario_id: string;
  sector_codigo: string;
  cuerpo_id: string;
  especialidad_id: string | null;
  municipio_actual_codigo: string;
  ccaa_codigo: string;
  servicio_salud_codigo: string | null;
  fecha_toma_posesion_definitiva: string; // YYYY-MM-DD
  anyos_servicio_totales: number;
  permuta_anterior_fecha: string | null;
  ano_nacimiento: number;
  alias_publico: string;
  plazas_deseadas: Set<string>;
};

export type Cadena = {
  longitud: 2 | 3 | 4;
  anuncios: string[]; // IDs en orden de ciclo (cada uno acepta plaza del siguiente)
  huella: string;
  score: number;
};

// Edad de jubilación forzosa por defecto (si la cohorte fuese del Régimen
// General LSGGS la edad podría ser 67; usamos 65 como referencia legal
// del régimen de Clases Pasivas que aún cubre a la mayoría de docentes).
const EDAD_JUBILACION = 65;
const ANIOS_HASTA_JUBILACION_MIN = 10;
const DIFERENCIA_MAX_ANTIGUEDAD = 5;
const CARENCIA_PERMUTA_ANIOS = 10;

/**
 * Reglas geográficas por sector. Devuelven true si A y B son
 * geográficamente compatibles para permutar.
 */
const REGLAS_GEO: Record<
  string,
  (a: AnuncioMatching, b: AnuncioMatching) => boolean
> = {
  // Docencia LOE: nacional, sin límite (puede permutar entre cualquier CCAA).
  docente_loe: () => true,
  // AGE: nacional, sin límite.
  funcionario_age: () => true,
  // Habilitados nacionales: intermunicipal e inter-CCAA.
  habilitado_nacional: () => true,
  // Administración local: intermunicipal sin límite, también entre CCAA.
  funcionario_local: () => true,
  // CCAA: solo intra-CCAA.
  funcionario_ccaa: (a, b) => a.ccaa_codigo === b.ccaa_codigo,
  // Sanidad: solo intra-Servicio de Salud.
  sanitario_sns: (a, b) =>
    !!a.servicio_salud_codigo &&
    a.servicio_salud_codigo === b.servicio_salud_codigo,
  // Policía Local: solo intra-CCAA, y solo en CCAA con regulación expresa.
  policia_local: (a, b) =>
    a.ccaa_codigo === b.ccaa_codigo &&
    new Set(["01", "02", "04", "10", "12"]).has(a.ccaa_codigo),
};

/**
 * ¿El anuncio A acepta irse a la plaza de B y se cumplen las reglas legales?
 * Esto es la existencia de la arista A→B en el grafo dirigido.
 */
export function aceptaPlazaDe(
  a: AnuncioMatching,
  b: AnuncioMatching,
): boolean {
  if (a.id === b.id) return false;
  if (a.usuario_id === b.usuario_id) return false;
  if (a.municipio_actual_codigo === b.municipio_actual_codigo) return false;

  // A debe haber declarado el municipio de B como deseado.
  if (!a.plazas_deseadas.has(b.municipio_actual_codigo)) return false;

  // Misma categoría profesional.
  if (a.sector_codigo !== b.sector_codigo) return false;
  if (a.cuerpo_id !== b.cuerpo_id) return false;
  if (a.especialidad_id !== b.especialidad_id) return false;

  // Regla geográfica del sector.
  const reglaGeo = REGLAS_GEO[a.sector_codigo];
  if (reglaGeo && !reglaGeo(a, b)) return false;

  // Reglas personales (símétricas entre A y B).
  if (
    Math.abs(a.anyos_servicio_totales - b.anyos_servicio_totales) >
    DIFERENCIA_MAX_ANTIGUEDAD
  ) {
    return false;
  }

  // Edad: faltan ≥10 años para la jubilación forzosa de cada uno.
  const anioActual = new Date().getFullYear();
  if (a.ano_nacimiento + EDAD_JUBILACION - anioActual < ANIOS_HASTA_JUBILACION_MIN) {
    return false;
  }
  if (b.ano_nacimiento + EDAD_JUBILACION - anioActual < ANIOS_HASTA_JUBILACION_MIN) {
    return false;
  }

  // Carencia: 10 años desde la permuta anterior si la hubo.
  if (a.permuta_anterior_fecha && añosDesde(a.permuta_anterior_fecha) < CARENCIA_PERMUTA_ANIOS) {
    return false;
  }
  if (b.permuta_anterior_fecha && añosDesde(b.permuta_anterior_fecha) < CARENCIA_PERMUTA_ANIOS) {
    return false;
  }

  // Docencia LOE: ≥2 años en destino actual.
  if (a.sector_codigo === "docente_loe") {
    if (añosDesde(a.fecha_toma_posesion_definitiva) < 2) return false;
    if (añosDesde(b.fecha_toma_posesion_definitiva) < 2) return false;
  }

  return true;
}

function añosDesde(fechaIso: string): number {
  const ms = Date.now() - new Date(fechaIso).getTime();
  return ms / (365.25 * 24 * 3600 * 1000);
}

/**
 * Construye la matriz de adyacencia: para cada anuncio, la lista de
 * anuncios a los que aceptaría irse (aristas salientes).
 */
function construirAdyacencia(anuncios: AnuncioMatching[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const a of anuncios) {
    const salientes: string[] = [];
    for (const b of anuncios) {
      if (aceptaPlazaDe(a, b)) salientes.push(b.id);
    }
    adj.set(a.id, salientes);
  }
  return adj;
}

/**
 * Cadena (huella) canónica: rotación que empieza por el ID menor.
 * Sirve para deduplicar ciclos rotados (A→B→C→A == B→C→A→B).
 */
function huellaCanonica(ciclo: string[]): string {
  let minIdx = 0;
  for (let i = 1; i < ciclo.length; i++) {
    if (ciclo[i] < ciclo[minIdx]) minIdx = i;
  }
  const rotado = [...ciclo.slice(minIdx), ...ciclo.slice(0, minIdx)];
  return rotado.join("-");
}

/**
 * Detecta todas las cadenas (longitud 2, 3 y 4) que pasan por al menos uno
 * de los `anunciosOrigen` (típicamente, los anuncios del usuario actual).
 *
 * Devuelve cadenas únicas (deduplicadas por huella canónica).
 */
export function detectarCadenas(
  todosLosAnuncios: AnuncioMatching[],
  anunciosOrigen: AnuncioMatching[],
): Cadena[] {
  const adj = construirAdyacencia(todosLosAnuncios);
  const idsOrigen = new Set(anunciosOrigen.map((a) => a.id));
  const vistas = new Set<string>();
  const resultado: Cadena[] = [];

  for (const o of anunciosOrigen) {
    const origen = o.id;
    const vecinos = adj.get(origen) ?? [];

    // Ciclo de 2: origen → b → origen
    for (const b of vecinos) {
      if ((adj.get(b) ?? []).includes(origen)) {
        registrarCiclo([origen, b], vistas, resultado, todosLosAnuncios);
      }
    }

    // Ciclo de 3
    for (const b of vecinos) {
      for (const c of adj.get(b) ?? []) {
        if (c === origen || c === b) continue;
        if ((adj.get(c) ?? []).includes(origen)) {
          registrarCiclo([origen, b, c], vistas, resultado, todosLosAnuncios);
        }
      }
    }

    // Ciclo de 4
    for (const b of vecinos) {
      for (const c of adj.get(b) ?? []) {
        if (c === origen || c === b) continue;
        for (const d of adj.get(c) ?? []) {
          if (d === origen || d === b || d === c) continue;
          if ((adj.get(d) ?? []).includes(origen)) {
            registrarCiclo([origen, b, c, d], vistas, resultado, todosLosAnuncios);
          }
        }
      }
    }
  }

  // Ordenar por: longitud (preferir 2 sobre 3 sobre 4) y luego score desc.
  resultado.sort((x, y) => x.longitud - y.longitud || y.score - x.score);

  return resultado;

  function registrarCiclo(
    ciclo: string[],
    vistas: Set<string>,
    out: Cadena[],
    anuncios: AnuncioMatching[],
  ) {
    const huella = huellaCanonica(ciclo);
    if (vistas.has(huella)) return;
    vistas.add(huella);
    // Solo nos interesa si pasa por algún anuncio del usuario.
    if (!ciclo.some((id) => idsOrigen.has(id))) return;
    out.push({
      longitud: ciclo.length as 2 | 3 | 4,
      anuncios: ciclo,
      huella,
      score: calcularScore(ciclo, anuncios),
    });
  }
}

/**
 * Score sencillo: penaliza cadenas largas (preferimos directas), bonifica
 * cadenas con anuncios "frescos" (publicados recientemente).
 */
function calcularScore(ciclo: string[], anuncios: AnuncioMatching[]): number {
  const indice = new Map(anuncios.map((a) => [a.id, a]));
  let bonus = 0;
  // Cuanto más recientes los anuncios, mejor (placeholder muy simple).
  const n = ciclo.length;
  for (const id of ciclo) {
    const a = indice.get(id);
    if (a) {
      const dias = (Date.now() - new Date(a.fecha_toma_posesion_definitiva).getTime()) / 86_400_000;
      bonus += Math.max(0, 5 - dias / 365); // hasta +5 si llevas <1 año en el destino
    }
  }
  // Penalización por longitud
  const baseLong = { 2: 100, 3: 70, 4: 50 }[n as 2 | 3 | 4] ?? 0;
  return baseLong + bonus / n;
}

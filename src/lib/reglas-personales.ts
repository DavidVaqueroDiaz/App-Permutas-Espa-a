/**
 * Verificación de las reglas legales personales de cada permuta.
 *
 * El matcher (`detectarCadenas`) solo aplica los filtros DUROS
 * (sector, cuerpo, especialidad, ámbito geográfico). Las reglas
 * PERSONALES — años hasta jubilación, antigüedad ±5, carencia entre
 * permutas, ≥2 años en destino — son responsabilidad del usuario
 * verificar antes de tramitar. Pero al menos podemos:
 *
 *   1. Calcularlas con los datos ya disponibles en cada anuncio.
 *   2. Mostrar avisos amarillos cuando saltan, para que el usuario
 *      sepa que esa cadena requiere verificación adicional.
 *
 * Esto NO sustituye la confirmación oficial de su administración,
 * pero sí evita que dos personas pierdan tiempo en una cadena que
 * obviamente no se puede tramitar.
 */

export type AvisoLegalPersonal = {
  nivel: "info" | "aviso" | "alerta";
  titulo: string;
  detalle: string;
};

export type DatosPersonalesParticipante = {
  /** Año de nacimiento (perfiles_publicos.ano_nacimiento). */
  ano_nacimiento: number;
  /** YYYY-MM-DD. */
  fecha_toma_posesion_definitiva: string;
  /** Años de servicio totales según el propio usuario al publicar. */
  anyos_servicio_totales: number;
  /** YYYY-MM-DD si hubo permuta anterior, null si no. */
  permuta_anterior_fecha: string | null;
};

const HOY = () => new Date();

/** Edad de jubilación forzosa más conservadora. Régimen General = 67. */
const EDAD_JUBILACION_FORZOSA = 67;
/** Margen máximo permitido entre antigüedades. */
const MAX_DIFF_ANTIGUEDAD = 5;
/** Mínimo de años en el destino actual antes de poder permutar (docencia LOE). */
const MIN_ANYOS_EN_DESTINO = 2;
/** Carencia entre permutas. */
const CARENCIA_PERMUTAS_ANYOS = 10;
/** Mínimo de años hasta la jubilación. */
const MIN_ANYOS_HASTA_JUBILACION = 10;

function aniosEntreFechas(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return ms / (365.25 * 24 * 3600 * 1000);
}

/**
 * Calcula los años hasta la jubilación forzosa (67) de una persona
 * dado su año de nacimiento.
 */
export function aniosHastaJubilacion(anoNacimiento: number): number {
  const anoActual = HOY().getFullYear();
  return EDAD_JUBILACION_FORZOSA - (anoActual - anoNacimiento);
}

/**
 * Verifica las reglas SOLO sobre los datos del propio participante
 * (sin compararlo con otro). Devuelve avisos individuales.
 */
export function verificarReglasParticipante(
  d: DatosPersonalesParticipante,
): AvisoLegalPersonal[] {
  const avisos: AvisoLegalPersonal[] = [];

  // Años hasta jubilación
  const aniosJub = aniosHastaJubilacion(d.ano_nacimiento);
  if (aniosJub < MIN_ANYOS_HASTA_JUBILACION) {
    avisos.push({
      nivel: "alerta",
      titulo: `Solo ${Math.floor(aniosJub)} años hasta jubilación`,
      detalle: `La normativa exige ≥${MIN_ANYOS_HASTA_JUBILACION} años hasta la jubilación forzosa (67). Esta persona está por debajo, la administración puede denegar la permuta.`,
    });
  }

  // Años en destino actual
  const fechaToma = new Date(d.fecha_toma_posesion_definitiva);
  if (!Number.isNaN(fechaToma.getTime())) {
    const aniosDestino = aniosEntreFechas(fechaToma, HOY());
    if (aniosDestino < MIN_ANYOS_EN_DESTINO) {
      avisos.push({
        nivel: "alerta",
        titulo: `Lleva ${aniosDestino.toFixed(1)} años en su destino actual`,
        detalle: `En docencia LOE se exigen ≥${MIN_ANYOS_EN_DESTINO} años de permanencia antes de permutar.`,
      });
    }
  }

  // Carencia 10 años desde última permuta
  if (d.permuta_anterior_fecha) {
    const fechaPermuta = new Date(d.permuta_anterior_fecha);
    if (!Number.isNaN(fechaPermuta.getTime())) {
      const aniosCarencia = aniosEntreFechas(fechaPermuta, HOY());
      if (aniosCarencia < CARENCIA_PERMUTAS_ANYOS) {
        avisos.push({
          nivel: "alerta",
          titulo: `Permutó hace ${aniosCarencia.toFixed(1)} años`,
          detalle: `La carencia es de ${CARENCIA_PERMUTAS_ANYOS} años entre permutas.`,
        });
      }
    }
  }

  return avisos;
}

/**
 * Verifica las reglas que comparan a DOS participantes (típicamente
 * el usuario buscador contra cada otro participante de la cadena).
 *
 * Por ahora la única regla pareada importante es la diferencia de
 * antigüedad ±5 años.
 */
export function verificarReglasPareja(
  yo: DatosPersonalesParticipante,
  otro: DatosPersonalesParticipante,
): AvisoLegalPersonal[] {
  const avisos: AvisoLegalPersonal[] = [];

  const diff = Math.abs(yo.anyos_servicio_totales - otro.anyos_servicio_totales);
  if (diff > MAX_DIFF_ANTIGUEDAD) {
    avisos.push({
      nivel: "alerta",
      titulo: `Antigüedad difiere en ${diff} años respecto a ti`,
      detalle: `La diferencia máxima permitida son ±${MAX_DIFF_ANTIGUEDAD} años de servicio. Por encima, la administración suele denegar.`,
    });
  } else if (diff === MAX_DIFF_ANTIGUEDAD) {
    avisos.push({
      nivel: "aviso",
      titulo: `Antigüedad justo en el límite (${diff} años)`,
      detalle: `Estás en el borde de los ±${MAX_DIFF_ANTIGUEDAD} años de margen. Verifica con tu administración.`,
    });
  }

  return avisos;
}

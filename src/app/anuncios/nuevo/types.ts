/**
 * Tipos compartidos del wizard de creación de anuncio.
 */

export type SectorRow = {
  codigo: string;
  nombre: string;
  descripcion: string | null;
};

export type CuerpoRow = {
  id: string;
  sector_codigo: string;
  codigo_oficial: string | null;
  denominacion: string;
  subgrupo: string | null;
};

export type EspecialidadRow = {
  id: string;
  cuerpo_id: string;
  codigo_oficial: string | null;
  denominacion: string;
};

/**
 * Estado interno del wizard. Lo persistimos en localStorage entre
 * recargas para que el usuario no pierda lo que iba rellenando.
 */
export type WizardState = {
  paso: number;

  // Paso 1
  sector_codigo: string | null;

  // Paso 2
  cuerpo_id: string | null;

  // Paso 3
  especialidad_id: string | null;

  // Paso 4 (próxima tanda)
  municipio_actual_codigo: string | null;

  // Paso 5 (próxima tanda)
  plazas_deseadas: string[];

  // Paso 6 (próxima tanda)
  fecha_toma_posesion_definitiva: string | null;
  anyos_servicio_totales: number | null;
  permuta_anterior_fecha: string | null;

  // Paso 7
  observaciones: string;
};

export const INITIAL_STATE: WizardState = {
  paso: 1,
  sector_codigo: null,
  cuerpo_id: null,
  especialidad_id: null,
  municipio_actual_codigo: null,
  plazas_deseadas: [],
  fecha_toma_posesion_definitiva: null,
  anyos_servicio_totales: null,
  permuta_anterior_fecha: null,
  observaciones: "",
};

export const TOTAL_PASOS = 8;

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

export type ServicioSaludRow = {
  codigo: string;
  nombre_corto: string;
  nombre_oficial: string;
  ccaa_codigo: string | null;
};

export type CcaaRow = {
  codigo_ine: string;
  nombre: string;
};

export type ProvinciaRow = {
  codigo_ine: string;
  nombre: string;
  ccaa_codigo: string;
};

export type AtajoState =
  | { tipo: "ccaa"; valor: string }
  | { tipo: "provincia"; valor: string }
  | { tipo: "municipio_individual"; valor: string };

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

  // Solo aplica al sector sanitario_sns. Se pide en el paso 2 inline,
  // tras elegir cuerpo. Para los demas sectores se queda null.
  servicio_salud_codigo: string | null;

  // Paso 3
  especialidad_id: string | null;

  // Paso 4 — plaza actual: un único municipio
  municipio_actual_codigo: string | null;
  municipio_actual_nombre: string | null; // cache visual

  // Paso 5 — plazas deseadas: lista plana de códigos + atajos elegidos
  plazas_deseadas: string[];
  atajos: AtajoState[];
  // Cache visual: nombre por código de municipio para los seleccionados
  // individualmente (no para los expandidos por atajos).
  plazas_individuales_nombres: Record<string, string>;

  // Paso 6 — datos legales
  fecha_toma_posesion_definitiva: string | null;
  anyos_servicio_totales: number | null;
  ha_permutado_antes: boolean;
  permuta_anterior_fecha: string | null;

  // Paso 7
  observaciones: string;
};

export const INITIAL_STATE: WizardState = {
  paso: 1,
  sector_codigo: null,
  cuerpo_id: null,
  servicio_salud_codigo: null,
  especialidad_id: null,
  municipio_actual_codigo: null,
  municipio_actual_nombre: null,
  plazas_deseadas: [],
  atajos: [],
  plazas_individuales_nombres: {},
  fecha_toma_posesion_definitiva: null,
  anyos_servicio_totales: null,
  ha_permutado_antes: false,
  permuta_anterior_fecha: null,
  observaciones: "",
};

export const TOTAL_PASOS = 8;

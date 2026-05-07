/**
 * Tests del matcher (src/lib/matching.ts).
 *
 * El matcher es la pieza mas critica de la app: si se rompe, el usuario
 * deja de ver cadenas reales o ve cadenas falsas. Estos tests cubren:
 *
 *   1. `aceptaPlazaDe(a, b)`: las 8 condiciones de la arista A->B
 *      (mismo anuncio, mismo usuario, mismo municipio, plazas deseadas,
 *      sector, cuerpo, especialidad, regla geografica).
 *   2. `detectarCadenas(...)`: ciclos de 2, 3 y 4, deduplicacion por
 *      huella canonica, filtro de origen, ordenacion por longitud.
 *   3. Reglas geograficas por sector: docencia LOE inter-CCAA, SNS
 *      intra-servicio, CCAA intra-CCAA, policia local solo en CCAA
 *      con regulacion expresa.
 */
import { describe, expect, it } from "vitest";
import {
  aceptaPlazaDe,
  detectarCadenas,
  type AnuncioMatching,
} from "../matching";

// ---------------------------------------------------------------------------
// Helpers de fabrica
// ---------------------------------------------------------------------------

let _seq = 0;
function nuevoId(prefijo = "a") {
  _seq++;
  return `${prefijo}-${_seq}`;
}

function fabricar(
  overrides: Partial<AnuncioMatching> = {},
): AnuncioMatching {
  return {
    id: nuevoId(),
    usuario_id: nuevoId("u"),
    sector_codigo: "docente_loe",
    cuerpo_id: "cuerpo-597",
    especialidad_id: "esp-035",
    municipio_actual_codigo: "36057", // Vigo
    ccaa_codigo: "12", // Galicia
    servicio_salud_codigo: null,
    fecha_toma_posesion_definitiva: "2018-09-01",
    anyos_servicio_totales: 10,
    permuta_anterior_fecha: null,
    ano_nacimiento: 1985,
    alias_publico: "test",
    plazas_deseadas: new Set(),
    ...overrides,
  };
}

// ===========================================================================
// aceptaPlazaDe()
// ===========================================================================

describe("aceptaPlazaDe", () => {
  it("rechaza el mismo anuncio", () => {
    const a = fabricar();
    expect(aceptaPlazaDe(a, a)).toBe(false);
  });

  it("rechaza dos anuncios del mismo usuario", () => {
    const u = "user-shared";
    const a = fabricar({ usuario_id: u, municipio_actual_codigo: "28079" });
    const b = fabricar({
      usuario_id: u,
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["28079"]),
    });
    expect(aceptaPlazaDe(b, a)).toBe(false);
  });

  it("rechaza si A y B estan en el mismo municipio", () => {
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["28079"]),
    });
    const b = fabricar({ municipio_actual_codigo: "28079" });
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("rechaza si A no incluye el municipio de B en sus plazas deseadas", () => {
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]), // quiere ir a Barcelona
    });
    const b = fabricar({ municipio_actual_codigo: "46250" }); // pero B esta en Valencia
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("acepta si A quiere ir a la plaza de B (caso minimo docencia)", () => {
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({ municipio_actual_codigo: "08019" });
    expect(aceptaPlazaDe(a, b)).toBe(true);
  });

  it("rechaza si los sectores no coinciden", () => {
    const a = fabricar({
      sector_codigo: "docente_loe",
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      sector_codigo: "funcionario_age",
      municipio_actual_codigo: "08019",
    });
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("rechaza si los cuerpos no coinciden", () => {
    const a = fabricar({
      cuerpo_id: "cuerpo-597",
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      cuerpo_id: "cuerpo-590",
      municipio_actual_codigo: "08019",
    });
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("rechaza si las especialidades no coinciden", () => {
    const a = fabricar({
      especialidad_id: "esp-035",
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      especialidad_id: "esp-036",
      municipio_actual_codigo: "08019",
    });
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("rechaza si una especialidad es null y la otra no", () => {
    const a = fabricar({
      especialidad_id: "esp-035",
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      especialidad_id: null,
      municipio_actual_codigo: "08019",
    });
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("acepta si AMBAS especialidades son null", () => {
    const a = fabricar({
      especialidad_id: null,
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      especialidad_id: null,
      municipio_actual_codigo: "08019",
    });
    expect(aceptaPlazaDe(a, b)).toBe(true);
  });
});

// ===========================================================================
// Reglas geograficas por sector
// ===========================================================================

describe("Reglas geograficas por sector", () => {
  it("docencia LOE permite inter-CCAA", () => {
    const a = fabricar({
      sector_codigo: "docente_loe",
      ccaa_codigo: "12", // Galicia
      municipio_actual_codigo: "36057",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      sector_codigo: "docente_loe",
      ccaa_codigo: "09", // Cataluna
      municipio_actual_codigo: "08019",
    });
    expect(aceptaPlazaDe(a, b)).toBe(true);
  });

  it("funcionario_ccaa rechaza inter-CCAA", () => {
    const a = fabricar({
      sector_codigo: "funcionario_ccaa",
      ccaa_codigo: "12",
      municipio_actual_codigo: "36057",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      sector_codigo: "funcionario_ccaa",
      ccaa_codigo: "09",
      municipio_actual_codigo: "08019",
    });
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("funcionario_ccaa acepta intra-CCAA", () => {
    const a = fabricar({
      sector_codigo: "funcionario_ccaa",
      ccaa_codigo: "09",
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["43148"]),
    });
    const b = fabricar({
      sector_codigo: "funcionario_ccaa",
      ccaa_codigo: "09",
      municipio_actual_codigo: "43148",
    });
    expect(aceptaPlazaDe(a, b)).toBe(true);
  });

  it("sanitario_sns rechaza si los servicios de salud no coinciden", () => {
    const a = fabricar({
      sector_codigo: "sanitario_sns",
      servicio_salud_codigo: "sergas",
      municipio_actual_codigo: "36057",
      plazas_deseadas: new Set(["28079"]),
    });
    const b = fabricar({
      sector_codigo: "sanitario_sns",
      servicio_salud_codigo: "sermas",
      municipio_actual_codigo: "28079",
    });
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("sanitario_sns acepta si los servicios de salud coinciden", () => {
    const a = fabricar({
      sector_codigo: "sanitario_sns",
      servicio_salud_codigo: "sergas",
      municipio_actual_codigo: "36057",
      plazas_deseadas: new Set(["15030"]),
    });
    const b = fabricar({
      sector_codigo: "sanitario_sns",
      servicio_salud_codigo: "sergas",
      municipio_actual_codigo: "15030",
    });
    expect(aceptaPlazaDe(a, b)).toBe(true);
  });

  it("sanitario_sns rechaza si servicio_salud_codigo es null", () => {
    const a = fabricar({
      sector_codigo: "sanitario_sns",
      servicio_salud_codigo: null,
      municipio_actual_codigo: "36057",
      plazas_deseadas: new Set(["15030"]),
    });
    const b = fabricar({
      sector_codigo: "sanitario_sns",
      servicio_salud_codigo: null,
      municipio_actual_codigo: "15030",
    });
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("policia_local acepta en CCAA con regulacion expresa (Galicia=12)", () => {
    const a = fabricar({
      sector_codigo: "policia_local",
      ccaa_codigo: "12",
      municipio_actual_codigo: "36057",
      plazas_deseadas: new Set(["15030"]),
    });
    const b = fabricar({
      sector_codigo: "policia_local",
      ccaa_codigo: "12",
      municipio_actual_codigo: "15030",
    });
    expect(aceptaPlazaDe(a, b)).toBe(true);
  });

  it("policia_local rechaza en CCAA sin regulacion (Madrid=13)", () => {
    const a = fabricar({
      sector_codigo: "policia_local",
      ccaa_codigo: "13",
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["28006"]),
    });
    const b = fabricar({
      sector_codigo: "policia_local",
      ccaa_codigo: "13",
      municipio_actual_codigo: "28006",
    });
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("policia_local rechaza si las CCAA no coinciden aunque ambas tengan regulacion", () => {
    const a = fabricar({
      sector_codigo: "policia_local",
      ccaa_codigo: "01", // Andalucia
      municipio_actual_codigo: "41091",
      plazas_deseadas: new Set(["12040"]),
    });
    const b = fabricar({
      sector_codigo: "policia_local",
      ccaa_codigo: "10", // Valencia
      municipio_actual_codigo: "12040",
    });
    expect(aceptaPlazaDe(a, b)).toBe(false);
  });

  it("habilitado_nacional permite inter-CCAA", () => {
    const a = fabricar({
      sector_codigo: "habilitado_nacional",
      ccaa_codigo: "12",
      municipio_actual_codigo: "36057",
      plazas_deseadas: new Set(["28079"]),
    });
    const b = fabricar({
      sector_codigo: "habilitado_nacional",
      ccaa_codigo: "13",
      municipio_actual_codigo: "28079",
    });
    expect(aceptaPlazaDe(a, b)).toBe(true);
  });
});

// ===========================================================================
// detectarCadenas()
// ===========================================================================

describe("detectarCadenas", () => {
  it("devuelve [] si no hay anuncios", () => {
    const r = detectarCadenas([], []);
    expect(r).toEqual([]);
  });

  it("detecta una permuta directa (ciclo de 2)", () => {
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["28079"]),
    });
    const r = detectarCadenas([a, b], [a]);
    expect(r).toHaveLength(1);
    expect(r[0].longitud).toBe(2);
    expect(new Set(r[0].anuncios)).toEqual(new Set([a.id, b.id]));
  });

  it("no detecta cadena si solo uno acepta al otro", () => {
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["46250"]), // no quiere Madrid, quiere Valencia
    });
    const r = detectarCadenas([a, b], [a]);
    expect(r).toHaveLength(0);
  });

  it("detecta una cadena a 3 (ciclo de 3)", () => {
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["46250"]),
    });
    const c = fabricar({
      municipio_actual_codigo: "46250",
      plazas_deseadas: new Set(["28079"]),
    });
    const r = detectarCadenas([a, b, c], [a]);
    expect(r).toHaveLength(1);
    expect(r[0].longitud).toBe(3);
  });

  it("detecta una cadena a 4 (ciclo de 4)", () => {
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["46250"]),
    });
    const c = fabricar({
      municipio_actual_codigo: "46250",
      plazas_deseadas: new Set(["41091"]),
    });
    const d = fabricar({
      municipio_actual_codigo: "41091",
      plazas_deseadas: new Set(["28079"]),
    });
    const r = detectarCadenas([a, b, c, d], [a]);
    const longitudes = r.map((c) => c.longitud);
    expect(longitudes).toContain(4);
  });

  it("deduplica rotaciones del mismo ciclo (huella canonica)", () => {
    // Triangulo donde los 3 son origen: A->B->C->A. Sin huella canonica
    // saldria 3 veces. Con huella canonica, una sola.
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["46250"]),
    });
    const c = fabricar({
      municipio_actual_codigo: "46250",
      plazas_deseadas: new Set(["28079"]),
    });
    const r = detectarCadenas([a, b, c], [a, b, c]);
    expect(r).toHaveLength(1);
  });

  it("solo devuelve cadenas que pasan por algun anuncio origen", () => {
    // Ciclo entre B y C, pero A no esta involucrado.
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["41091"]),
    });
    const b = fabricar({
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["46250"]),
    });
    const c = fabricar({
      municipio_actual_codigo: "46250",
      plazas_deseadas: new Set(["08019"]),
    });
    // Origen = solo A. La cadena B<->C no debe aparecer.
    const r = detectarCadenas([a, b, c], [a]);
    expect(r).toHaveLength(0);
  });

  it("ordena las cadenas por longitud (2 antes que 3 antes que 4)", () => {
    // Construimos un escenario con una cadena de 2 y una de 3 que pasan
    // por A (distintos triples y pares, sin chocar).
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019", "46250"]),
    });
    // Cadena de 2: A <-> B
    const b = fabricar({
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["28079"]),
    });
    // Cadena de 3: A -> C -> D -> A
    const c = fabricar({
      municipio_actual_codigo: "46250",
      plazas_deseadas: new Set(["41091"]),
    });
    const d = fabricar({
      municipio_actual_codigo: "41091",
      plazas_deseadas: new Set(["28079"]),
    });
    const r = detectarCadenas([a, b, c, d], [a]);
    expect(r.length).toBeGreaterThanOrEqual(2);
    expect(r[0].longitud).toBe(2);
    expect(r[1].longitud).toBe(3);
  });

  it("calcula score >= 100 para cadenas de 2 (preferencia maxima)", () => {
    const a = fabricar({
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["28079"]),
    });
    const r = detectarCadenas([a, b], [a]);
    expect(r[0].score).toBeGreaterThanOrEqual(100);
  });

  it("genera huella canonica determinista (rotacion empieza por id menor)", () => {
    const a = fabricar({
      id: "id-zzz",
      municipio_actual_codigo: "28079",
      plazas_deseadas: new Set(["08019"]),
    });
    const b = fabricar({
      id: "id-aaa",
      municipio_actual_codigo: "08019",
      plazas_deseadas: new Set(["28079"]),
    });
    const r = detectarCadenas([a, b], [a]);
    expect(r[0].huella.startsWith("id-aaa")).toBe(true);
  });
});

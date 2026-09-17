/**
 * Reglas que evitan perder cadenas o avisar mal (revision de sept. 2026):
 *   - la lista de municipios deseados se completa con los atajos,
 *   - el recuadro del buscador contiene todo el radio pedido,
 *   - las huellas de cadena se pueden deshacer en IDs,
 *   - el correo de "permuta posible" nombra a los DEMAS participantes y
 *     empieza el recorrido en la plaza de quien lo recibe.
 */
import { describe, expect, it } from "vitest";
import { atajosValidos, unirPlazas } from "../cadenas/plazas";
import { margenesRecuadro } from "../haversine";
import { idsDeHuella } from "../matching";
import { aliasDeLosDemas, recorridoDesde } from "../cadenas/notificar";
import { rotarCiclo } from "../cadenas/mis-cadenas";
import { leerTodo } from "../cadenas/universo";

/** Simula la API: devuelve como mucho `maxServidor` filas por peticion. */
function paginaSimulada(total: number, maxServidor: number) {
  const filas = Array.from({ length: total }, (_, i) => i);
  return (desde: number, hasta: number) =>
    Promise.resolve({
      data: filas.slice(desde, Math.min(hasta + 1, desde + maxServidor)),
      error: null,
    });
}

describe("leerTodo", () => {
  it("lee todas las filas aunque la API entregue menos de 1000 por pagina", async () => {
    const leidas = await leerTodo<number>(paginaSimulada(2350, 500));
    expect(leidas).toHaveLength(2350);
    expect(new Set(leidas).size).toBe(2350);
  });

  it("lee justo 1000 y 2000 filas sin perder ni repetir", async () => {
    expect(await leerTodo<number>(paginaSimulada(1000, 1000))).toHaveLength(1000);
    expect(await leerTodo<number>(paginaSimulada(2000, 1000))).toHaveLength(2000);
    expect(await leerTodo<number>(paginaSimulada(0, 1000))).toEqual([]);
  });

  it("si una pagina falla, avisa con un error en vez de seguir a medias", async () => {
    let llamadas = 0;
    const pagina = () => {
      llamadas++;
      return Promise.resolve(
        llamadas === 1
          ? { data: [1, 2, 3], error: null }
          : { data: null, error: { message: "fallo de red" } },
      );
    };
    await expect(leerTodo<number>(pagina)).rejects.toThrow("fallo de red");
  });
});

describe("unirPlazas", () => {
  it("une lo elegido y lo de los atajos sin repetir y ordenado", () => {
    expect(unirPlazas(["36057", "15030"], ["15030", "27028"], "32054")).toEqual([
      "15030",
      "27028",
      "36057",
    ]);
  });

  it("recupera los municipios que faltaban en la lista del navegador", () => {
    // 1200 codigos validos de 5 cifras (10000 a 11199).
    const provincia = Array.from({ length: 1200 }, (_, i) => String(10000 + i));
    const recortada = provincia.slice(0, 1000);
    expect(unirPlazas(recortada, provincia, "28079")).toHaveLength(1200);
  });

  it("quita el municipio actual y los codigos mal formados", () => {
    expect(unirPlazas(["36057", "abc", "1234", "123456"], ["36057", "15030"], "36057")).toEqual([
      "15030",
    ]);
  });
});

describe("atajosValidos", () => {
  it("se queda solo con atajos bien formados y sin duplicados", () => {
    expect(
      atajosValidos([
        { tipo: "ccaa", valor: "12" },
        { tipo: "ccaa", valor: "12" },
        { tipo: "provincia", valor: "36" },
        { tipo: "municipio_individual", valor: "36057" },
        { tipo: "provincia", valor: "36057" },
        { tipo: "radio", valor: "36057;30" },
        { tipo: "ccaa", valor: "12); drop table" },
        null,
        "texto",
      ]),
    ).toEqual([
      { tipo: "ccaa", valor: "12" },
      { tipo: "provincia", valor: "36" },
      { tipo: "municipio_individual", valor: "36057" },
    ]);
  });

  it("acepta una lista vacia o algo que no es lista", () => {
    expect(atajosValidos([])).toEqual([]);
    expect(atajosValidos(undefined)).toEqual([]);
  });
});

/** Punto a `km` de (lat, lon) en el rumbo `grados` (esfera). */
function destino(lat: number, lon: number, km: number, grados: number) {
  const R = 6371;
  const d = km / R;
  const t = (grados * Math.PI) / 180;
  const f1 = (lat * Math.PI) / 180;
  const l1 = (lon * Math.PI) / 180;
  const f2 = Math.asin(Math.sin(f1) * Math.cos(d) + Math.cos(f1) * Math.sin(d) * Math.cos(t));
  const l2 =
    l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(f1), Math.cos(d) - Math.sin(f1) * Math.sin(f2));
  return { lat: (f2 * 180) / Math.PI, lon: (l2 * 180) / Math.PI };
}

describe("margenesRecuadro", () => {
  it("el recuadro contiene todo el circulo, tambien en el norte y con radio grande", () => {
    for (const lat of [28.1, 36.7, 40.4, 43.4, 43.8]) {
      for (const radio of [10, 40, 60, 80, 100]) {
        const { margenLat, margenLon } = margenesRecuadro([lat], radio);
        for (let rumbo = 0; rumbo < 360; rumbo += 5) {
          const p = destino(lat, -3.7, radio, rumbo);
          expect(Math.abs(p.lat - lat)).toBeLessThanOrEqual(margenLat);
          expect(Math.abs(p.lon - -3.7)).toBeLessThanOrEqual(margenLon);
        }
      }
    }
  });

  it("con varios objetivos usa el mas al norte", () => {
    const soloSur = margenesRecuadro([36], 100).margenLon;
    const conNorte = margenesRecuadro([36, 43.5], 100).margenLon;
    expect(conNorte).toBeGreaterThan(soloSur);
  });
});

describe("idsDeHuella", () => {
  const a = "0a1b2c3d-1111-4222-8333-444455556666";
  const b = "ffeeddcc-9999-4888-a777-666655554444";
  it("separa los UUID aunque lleven guiones", () => {
    expect(idsDeHuella(`${a}-${b}`)).toEqual([a, b]);
  });
  it("devuelve lista vacia si no hay UUID", () => {
    expect(idsDeHuella("prueba-0039-123")).toEqual([]);
  });
});

describe("aviso de cadena nueva", () => {
  const participantes = [
    { usuario_id: "u-publica", alias_publico: "quien_publica", municipio_actual_codigo: "36057" },
    { usuario_id: "u-recibe", alias_publico: "quien_recibe", municipio_actual_codigo: "27028" },
    { usuario_id: "u-tercero", alias_publico: "tercero", municipio_actual_codigo: "15030" },
  ];
  const nombres: Record<string, string> = { "36057": "Vigo", "27028": "Lugo", "15030": "A Coruña" };

  it("nombra a los demas, incluida quien publico, y nunca a quien lo recibe", () => {
    const alias = aliasDeLosDemas(participantes, "u-recibe");
    expect(alias).toContain("quien_publica");
    expect(alias).toContain("tercero");
    expect(alias).not.toContain("quien_recibe");
  });

  it("el recorrido empieza y acaba en la plaza de quien lo recibe", () => {
    expect(recorridoDesde(participantes, 1, (c) => nombres[c])).toEqual([
      "Lugo",
      "A Coruña",
      "Vigo",
      "Lugo",
    ]);
  });
});

describe("rotarCiclo", () => {
  it("pone primero el anuncio indicado sin romper el orden del ciclo", () => {
    expect(rotarCiclo(["a", "b", "c", "d"], "c")).toEqual(["c", "d", "a", "b"]);
    expect(rotarCiclo(["a", "b"], "a")).toEqual(["a", "b"]);
    expect(rotarCiclo(["a", "b"], "z")).toEqual(["a", "b"]);
  });
});

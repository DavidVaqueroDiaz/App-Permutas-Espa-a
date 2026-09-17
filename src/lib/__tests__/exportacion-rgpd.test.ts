/**
 * "Descargar mis datos" (RGPD): cada anuncio tiene que salir con SUS
 * municipios y SUS atajos, y no se puede perder ninguna fila aunque haya
 * miles (la API devuelve 1000 como mucho y el archivo se arma despues).
 */
import { describe, expect, it } from "vitest";
import {
  construirExportacion,
  nombreArchivoExportacion,
  type DatosExportacion,
} from "../rgpd/exportacion";

const AHORA = new Date("2026-09-18T07:30:00.000Z");

function datos(parche: Partial<DatosExportacion> = {}): DatosExportacion {
  return {
    cuenta: {
      id: "u1",
      email: "persona@ejemplo.es",
      email_confirmed_at: "2026-05-01T00:00:00Z",
      created_at: "2026-04-30T00:00:00Z",
      last_sign_in_at: "2026-09-17T00:00:00Z",
    },
    perfil: { id: "u1", alias_publico: "persona" },
    anuncios: [],
    plazas: [],
    atajos: [],
    conversaciones: [],
    mensajesEnviados: [],
    mensajesRecibidos: [],
    reportes: [],
    cadenasNotificadas: [],
    seguimientos: [],
    sitioUrl: "https://permutaes.es",
    ahora: AHORA,
    ...parche,
  };
}

describe("construirExportacion", () => {
  it("da a cada anuncio sus municipios y sus atajos, sin mezclarlos", () => {
    const e = construirExportacion(
      datos({
        anuncios: [
          { id: "a1", estado: "activo" },
          { id: "a2", estado: "permutado" },
        ],
        plazas: [
          { anuncio_id: "a1", municipio_codigo: "36057" },
          { anuncio_id: "a2", municipio_codigo: "15030" },
          { anuncio_id: "a1", municipio_codigo: "27028" },
        ],
        atajos: [
          { anuncio_id: "a2", tipo: "provincia", valor: "36", creado_el: "2026-05-02T00:00:00Z" },
        ],
      }),
    );
    expect(e.anuncios[0].plazas_deseadas).toEqual(["36057", "27028"]);
    expect(e.anuncios[0].atajos).toEqual([]);
    expect(e.anuncios[1].plazas_deseadas).toEqual(["15030"]);
    expect(e.anuncios[1].atajos).toEqual([
      { tipo: "provincia", valor: "36", creado_el: "2026-05-02T00:00:00Z" },
    ]);
    // El anuncio conserva sus propios campos.
    expect(e.anuncios[0].estado).toBe("activo");
  });

  it("no pierde municipios aunque sean muchos mas de 1000", () => {
    const plazas = Array.from({ length: 2500 }, (_, i) => ({
      anuncio_id: i % 2 === 0 ? "a1" : "a2",
      municipio_codigo: String(10000 + i),
    }));
    const e = construirExportacion(
      datos({ anuncios: [{ id: "a1" }, { id: "a2" }], plazas }),
    );
    expect(e.anuncios[0].plazas_deseadas).toHaveLength(1250);
    expect(e.anuncios[1].plazas_deseadas).toHaveLength(1250);
    expect(
      e.anuncios[0].plazas_deseadas.length + e.anuncios[1].plazas_deseadas.length,
    ).toBe(plazas.length);
  });

  it("incluye todo lo que exige el RGPD, tambien lo que esta vacio", () => {
    const e = construirExportacion(
      datos({
        conversaciones: [{ id: "c1" }],
        mensajesEnviados: [{ id: "m1", contenido: "hola" }],
        mensajesRecibidos: [{ id: "m2", contenido: "que tal" }],
        reportes: [{ id: "r1" }],
        cadenasNotificadas: [{ id: "n1" }],
        seguimientos: [{ id: "s1" }],
      }),
    );
    expect(Object.keys(e)).toEqual([
      "metadata",
      "cuenta",
      "perfil",
      "anuncios",
      "conversaciones",
      "mensajes_enviados",
      "mensajes_recibidos",
      "reportes_que_he_hecho",
      "cadenas_notificadas",
      "correos_de_seguimiento",
    ]);
    expect(e.cuenta.email).toBe("persona@ejemplo.es");
    expect(e.metadata.politica_privacidad_url).toBe("https://permutaes.es/politica-privacidad");
    expect(e.metadata.exportado_el).toBe(AHORA.toISOString());
    expect(e.mensajes_recibidos).toHaveLength(1);
    expect(construirExportacion(datos()).anuncios).toEqual([]);
  });

  it("el archivo lleva la fecha", () => {
    expect(nombreArchivoExportacion(AHORA)).toBe("permutaes-mis-datos-2026-09-18.json");
  });
});

/**
 * Reglas del panel de administracion: estado de contacto de una cadena,
 * resultado de las cadenas pasadas y semaforo de "¿esta funcionando?".
 */
import { describe, expect, it } from "vitest";
import {
  avisoAdmin,
  estadoContacto,
  paresDeUsuarios,
  resultadoHistorico,
  type Metricas,
  type ParContacto,
  type ResumenCadenas,
} from "../admin/panel";
import { construirChequeos } from "../../app/admin/PanelSalud";

const par = (a: number, b: number): ParContacto => ({
  usuarioA: "ua",
  usuarioB: "ub",
  aliasA: "a",
  aliasB: "b",
  mensajesA: a,
  mensajesB: b,
  ultimoMensaje: a + b > 0 ? "2026-09-10T10:00:00Z" : null,
  creada: "2026-09-01T10:00:00Z",
  hablanDesde: a > 0 && b > 0 ? "2026-09-02T10:00:00Z" : null,
});

describe("paresDeUsuarios", () => {
  it("da todos los pares distintos", () => {
    expect(paresDeUsuarios(["x", "y"])).toEqual([["x", "y"]]);
    expect(paresDeUsuarios(["x", "y", "z"])).toHaveLength(3);
    expect(paresDeUsuarios(["x", "y", "z", "w"])).toHaveLength(6);
    expect(paresDeUsuarios(["x", "x"])).toEqual([]);
  });
});

describe("estadoContacto", () => {
  it("distingue los cuatro casos", () => {
    expect(estadoContacto([])).toBe("sin_contacto");
    expect(estadoContacto([par(0, 0)])).toBe("conversacion_vacia");
    expect(estadoContacto([par(2, 0)])).toBe("solo_uno");
    expect(estadoContacto([par(0, 0), par(1, 3)])).toBe("hablan");
  });
});

describe("avisoAdmin", () => {
  const ahora = Date.parse("2026-09-17T12:00:00Z");
  it("traduce lo apuntado a lo que ve el panel", () => {
    const el1 = "2026-09-01T00:00:00Z";
    expect(avisoAdmin(undefined, ahora)).toBe("falta");
    expect(avisoAdmin({ enviadoEl: el1, sinCorreo: false, reservadoEl: el1 }, ahora)).toBe("enviado");
    expect(avisoAdmin({ enviadoEl: el1, sinCorreo: true, reservadoEl: el1 }, ahora)).toBe("sin_correo");
    expect(avisoAdmin({ enviadoEl: null, sinCorreo: false, reservadoEl: "2026-09-17T11:50:00Z" }, ahora)).toBe("enviando");
    expect(avisoAdmin({ enviadoEl: null, sinCorreo: false, reservadoEl: "2026-09-17T11:00:00Z" }, ahora)).toBe("falta");
  });
});

describe("resultadoHistorico", () => {
  it("prioriza la permuta conseguida", () => {
    expect(resultadoHistorico(["activo", "permutado"])).toBe("permuta_conseguida");
    expect(resultadoHistorico(["eliminado", "permutado"])).toBe("permuta_conseguida");
  });
  it("detecta anuncios retirados, caducados o cambiados", () => {
    expect(resultadoHistorico(["activo", null])).toBe("anuncio_retirado");
    expect(resultadoHistorico(["activo", "eliminado"])).toBe("anuncio_retirado");
    expect(resultadoHistorico(["caducado", "activo"])).toBe("caducada");
    expect(resultadoHistorico(["activo", "activo"])).toBe("cambio_anuncio");
  });
});

const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

function metricas(parche: Partial<Metricas> = {}): Metricas {
  return {
    usuarios: { total: 10, confirmados: 9, nuevos_7d: 1, nuevos_30d: 3, entraron_30d: 5, con_anuncio_activo: 7 },
    anuncios: {
      activos: 8, caducados: 0, permutados: 0, eliminados: 1, nuevos_7d: 1, nuevos_30d: 2,
      caducan_30d: 0, vencidos_sin_marcar: 0, renovados: 0, ultima_permuta: null,
    },
    conversaciones: { total: 2, sin_mensajes: 0, solo_uno: 1, con_respuesta: 1 },
    mensajes: { total: 5, ultimos_7d: 1, ultimos_30d: 5 },
    avisos_cadena: { total: 3, ultimos_30d: 1, ultimo: horasAtras(24) },
    recordatorios_caducidad: { total: 0, ultimo: null },
    recordatorios_atrasados: 0,
    correos_30d: [{ tipo: "cadena_nueva", enviados: 2, fallidos: 0, ultimo: horasAtras(2) }],
    ultimo_fallo_correo: null,
    demos_sinteticos_activos: 0,
    reportes_pendientes: 0,
    anuncios_plazas_incompletas: 0,
    tareas: [
      { nombre: "marcar-anuncios-caducados", programacion: "0 2 * * *", activa: true, ultima: horasAtras(10), ultimo_estado: "succeeded", fallos_7d: 0 },
    ],
    ...parche,
  };
}

const resumen: ResumenCadenas = {
  total: 1, directas: 1, aTres: 0, aCuatro: 0, personas: 2, anuncios: 2, conContacto: 1, hablan: 1, sinAviso: 0,
  sinCorreo: 0, seguimientosPendientes: 0, personasSeguimiento: 0, seguimientosAtrasados: 0,
};

describe("construirChequeos", () => {
  it("sin problemas no marca ningun error ni aviso", () => {
    const c = construirChequeos(metricas(), resumen);
    expect(c.filter((x) => x.nivel === "error" || x.nivel === "aviso")).toEqual([]);
  });

  it("marca error si los recordatorios de caducidad van atrasados", () => {
    const c = construirChequeos(metricas({ recordatorios_atrasados: 3 }), resumen);
    expect(c.find((x) => x.titulo === "Recordatorios de caducidad")?.nivel).toBe("error");
  });

  it("marca error si una tarea diaria no se ejecuta o falla", () => {
    const vieja = construirChequeos(
      metricas({ tareas: [{ nombre: "t", programacion: "", activa: true, ultima: horasAtras(50), ultimo_estado: "succeeded", fallos_7d: 0 }] }),
      resumen,
    );
    expect(vieja.find((x) => x.titulo.includes("«t»"))?.nivel).toBe("error");
    const fallida = construirChequeos(
      metricas({ tareas: [{ nombre: "t", programacion: "", activa: true, ultima: horasAtras(1), ultimo_estado: "failed", fallos_7d: 1 }] }),
      resumen,
    );
    expect(fallida.find((x) => x.titulo.includes("«t»"))?.nivel).toBe("error");
  });

  it("avisa de correos fallidos, zonas incompletas y avisos de cadena sin registrar", () => {
    const c = construirChequeos(
      metricas({
        correos_30d: [{ tipo: "cadena_nueva", enviados: 1, fallidos: 2, ultimo: horasAtras(1) }],
        ultimo_fallo_correo: { tipo: "cadena_nueva", error: "dominio no verificado", fecha: horasAtras(1) },
        anuncios_plazas_incompletas: 2,
      }),
      { ...resumen, sinAviso: 1 },
    );
    expect(c.find((x) => x.titulo === "Correos")?.nivel).toBe("aviso");
    expect(c.find((x) => x.titulo === "Correos")?.detalle).toContain("dominio no verificado");
    expect(c.find((x) => x.titulo === "Municipios deseados")?.nivel).toBe("aviso");
    expect(c.find((x) => x.titulo === "Avisos de cadena")?.nivel).toBe("aviso");
  });

  it("marca error si un seguimiento debia haber salido y no salio", () => {
    const c = construirChequeos(
      metricas({ seguimientos: { primeros: 2, recordatorios: 0, ultimo: horasAtras(30), sin_confirmar: 0 } }),
      { ...resumen, seguimientosAtrasados: 1 },
    );
    expect(c.find((x) => x.titulo === "Seguimiento de permutas")?.nivel).toBe("error");
    const bien = construirChequeos(
      metricas({ seguimientos: { primeros: 2, recordatorios: 1, ultimo: horasAtras(30), sin_confirmar: 0 } }),
      { ...resumen, seguimientosPendientes: 3, personasSeguimiento: 2 },
    );
    const s = bien.find((x) => x.titulo === "Seguimiento de permutas");
    expect(s?.nivel).toBe("ok");
    expect(s?.detalle).toContain("lo recibirán 2 personas");
  });

  it("avisa de envios cortados a medias y de personas sin correo", () => {
    const c = construirChequeos(
      metricas({ avisos_cadena: { ...metricas().avisos_cadena, sin_confirmar: 1, sin_correo: 1 } }),
      { ...resumen, sinCorreo: 1 },
    );
    expect(c.find((x) => x.titulo === "Envíos cortados a medias")?.nivel).toBe("aviso");
    expect(c.find((x) => x.titulo === "Avisos de cadena")?.detalle).toContain("no tiene un correo válido");
  });

  it("marca error si hay anuncios vencidos sin cerrar o no hay cifras", () => {
    const c = construirChequeos(
      metricas({ anuncios: { ...metricas().anuncios, vencidos_sin_marcar: 4 } }),
      resumen,
    );
    expect(c.find((x) => x.titulo === "Anuncios vencidos")?.nivel).toBe("error");
    expect(construirChequeos(null, resumen)[0].nivel).toBe("error");
  });
});

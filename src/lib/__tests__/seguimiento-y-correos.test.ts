/**
 * Segunda entrega de la revision de sept. 2026:
 *   - avisos confirmados (que hacer con cada aviso apuntado) y un solo
 *     correo por persona,
 *   - correo «¿Conseguisteis la permuta?» a los 30 dias y recordatorio a
 *     los 90,
 *   - volver a la pagina pedida tras iniciar sesion sin abrir la puerta a
 *     redirecciones a otras webs,
 *   - contenido de los correos nuevos.
 */
import { describe, expect, it } from "vitest";
import {
  agruparPorPersona,
  aliasDeLosDemas,
  estadoAviso,
  type AvisoPendiente,
} from "../cadenas/notificar";
import {
  inicioDePersona,
  proximoSeguimiento,
  seguimientoAtrasado,
  seguimientoDeOtraCadena,
  seguimientoQueToca,
  situacionSeguimiento,
  type FilaSeguimiento,
  type RegistroSeguimiento,
} from "../cadenas/seguimiento";
import {
  clavePar,
  inicioMutuo,
  type ActividadConversacion,
  type ConversacionFila,
} from "../cadenas/contactos";
import { fragmentoSeguro, rutaInterna } from "../rutas";
import {
  listaNombres,
  plantillaCadenaNueva,
  plantillaCadenasNuevas,
  plantillaCadenaCerradaPorOtro,
  plantillaSeguimientoPermuta,
  type SeguimientoParaCorreo,
} from "../email/plantillas";
import { claveIdempotencia } from "../email/resend";

const DIA = 86_400_000;
const AHORA = Date.parse("2026-10-20T08:00:00Z");
const haceDias = (d: number) => new Date(AHORA - d * DIA).toISOString();

describe("estadoAviso", () => {
  it("sin nada apuntado hay que enviarlo", () => {
    expect(estadoAviso(undefined, AHORA)).toBe("enviar");
  });
  it("enviado no se repite", () => {
    expect(estadoAviso({ enviadoEl: haceDias(3), sinCorreo: false, reservadoEl: haceDias(3) }, AHORA)).toBe("hecho");
  });
  it("una reserva reciente se esta enviando; una vieja se reintenta", () => {
    const reciente = new Date(AHORA - 5 * 60_000).toISOString();
    const vieja = new Date(AHORA - 31 * 60_000).toISOString();
    expect(estadoAviso({ enviadoEl: null, sinCorreo: false, reservadoEl: reciente }, AHORA)).toBe("en_curso");
    expect(estadoAviso({ enviadoEl: null, sinCorreo: false, reservadoEl: vieja }, AHORA)).toBe("enviar");
  });
  it("las cuentas sin correo se vuelven a mirar", () => {
    expect(estadoAviso({ enviadoEl: haceDias(3), sinCorreo: true, reservadoEl: haceDias(3) }, AHORA)).toBe("sin_correo");
  });
});

describe("aliasDeLosDemas", () => {
  const p = (usuario_id: string, alias_publico: string) => ({ usuario_id, alias_publico });
  it("nombra a los demas en el mismo orden empiece donde empiece la cadena", () => {
    const ciclo = [p("u1", "ana"), p("u2", "luis"), p("u3", "eva")];
    const rotado = [p("u2", "luis"), p("u3", "eva"), p("u1", "ana")];
    expect(aliasDeLosDemas(ciclo, "u1")).toEqual(["luis", "eva"]);
    expect(aliasDeLosDemas(rotado, "u1")).toEqual(["luis", "eva"]);
    expect(aliasDeLosDemas(ciclo, "u2")).toEqual(["eva", "ana"]);
    expect(aliasDeLosDemas(rotado, "u2")).toEqual(["eva", "ana"]);
  });
});

describe("agruparPorPersona", () => {
  const aviso = (usuarioId: string, huella: string): AvisoPendiente => ({
    usuarioId,
    huella,
    estado: "enviar",
    longitud: 2,
    recorrido: ["A", "B", "A"],
    aliasOtros: ["x"],
    cuerpoTexto: "597",
  });
  it("una persona con varias cadenas recibe un solo correo, sin repetir cadena", () => {
    const g = agruparPorPersona([aviso("u1", "h1"), aviso("u2", "h1"), aviso("u1", "h2"), aviso("u1", "h1")]);
    expect(g.size).toBe(2);
    expect(g.get("u1")!.map((a) => a.huella)).toEqual(["h1", "h2"]);
    expect(g.get("u2")!.map((a) => a.huella)).toEqual(["h1"]);
  });
});

describe("seguimientoQueToca", () => {
  const enviado = (dias: number): RegistroSeguimiento => ({
    enviadoEl: haceDias(dias),
    reservadoEl: haceDias(dias),
    sinCorreo: false,
  });

  it("nada antes de 30 dias hablando; el primero a partir de 30", () => {
    expect(seguimientoQueToca({ inicio: haceDias(29), ahora: AHORA })).toBe(0);
    expect(seguimientoQueToca({ inicio: haceDias(30), ahora: AHORA })).toBe(1);
    expect(seguimientoQueToca({ inicio: haceDias(200), ahora: AHORA })).toBe(1);
  });

  it("el recordatorio a los 90 dias y al menos 30 despues del primero", () => {
    expect(seguimientoQueToca({ inicio: haceDias(60), ahora: AHORA, primero: enviado(30) })).toBe(0);
    expect(seguimientoQueToca({ inicio: haceDias(90), ahora: AHORA, primero: enviado(60) })).toBe(2);
    // Conversaciones antiguas: el primero sale hoy y el recordatorio espera 30 dias.
    expect(seguimientoQueToca({ inicio: haceDias(150), ahora: AHORA, primero: enviado(10) })).toBe(0);
    expect(seguimientoQueToca({ inicio: haceDias(150), ahora: AHORA, primero: enviado(30) })).toBe(2);
  });

  it("nunca mas de dos", () => {
    expect(
      seguimientoQueToca({ inicio: haceDias(400), ahora: AHORA, primero: enviado(300), segundo: enviado(200) }),
    ).toBe(0);
  });

  it("no repite mientras se envia y reintenta si se corto", () => {
    const enviando: RegistroSeguimiento = {
      enviadoEl: null,
      reservadoEl: new Date(AHORA - 60_000).toISOString(),
      sinCorreo: false,
    };
    const cortado: RegistroSeguimiento = { ...enviando, reservadoEl: new Date(AHORA - 40 * 60_000).toISOString() };
    expect(seguimientoQueToca({ inicio: haceDias(40), ahora: AHORA, primero: enviando })).toBe(0);
    expect(seguimientoQueToca({ inicio: haceDias(40), ahora: AHORA, primero: cortado })).toBe(1);
    expect(
      seguimientoQueToca({ inicio: haceDias(120), ahora: AHORA, primero: enviado(40), segundo: cortado }),
    ).toBe(2);
    expect(
      seguimientoQueToca({ inicio: haceDias(120), ahora: AHORA, primero: enviado(40), segundo: enviando }),
    ).toBe(0);
  });

  it("sin correo valido no hay recordatorio", () => {
    const sinCorreo: RegistroSeguimiento = { ...enviado(40), sinCorreo: true };
    expect(seguimientoQueToca({ inicio: haceDias(120), ahora: AHORA, primero: sinCorreo })).toBe(0);
  });

  it("coincide con la fecha que muestra el panel", () => {
    const casos: { inicio: string; primero?: RegistroSeguimiento; segundo?: RegistroSeguimiento }[] = [
      { inicio: haceDias(10) },
      { inicio: haceDias(45) },
      { inicio: haceDias(95), primero: enviado(50) },
      { inicio: haceDias(95), primero: enviado(20) },
      { inicio: haceDias(95), primero: enviado(60), segundo: enviado(5) },
    ];
    for (const c of casos) {
      const toca = seguimientoQueToca({ ...c, ahora: AHORA });
      const prox = proximoSeguimiento(c);
      const vence = prox !== null && Date.parse(prox.fecha) <= AHORA;
      expect(toca !== 0).toBe(vence);
      if (toca !== 0) expect(prox?.numero).toBe(toca);
    }
  });
});

describe("proximoSeguimiento y seguimientoAtrasado", () => {
  it("fechas del primero y del recordatorio", () => {
    expect(proximoSeguimiento({ inicio: null })).toBeNull();
    expect(proximoSeguimiento({ inicio: "2026-09-01T00:00:00.000Z" })).toEqual({
      numero: 1,
      fecha: "2026-10-01T00:00:00.000Z",
    });
    expect(
      proximoSeguimiento({
        inicio: "2026-05-01T00:00:00.000Z",
        primero: { enviadoEl: "2026-09-18T08:00:00.000Z", reservadoEl: "2026-09-18T08:00:00.000Z", sinCorreo: false },
      }),
    ).toEqual({ numero: 2, fecha: "2026-10-18T08:00:00.000Z" });
  });

  it("lo que tocaba antes de existir el seguimiento no cuenta como atrasado el primer dia", () => {
    const fechaAntigua = "2026-06-01T00:00:00.000Z";
    expect(seguimientoAtrasado(fechaAntigua, Date.parse("2026-09-18T10:00:00Z"))).toBe(false);
    expect(seguimientoAtrasado(fechaAntigua, Date.parse("2026-09-19T03:00:00Z"))).toBe(true);
    expect(seguimientoAtrasado("2026-10-01T00:00:00.000Z", Date.parse("2026-10-01T20:00:00Z"))).toBe(false);
    expect(seguimientoAtrasado("2026-10-01T00:00:00.000Z", Date.parse("2026-10-02T03:00:00Z"))).toBe(true);
  });
});

describe("inicio de la conversacion", () => {
  const act = (primeros: Record<string, string>): ActividadConversacion => ({
    porRemitente: new Map(Object.keys(primeros).map((k) => [k, 1])),
    primeroDe: new Map(Object.entries(primeros)),
    ultimo: null,
  });

  it("solo cuenta cuando han escrito las dos personas, desde la respuesta", () => {
    expect(inicioMutuo(act({ a: "2026-05-01T00:00:00Z" }), "a", "b")).toBeNull();
    expect(inicioMutuo(act({ a: "2026-05-01T00:00:00Z", b: "2026-05-03T00:00:00Z" }), "a", "b")).toBe(
      "2026-05-03T00:00:00Z",
    );
    expect(inicioMutuo(undefined, "a", "b")).toBeNull();
  });

  it("el par se busca igual en los dos sentidos", () => {
    expect(clavePar("b", "a")).toBe(clavePar("a", "b"));
  });

  it("toma la conversacion mas antigua y nunca las de administradores", () => {
    const convPorPar = new Map([
      [clavePar("yo", "ana"), { id: "c1", usuario_a_id: "ana", usuario_b_id: "yo", creado_el: "" }],
      [clavePar("yo", "luis"), { id: "c2", usuario_a_id: "luis", usuario_b_id: "yo", creado_el: "" }],
      [clavePar("yo", "admin"), { id: "c3", usuario_a_id: "admin", usuario_b_id: "yo", creado_el: "" }],
    ]);
    const actividad = new Map([
      ["c1", act({ yo: "2026-06-10T00:00:00Z", ana: "2026-06-11T00:00:00Z" })],
      ["c2", act({ yo: "2026-06-01T00:00:00Z", luis: "2026-06-02T00:00:00Z" })],
      ["c3", act({ yo: "2026-01-01T00:00:00Z", admin: "2026-01-02T00:00:00Z" })],
    ]);
    const admins = new Set(["admin"]);
    expect(inicioDePersona("yo", ["yo", "ana", "luis", "admin"], admins, convPorPar, actividad)).toEqual({
      inicio: "2026-06-02T00:00:00Z",
      con: ["ana", "luis"],
    });
    expect(inicioDePersona("admin", ["yo", "admin"], admins, convPorPar, actividad).inicio).toBeNull();
    expect(inicioDePersona("yo", ["yo", "admin"], admins, convPorPar, actividad).inicio).toBeNull();
  });
});

describe("no repetir la pregunta a las mismas personas", () => {
  const fila = (
    huella: string,
    numero: 1 | 2,
    dias: number | null,
  ): FilaSeguimiento => ({
    huella,
    numero,
    enviadoEl: dias === null ? null : haceDias(dias),
    reservadoEl: haceDias(dias ?? 0),
    sinCorreo: false,
  });
  // h1: cadena con ana; h2: cadena con ana y luis.
  const usuarios: Record<string, string[]> = { h1: ["yo", "ana"], h2: ["yo", "ana", "luis"], h3: ["yo", "ana"] };
  const usuariosDeHuella = (h: string) => new Set(usuarios[h] ?? []);

  it("un seguimiento de otra cadena con las mismas personas cuenta como propio", () => {
    const filas = [fila("h1", 1, 40)];
    expect(seguimientoDeOtraCadena(filas, 1, "h3", ["ana"], usuariosDeHuella)?.enviadoEl).toBe(haceDias(40));
    // Si en la cadena nueva habla con alguien mas, no vale.
    expect(seguimientoDeOtraCadena(filas, 1, "h3", ["ana", "luis"], usuariosDeHuella)).toBeUndefined();
    // Ni el de la propia cadena, ni los que no salieron.
    expect(seguimientoDeOtraCadena(filas, 1, "h1", ["ana"], usuariosDeHuella)).toBeUndefined();
    expect(seguimientoDeOtraCadena([fila("h1", 1, null)], 1, "h3", ["ana"], usuariosDeHuella)).toBeUndefined();
    expect(seguimientoDeOtraCadena(filas, 2, "h3", ["ana"], usuariosDeHuella)).toBeUndefined();
  });

  const base = {
    yo: "yo",
    personas: ["yo", "ana"],
    admins: new Set<string>(),
    convPorPar: new Map<string, ConversacionFila>([
      [clavePar("yo", "ana"), { id: "c1", usuario_a_id: "ana", usuario_b_id: "yo", creado_el: haceDias(100) }],
    ]),
    actividad: new Map<string, ActividadConversacion>([
      [
        "c1",
        {
          porRemitente: new Map([["yo", 1], ["ana", 1]]),
          primeroDe: new Map([["yo", haceDias(100)], ["ana", haceDias(99)]]),
          ultimo: haceDias(99),
        },
      ],
    ]),
    usuariosDeHuella,
    ahora: AHORA,
  };

  it("el plazo cuenta desde el aviso de esa cadena, no desde el primer chat", () => {
    // Hablan desde hace 99 dias, pero la cadena se aviso hace 5: no toca.
    const reciente = situacionSeguimiento({ ...base, huella: "h3", avisoEnviadoEl: haceDias(5), filas: [] });
    expect(reciente.hablanDesde).toBe(haceDias(99));
    expect(reciente.inicio).toBe(haceDias(5));
    expect(reciente.toca).toBe(0);
    expect(reciente.proximo?.numero).toBe(1);

    const antigua = situacionSeguimiento({ ...base, huella: "h3", avisoEnviadoEl: haceDias(60), filas: [] });
    expect(antigua.inicio).toBe(haceDias(60));
    expect(antigua.toca).toBe(1);
  });

  it("sin aviso enviado no se pregunta nada", () => {
    const s = situacionSeguimiento({ ...base, huella: "h3", avisoEnviadoEl: null, filas: [] });
    expect(s.inicio).toBeNull();
    expect(s.toca).toBe(0);
    expect(s.proximo).toBeNull();
  });

  it("si ya se le pregunto por otra cadena con las mismas personas, no se repite", () => {
    const s = situacionSeguimiento({
      ...base,
      huella: "h3",
      avisoEnviadoEl: haceDias(60),
      filas: [fila("h1", 1, 40)],
    });
    expect(s.toca).toBe(0);
    expect(s.primeroDeOtra).toBe(true);
    // Y el recordatorio se hereda: 90 dias de plazo y 30 desde el primero.
    expect(s.proximo).toEqual({ numero: 2, fecha: new Date(Date.parse(haceDias(60)) + 90 * DIA).toISOString() });
  });

  it("marca cuando se esta enviando ahora mismo", () => {
    const enviando: FilaSeguimiento = {
      huella: "h3",
      numero: 1,
      enviadoEl: null,
      reservadoEl: new Date(AHORA - 60_000).toISOString(),
      sinCorreo: false,
    };
    const s = situacionSeguimiento({ ...base, huella: "h3", avisoEnviadoEl: haceDias(60), filas: [enviando] });
    expect(s.enviando).toBe(true);
    expect(s.toca).toBe(0);
  });
});

describe("rutaInterna", () => {
  it("acepta rutas de la web", () => {
    expect(rutaInterna("/mis-cadenas")).toBe("/mis-cadenas");
    expect(rutaInterna("/mensajes/abc?x=1")).toBe("/mensajes/abc?x=1");
    expect(rutaInterna("/mi-cuenta#anuncio-1")).toBe("/mi-cuenta#anuncio-1");
  });
  it("rechaza lo que sacaria de la web o haria un bucle", () => {
    for (const malo of [
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "evil.com",
      "/.//evil.com",
      "/%0a/evil",
      "/login",
      "/login?redirect=/login",
      "/logout",
      "/auth/callback",
      "",
      null,
      42,
      "/x\ny",
      "/" + "a".repeat(400),
    ]) {
      const r = rutaInterna(malo);
      if (r !== null) {
        expect(r.startsWith("/") && !r.startsWith("//")).toBe(true);
        expect(r.startsWith("/login") || r.startsWith("/logout")).toBe(false);
      }
    }
    expect(rutaInterna("//evil.com")).toBeNull();
    expect(rutaInterna("/.//evil.com")).toBeNull();
    expect(rutaInterna("https://evil.com")).toBeNull();
    expect(rutaInterna("/\\evil.com")).toBeNull();
    expect(rutaInterna("/login")).toBeNull();
  });
  it("fragmentos: solo del tipo #anuncio-123", () => {
    expect(fragmentoSeguro("#anuncio-0a1b")).toBe("#anuncio-0a1b");
    expect(fragmentoSeguro("#a/b")).toBe("");
    expect(fragmentoSeguro("anuncio")).toBe("");
    expect(fragmentoSeguro(undefined)).toBe("");
  });
});

const sinRayas = (s: string) => !/[—–]/.test(s);

describe("correos nuevos", () => {
  const cadena = {
    longitud: 2 as const,
    recorrido: ["Vigo", "Lugo", "Vigo"],
    aliasOtros: ["ana"],
    cuerpoTexto: "597 · Maestros (Educación Física)",
  };

  it("un solo aviso usa el correo de siempre; varios, el resumen", () => {
    expect(plantillaCadenasNuevas({ cadenas: [cadena] })).toEqual(plantillaCadenaNueva(cadena));
    const dos = plantillaCadenasNuevas({
      cadenas: [cadena, { ...cadena, longitud: 3, recorrido: ["Vigo", "Ourense", "Lugo", "Vigo"], aliasOtros: ["luis", "eva"] }],
    });
    expect(dos.subject).toContain("2 permutas posibles");
    expect(dos.text).toContain("Vigo → Ourense → Lugo → Vigo");
    expect(dos.text).toContain("luis y eva");
    expect(dos.html).toContain("/mis-cadenas");
  });

  it("no repite una cadena que se veria igual (anuncio duplicado)", () => {
    expect(plantillaCadenasNuevas({ cadenas: [cadena, { ...cadena }] })).toEqual(plantillaCadenaNueva(cadena));
  });

  const item = (numero: 1 | 2, extra: Partial<SeguimientoParaCorreo> = {}): SeguimientoParaCorreo => ({
    anuncioId: "0a1b2c3d-1111-4222-8333-444455556666",
    longitud: 2,
    recorrido: ["Vigo", "Lugo", "Vigo"],
    aliasHablados: ["ana"],
    cuerpoTexto: "597 · Maestros",
    numero,
    ...extra,
  });

  it("seguimiento: pregunta, boton al anuncio y sin marcar nada desde el correo", () => {
    const p = plantillaSeguimientoPermuta({ alias: "pepe", items: [item(1)] });
    expect(p.subject).toBe("¿Conseguisteis la permuta?");
    expect(p.html).toContain("/mi-cuenta#anuncio-0a1b2c3d-1111-4222-8333-444455556666");
    expect(p.text).toContain("encontramos esta permuta y ana y tú habéis hablado");
    expect(p.text).toContain("He conseguido la permuta");
    expect(p.text).not.toContain("último correo");
    expect(sinRayas(p.text) && sinRayas(p.subject)).toBe(true);
  });

  it("recordatorio: lo dice y avisa de que es el ultimo", () => {
    const p = plantillaSeguimientoPermuta({ alias: "pepe", items: [item(2)] });
    expect(p.subject).toBe("Recordatorio: ¿conseguisteis la permuta?");
    expect(p.text).toContain("Es el último correo");
    const mezcla = plantillaSeguimientoPermuta({
      alias: "pepe",
      items: [item(1), item(2, { recorrido: ["Vigo", "Ourense", "Vigo"], aliasHablados: ["luis"] })],
    });
    expect(mezcla.subject).toBe("¿Conseguisteis la permuta?");
    expect(mezcla.text).toContain("Hablando con: luis");
    // El aviso de "último correo" va solo en la permuta que lo es.
    expect(mezcla.text.split("\n\n")[1]).not.toContain("Es el último correo");
    expect(mezcla.text).toContain("Es el último correo que te enviamos sobre esta permuta");
  });

  it("los nombres no pueden meter HTML en el correo", () => {
    const p = plantillaSeguimientoPermuta({
      alias: "<b>pepe</b>",
      items: [item(1, { aliasHablados: ['<img src=x onerror="y">'] })],
    });
    expect(p.html).not.toContain("<b>pepe</b>");
    expect(p.html).not.toContain("<img");
  });

  it("el aviso de cadena cerrada pide marcar la propia si fue con esa persona", () => {
    const p = plantillaCadenaCerradaPorOtro({
      aliasQueCerro: "ana",
      recorridosAfectados: ["Vigo → Lugo → Vigo"],
      cuerpoTexto: "597",
      cadenasRestantes: 0,
    });
    expect(p.text).toContain("Si la permuta ha sido contigo");
    expect(p.html).toContain("He conseguido la permuta");
  });

  it("listaNombres", () => {
    expect(listaNombres(["ana"])).toBe("ana");
    expect(listaNombres(["ana", "luis"])).toBe("ana y luis");
    expect(listaNombres(["ana", "luis", "eva"])).toBe("ana, luis y eva");
    expect(listaNombres([])).toBe("");
  });

  it("clave para no repetir correos: estable, corta y distinta si cambia el contenido", () => {
    const c = { subject: "s", text: "t" };
    const k1 = claveIdempotencia("cadenas", "u1", ["h2", "h1"], c);
    expect(k1).toBe(claveIdempotencia("cadenas", "u1", ["h1", "h2"], c));
    expect(k1).not.toBe(claveIdempotencia("cadenas", "u1", ["h1", "h2"], { ...c, text: "otro" }));
    expect(k1).not.toBe(claveIdempotencia("cadenas", "u2", ["h1", "h2"], c));
    expect(k1.length).toBeLessThanOrEqual(256);
  });
});

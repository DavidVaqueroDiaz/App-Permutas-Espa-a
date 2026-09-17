/**
 * Armado del archivo de "Descargar mis datos" (RGPD art. 15 y 20).
 *
 * Aqui no se lee nada de la base de datos: solo se juntan las piezas ya
 * leidas. Asi se puede probar que cada anuncio se queda con SUS
 * municipios y SUS atajos, que es donde un fallo dejaria al usuario un
 * archivo incompleto sin que nadie se entere.
 */

export type Registro = Record<string, unknown>;

export type PlazaExportada = { anuncio_id: string; municipio_codigo: string };
export type AtajoExportado = {
  anuncio_id: string;
  tipo: string;
  valor: string;
  creado_el: string;
};

export type DatosExportacion = {
  cuenta: {
    id: string;
    email: string | null;
    email_confirmed_at: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
  };
  perfil: Registro | null;
  anuncios: Registro[];
  plazas: PlazaExportada[];
  atajos: AtajoExportado[];
  conversaciones: Registro[];
  mensajesEnviados: Registro[];
  mensajesRecibidos: Registro[];
  reportes: Registro[];
  cadenasNotificadas: Registro[];
  seguimientos: Registro[];
  sitioUrl: string;
  ahora: Date;
};

function agruparPorAnuncio<T extends { anuncio_id: string }>(filas: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const f of filas) {
    const lista = mapa.get(f.anuncio_id) ?? [];
    lista.push(f);
    mapa.set(f.anuncio_id, lista);
  }
  return mapa;
}

export type AnuncioExportado = Registro & {
  plazas_deseadas: string[];
  atajos: { tipo: string; valor: string; creado_el: string }[];
};

export function construirExportacion(d: DatosExportacion) {
  const plazasPorAnuncio = agruparPorAnuncio(d.plazas);
  const atajosPorAnuncio = agruparPorAnuncio(d.atajos);

  return {
    metadata: {
      exportado_el: d.ahora.toISOString(),
      politica_privacidad_url: `${d.sitioUrl}/politica-privacidad`,
      formato: "json",
      version: 2,
    },
    cuenta: d.cuenta,
    perfil: d.perfil,
    anuncios: d.anuncios.map((a): AnuncioExportado => {
      const id = String((a as { id?: unknown }).id ?? "");
      return {
        ...a,
        plazas_deseadas: (plazasPorAnuncio.get(id) ?? []).map((p) => p.municipio_codigo),
        atajos: (atajosPorAnuncio.get(id) ?? []).map(({ tipo, valor, creado_el }) => ({
          tipo,
          valor,
          creado_el,
        })),
      };
    }),
    conversaciones: d.conversaciones,
    mensajes_enviados: d.mensajesEnviados,
    mensajes_recibidos: d.mensajesRecibidos,
    reportes_que_he_hecho: d.reportes,
    cadenas_notificadas: d.cadenasNotificadas,
    correos_de_seguimiento: d.seguimientos,
  };
}

export function nombreArchivoExportacion(ahora: Date): string {
  return `permutaes-mis-datos-${ahora.toISOString().slice(0, 10)}.json`;
}

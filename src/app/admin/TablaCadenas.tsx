import type {
  CadenaAdmin,
  CadenaHistorica,
  EstadoContacto,
  ParContacto,
  ResultadoHistorico,
} from "@/lib/admin/panel";

function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

const TIPO: Record<number, string> = { 2: "Directa", 3: "A 3", 4: "A 4" };

const CONTACTO: Record<EstadoContacto, { texto: string; clase: string }> = {
  hablan: { texto: "Han hablado", clase: "bg-brand text-white" },
  solo_uno: { texto: "Escribió solo una parte", clase: "bg-warn-bg text-warn-text" },
  conversacion_vacia: { texto: "Chat abierto sin mensajes", clase: "bg-warn-bg text-warn-text" },
  sin_contacto: { texto: "Sin contacto", clase: "bg-slate-200 text-slate-700" },
};

const RESULTADO: Record<ResultadoHistorico, { texto: string; clase: string }> = {
  permuta_conseguida: { texto: "Permuta conseguida", clase: "bg-brand text-white" },
  caducada: { texto: "Algún anuncio caducó", clase: "bg-slate-200 text-slate-700" },
  anuncio_retirado: { texto: "Algún anuncio retirado", clase: "bg-slate-200 text-slate-700" },
  cambio_anuncio: { texto: "Alguien cambió su anuncio", clase: "bg-slate-200 text-slate-700" },
};

function Etiqueta({ texto, clase }: { texto: string; clase: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${clase}`}>
      {texto}
    </span>
  );
}

function Pares({ pares }: { pares: ParContacto[] }) {
  if (pares.length === 0) {
    return <p className="text-xs text-slate-500">No han abierto ninguna conversación entre ellos.</p>;
  }
  return (
    <ul className="space-y-1 text-xs text-slate-700">
      {pares.map((p, i) => (
        <li key={i}>
          <strong>{p.aliasA}</strong> {p.mensajesA} {p.mensajesA === 1 ? "mensaje" : "mensajes"} ·{" "}
          <strong>{p.aliasB}</strong> {p.mensajesB} {p.mensajesB === 1 ? "mensaje" : "mensajes"}
          <span className="text-slate-500">
            {" "}
            (chat abierto el {fecha(p.creada)}
            {p.ultimoMensaje ? `, último mensaje el ${fecha(p.ultimoMensaje)}` : ""})
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TablaCadenas({
  cadenas,
  historicas,
}: {
  cadenas: CadenaAdmin[];
  historicas: CadenaHistorica[];
}) {
  return (
    <>
      <section className="mb-10">
        <h2 className="mb-1 font-head text-xl font-semibold text-slate-900">
          Cadenas actuales ({cadenas.length})
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Permutas posibles ahora mismo entre anuncios reales. De los chats solo
          se muestran recuentos y fechas, nunca el contenido.
        </p>
        {cadenas.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Ahora mismo no hay ninguna cadena entre anuncios reales.
          </p>
        ) : (
          <ul className="space-y-3">
            {cadenas.map((c) => {
              const contacto = CONTACTO[c.contacto];
              return (
                <li key={c.huella} className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">
                        {TIPO[c.longitud]} · formada hacia el {fecha(c.formadaEl)}
                      </p>
                      <p className="font-medium text-slate-900">{c.categoria}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Etiqueta {...contacto} />
                      {c.sinAviso > 0 && (
                        <Etiqueta
                          texto={`${c.sinAviso} sin aviso`}
                          clase="bg-red-100 text-red-700"
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="py-1 pr-3">Persona</th>
                          <th className="py-1 pr-3">Está en</th>
                          <th className="py-1 pr-3">Iría a</th>
                          <th className="py-1">Aviso por correo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {c.participantes.map((p) => (
                          <tr key={p.anuncioId}>
                            <td className="py-1.5 pr-3 font-medium text-slate-900">{p.alias}</td>
                            <td className="py-1.5 pr-3 text-slate-700">
                              {p.municipio}
                              {p.provincia ? <span className="text-slate-500"> ({p.provincia})</span> : null}
                            </td>
                            <td className="py-1.5 pr-3 text-slate-700">{p.destino}</td>
                            <td className="py-1.5 text-xs">
                              {p.avisadoEl ? (
                                <span className="text-brand-text">Avisado el {fecha(p.avisadoEl)}</span>
                              ) : (
                                <span className="font-semibold text-red-700">
                                  Sin aviso todavía
                                  <span className="block font-normal text-slate-500">
                                    La revisión diaria de la mañana se lo enviará
                                  </span>
                                </span>
                              )}
                              {p.completo && (
                                <span className="block text-[11px] text-slate-500">
                                  Completó la cadena
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 rounded-md bg-slate-50 p-2.5">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      ¿Han hablado?
                    </p>
                    <Pares pares={c.pares} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-1 font-head text-xl font-semibold text-slate-900">
          Cadenas avisadas que ya no están ({historicas.length})
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Qué pasó con las cadenas que se avisaron por correo y hoy ya no existen.
        </p>
        {historicas.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No hay cadenas avisadas en el pasado.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl2 border border-slate-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Aviso</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Personas (estado del anuncio)</th>
                  <th className="px-3 py-2">Resultado</th>
                  <th className="px-3 py-2">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {historicas.map((h) => (
                  <tr key={h.huella}>
                    <td className="px-3 py-2 text-xs text-slate-600">{fecha(h.avisadaEl)}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {TIPO[h.longitud] ?? h.longitud}
                      <div className="text-slate-500">{h.categoria}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {h.participantes.map((p, i) => (
                        <div key={i}>
                          <strong>{p.alias}</strong> · {p.municipio} ({p.estado})
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2">
                      <Etiqueta {...RESULTADO[h.resultado]} />
                    </td>
                    <td className="px-3 py-2">
                      <Etiqueta {...CONTACTO[h.contacto]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

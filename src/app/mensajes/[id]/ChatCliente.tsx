"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { enviarMensaje, type Mensaje } from "../actions";

/**
 * Cliente del chat. Mantiene el listado de mensajes en estado local
 * (con scroll al final tras cada nuevo) y envía mensajes mediante la
 * server action `enviarMensaje`. Después del envío refresca la página
 * para que el server vuelva a leer y se vean los datos consistentes.
 *
 * En una sesión futura podemos engancharlo a Supabase Realtime para
 * recibir mensajes nuevos sin recargar.
 */
export function ChatCliente({
  conversacionId,
  miUsuarioId,
  otroAlias,
  mensajesIniciales,
}: {
  conversacionId: string;
  miUsuarioId: string;
  otroAlias: string;
  mensajesIniciales: Mensaje[];
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(mensajesIniciales);
  const [borrador, setBorrador] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startEnviar] = useTransition();
  const finRef = useRef<HTMLDivElement | null>(null);

  // Sincronizar cuando el servidor nos pase mensajes nuevos (revalidatePath).
  useEffect(() => {
    setMensajes(mensajesIniciales);
  }, [mensajesIniciales]);

  // Auto-scroll al final al cargar y al añadir mensaje.
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes.length]);

  function enviar() {
    const texto = borrador.trim();
    if (texto.length === 0 || enviando) return;
    setError(null);

    // Optimistic UI: pintamos el mensaje al instante con un id temporal.
    const optimista: Mensaje = {
      id: `temp-${Date.now()}`,
      remitente_id: miUsuarioId,
      contenido: texto,
      creado_el: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, optimista]);
    setBorrador("");

    startEnviar(async () => {
      const r = await enviarMensaje(conversacionId, texto);
      if (!r.ok) {
        setError(r.mensaje);
        // Revertir el optimista.
        setMensajes((prev) => prev.filter((m) => m.id !== optimista.id));
        setBorrador(texto);
      }
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <section className="flex flex-1 flex-col rounded-xl2 border border-slate-200 bg-white shadow-card">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 md:px-6">
        {mensajes.length === 0 ? (
          <div className="my-12 text-center text-sm text-slate-500">
            <p>
              Esta es vuestra primera conversación con{" "}
              <strong className="text-slate-700">{otroAlias}</strong>.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Recuerda que tu identidad real solo se comparte si tú decides
              hacerlo dentro del chat.
            </p>
          </div>
        ) : (
          mensajes.map((m) => {
            const mio = m.remitente_id === miUsuarioId;
            return (
              <div
                key={m.id}
                className={"flex " + (mio ? "justify-end" : "justify-start")}
              >
                <div
                  className={
                    "max-w-[75%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-snug shadow-sm " +
                    (mio
                      ? "rounded-br-md bg-brand text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-800")
                  }
                >
                  {m.contenido}
                  <div
                    className={
                      "mt-1 text-[10px] " +
                      (mio ? "text-white/70" : "text-slate-400")
                    }
                  >
                    {new Date(m.creado_el).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={finRef} />
      </div>

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      <div className="border-t border-slate-200 bg-slate-50 px-3 py-3 md:px-4">
        <div className="flex items-end gap-2">
          <textarea
            value={borrador}
            onChange={(e) => setBorrador(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Escribe un mensaje…"
            rows={1}
            maxLength={2000}
            disabled={enviando}
            className="block max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-light focus:outline-none focus:ring-2 focus:ring-brand-light/20"
          />
          <button
            type="button"
            onClick={enviar}
            disabled={enviando || borrador.trim().length === 0}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {enviando ? "Enviando…" : "Enviar"}
          </button>
        </div>
        <p className="mt-1 text-[10.5px] text-slate-500">
          Pulsa Enter para enviar · Shift+Enter para añadir un salto de línea ·
          Máximo 2000 caracteres
        </p>
      </div>
    </section>
  );
}

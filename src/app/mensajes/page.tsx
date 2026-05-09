import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarMisConversaciones } from "./actions";
import { aliasMostrable } from "@/lib/alias";

export const metadata: Metadata = {
  title: "Mensajes",
  description: "Bandeja de mensajes de PermutaES.",
  robots: { index: false, follow: false },
};

function formatearFechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Esta funcion corre en el servidor (Vercel = UTC). Si dejamos
  // toLocaleTimeString sin timeZone, los mensajes de la bandeja
  // saldrian en UTC mientras que el chat (cliente) los formatea en
  // hora local del navegador → inconsistencia de 2h en CEST.
  // Forzamos Europe/Madrid en ambas vistas para que coincidan (99%
  // de usuarios estan en peninsula; Canarias verian 1h mas pero
  // consistente entre bandeja y chat).
  const TZ = "Europe/Madrid" as const;
  const fechaSpainStr = d.toLocaleDateString("es-ES", {
    timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
  });
  const ahoraSpainStr = new Date().toLocaleDateString("es-ES", {
    timeZone: TZ, year: "numeric", month: "numeric", day: "numeric",
  });
  const mismoDia = fechaSpainStr === ahoraSpainStr;
  if (mismoDia) {
    return d.toLocaleTimeString("es-ES", {
      timeZone: TZ, hour: "2-digit", minute: "2-digit",
    });
  }
  return d.toLocaleDateString("es-ES", {
    timeZone: TZ, day: "2-digit", month: "short",
  });
}

export default async function MensajesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/mensajes");
  }

  const conversaciones = await listarMisConversaciones();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
          Mensajes
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Conversaciones con otras personas con las que coincides en una posible
          permuta.
        </p>
      </header>

      {conversaciones.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-600 shadow-card">
          <p>Aún no tienes ninguna conversación.</p>
          <p className="mt-2 text-xs text-slate-500">
            Cuando encuentres una cadena en{" "}
            <a href="/auto-permutas" className="font-medium text-brand hover:text-brand-dark">
              Auto permutas
            </a>{" "}
            podrás contactar con los participantes desde aquí.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversaciones.map((c) => {
            // Aqui no tenemos contexto del anuncio (solo la lista de
            // conversaciones), asi que el helper sin contexto convierte
            // permutadoc_NNNN -> "Usuario PermutaDoc #NNNN". Mejor que
            // el alias raw.
            const aliasHumano = aliasMostrable(c.otro_alias);
            return (
            <li key={c.id}>
              <a
                href={`/mensajes/${c.id}`}
                className="flex items-start gap-3 rounded-xl2 border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-card-hover"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-bg font-semibold text-brand-text">
                  {aliasHumano.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-head font-semibold text-slate-900">
                      {aliasHumano}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-500">
                      {formatearFechaCorta(c.ultimo_mensaje_el)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {c.ultimo_mensaje_texto ?? (
                      <span className="italic text-slate-400">
                        Conversación recién creada — escribe el primer mensaje
                      </span>
                    )}
                  </p>
                </div>
                {c.no_leidos > 0 && (
                  <span className="shrink-0 self-center rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-white">
                    {c.no_leidos}
                  </span>
                )}
              </a>
            </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

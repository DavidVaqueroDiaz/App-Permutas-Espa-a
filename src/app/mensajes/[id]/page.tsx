import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { leerConversacion } from "../actions";
import { ChatCliente } from "./ChatCliente";
import { aliasMostrable } from "@/lib/alias";

export const metadata: Metadata = {
  title: "Conversación",
  robots: { index: false, follow: false },
};

export default async function ConversacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/mensajes/${id}`);
  }

  const detalle = await leerConversacion(id);
  if (!detalle) notFound();

  // Humanizamos el alias si viene del import de PermutaDoc (formato
  // permutadoc_NNNN). Si tenemos el contexto del anuncio del otro,
  // mostramos algo como "Maestros · Música · en Sobrado" en lugar de
  // "permutadoc_2622". Si el alias ya es humano, se respeta tal cual.
  const aliasHumano = aliasMostrable(detalle.otro_alias, {
    cuerpo: detalle.su_anuncio?.cuerpo_texto?.split("·")?.pop()?.trim() ?? null,
    especialidad: detalle.su_anuncio?.especialidad_texto?.split("·")?.pop()?.trim() ?? null,
    municipio: detalle.su_anuncio?.municipio ?? null,
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 md:px-6 md:py-10">
      <header className="mb-4 flex items-center gap-3">
        <a
          href="/mensajes"
          className="text-sm text-slate-600 hover:text-brand"
        >
          ← Bandeja
        </a>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-bg text-sm font-semibold text-brand-text">
            {aliasHumano.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-head text-sm font-semibold text-slate-900">
              {aliasHumano}
            </p>
            <p className="text-[11px] text-slate-500">
              Conversación de PermutaES
            </p>
          </div>
        </div>
      </header>

      {/* Contexto del anuncio que origino la conversacion. Sin esto,
          un usuario con varias conversaciones abiertas no sabia a cual
          pertenecia cada una. */}
      {detalle.su_anuncio && (
        <div className="mb-4 rounded-md border border-brand-mint/40 bg-brand-bg/30 p-3 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-text">
            Conversación sobre el anuncio de {aliasHumano}
          </p>
          <p className="mt-1 font-medium text-slate-900">
            {detalle.su_anuncio.cuerpo_texto}
            {detalle.su_anuncio.especialidad_texto && (
              <span className="font-normal text-slate-700">
                {" · "}
                {detalle.su_anuncio.especialidad_texto}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Plaza actual: <strong>{detalle.su_anuncio.municipio}</strong>
            {" · "}
            Estado: {detalle.su_anuncio.estado}
            {detalle.su_anuncio.estado === "activo" && (
              <>
                {" · "}
                <a
                  href={`/anuncios/${detalle.su_anuncio.id}`}
                  className="font-medium text-brand-text hover:text-brand"
                >
                  Ver anuncio →
                </a>
              </>
            )}
          </p>
        </div>
      )}

      <ChatCliente
        conversacionId={detalle.id}
        miUsuarioId={user.id}
        otroAlias={detalle.otro_alias}
        mensajesIniciales={detalle.mensajes}
      />
    </main>
  );
}

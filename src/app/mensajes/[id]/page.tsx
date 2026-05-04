import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { leerConversacion } from "../actions";
import { ChatCliente } from "./ChatCliente";

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
            {detalle.otro_alias.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-head text-sm font-semibold text-slate-900">
              {detalle.otro_alias}
            </p>
            <p className="text-[11px] text-slate-500">
              Conversación de PermutaES
            </p>
          </div>
        </div>
      </header>

      <ChatCliente
        conversacionId={detalle.id}
        miUsuarioId={user.id}
        otroAlias={detalle.otro_alias}
        mensajesIniciales={detalle.mensajes}
      />
    </main>
  );
}

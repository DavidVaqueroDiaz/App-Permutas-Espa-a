import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { detectarCadenasParaUsuarioActual } from "./actions";

export const metadata: Metadata = {
  title: "Auto permutas",
  description:
    "Descubre cadenas de permuta posibles que pasan por tus anuncios. Permutas directas y a 3 o 4 personas, detectadas automáticamente.",
  robots: { index: false, follow: false },
};

export default async function AutoPermutasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const r = await detectarCadenasParaUsuarioActual();

  if (!r.ok) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Auto permutas</h1>
        <p className="mt-4 text-sm text-red-700 dark:text-red-300">{r.mensaje}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
        Auto permutas
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        Cadenas de permuta posibles que detectamos automáticamente a partir de tus anuncios y los del resto de usuarios.
      </p>

      {r.totalAnunciosUsuario === 0 && (
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-100">
          <p className="font-medium">Aún no tienes anuncios publicados.</p>
          <p className="mt-1">
            Para que el sistema busque cadenas, primero{" "}
            <a href="/anuncios/nuevo" className="font-semibold underline">publica tu anuncio</a>.
          </p>
        </div>
      )}

      {r.totalAnunciosUsuario > 0 && r.cadenas.length === 0 && (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <p className="font-medium">Aún no hemos detectado cadenas.</p>
          <p className="mt-1">
            No hay otros anuncios compatibles con los tuyos en este momento. Te avisaremos por email en cuanto aparezca alguna coincidencia.
          </p>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Recuerda que la app aplica TODAS las reglas legales (mismo cuerpo, especialidad, ámbito territorial, antigüedad, edad, carencia entre permutas...). Cuanto más restrictivas sean tus plazas deseadas, menos coincidencias se encontrarán.
          </p>
        </div>
      )}

      {r.cadenas.length > 0 && (
        <ul className="mt-8 space-y-4">
          {r.cadenas.map((c) => (
            <li
              key={c.huella}
              className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {c.longitud === 2 ? "Permuta directa" : `Cadena a ${c.longitud}`}
                  </span>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Score: {c.score.toFixed(1)} / 100
                  </p>
                </div>
              </div>

              <ol className="mt-4 space-y-2">
                {c.participantes.map((p, i) => {
                  const siguiente =
                    c.participantes[(i + 1) % c.participantes.length];
                  return (
                    <li
                      key={p.anuncio_id}
                      className={
                        "rounded-md border p-3 text-sm " +
                        (p.es_mio
                          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20"
                          : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50")
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          {p.es_mio ? "TÚ" : p.alias_publico}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {p.cuerpo_texto}
                        </span>
                      </div>
                      <p className="mt-1">
                        Está en <strong>{p.municipio_actual_nombre}</strong> →
                        se iría a <strong>{siguiente.municipio_actual_nombre}</strong>
                      </p>
                      {p.especialidad_texto && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {p.especialidad_texto}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>

              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                Esta cadena cumple todas las reglas legales aplicables. Para tramitarla, cada participante debe presentar su solicitud a la administración correspondiente. La función de mensajería interna llegará en próximos bloques.
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

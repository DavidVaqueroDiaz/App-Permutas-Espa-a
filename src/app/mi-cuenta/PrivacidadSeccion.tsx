"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  exportarMisDatos,
  eliminarMiCuenta,
} from "./rgpd-actions";

/**
 * Seccion "Privacidad y mis datos" en /mi-cuenta. Implementa los
 * derechos del RGPD que un usuario tiene contra PermutaES:
 *
 *   - Derecho de acceso (art. 15) + portabilidad (art. 20):
 *     descarga JSON con todos sus datos.
 *
 *   - Derecho al olvido (art. 17):
 *     elimina la cuenta y todos los datos asociados (cascada en BD).
 */
export function PrivacidadSeccion() {
  const router = useRouter();
  const [exportando, startExportar] = useTransition();
  const [eliminando, startEliminar] = useTransition();

  const [errorExport, setErrorExport] = useState<string | null>(null);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);

  const [confirmando, setConfirmando] = useState(false);
  const [password, setPassword] = useState("");

  function descargarDatos() {
    setErrorExport(null);
    startExportar(async () => {
      const r = await exportarMisDatos();
      if (!r.ok) {
        setErrorExport(r.mensaje);
        return;
      }
      // Crea un Blob con el JSON y lo descarga via <a download>.
      const blob = new Blob([r.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  function eliminarCuenta() {
    if (password.length < 1) {
      setErrorBorrar("Tienes que escribir tu contraseña actual.");
      return;
    }
    setErrorBorrar(null);
    startEliminar(async () => {
      const r = await eliminarMiCuenta(password);
      if (!r.ok) {
        setErrorBorrar(r.mensaje);
        return;
      }
      // Cuenta eliminada: redirigimos a la home con un parametro para
      // mostrar un mensaje (la sesion ya fue cerrada en el server).
      router.push("/?cuenta_eliminada=1");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Estos son tus derechos del RGPD sobre tus datos en PermutaES.
        Puedes ejercerlos directamente desde aquí cuando quieras, sin
        tener que escribirnos.
      </p>

      {/* Exportar datos */}
      <div className="rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="font-medium text-slate-900">📥 Descargar mis datos</h3>
        <p className="mt-1 text-sm text-slate-600">
          Te generamos un archivo <code>.json</code> con todos los datos que
          guardamos sobre ti: tu perfil, tus anuncios, tus mensajes y
          conversaciones, los reportes que has hecho y las notificaciones
          que has recibido.
        </p>
        <button
          type="button"
          onClick={descargarDatos}
          disabled={exportando}
          className="mt-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {exportando ? "Generando…" : "Descargar mis datos (JSON)"}
        </button>
        {errorExport && (
          <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-800">
            {errorExport}
          </p>
        )}
      </div>

      {/* Eliminar cuenta */}
      <div className="rounded-xl2 border-2 border-red-200 bg-red-50/40 p-5">
        <h3 className="font-medium text-red-900">🗑 Eliminar mi cuenta</h3>
        <p className="mt-1 text-sm text-red-900/90">
          Borra tu cuenta y <strong>todos</strong> tus datos asociados de
          forma permanente: perfil, anuncios, mensajes, conversaciones,
          reportes. <strong>Esta acción no se puede deshacer.</strong>
        </p>
        <p className="mt-2 text-xs text-red-900/80">
          Si participas en alguna conversación, tus mensajes desaparecerán
          también del lado del otro participante. Si tienes anuncios
          incluidos en cadenas detectadas, esas cadenas dejarán de existir.
        </p>

        {!confirmando ? (
          <button
            type="button"
            onClick={() => setConfirmando(true)}
            className="mt-3 inline-flex items-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Quiero eliminar mi cuenta…
          </button>
        ) : (
          <div className="mt-3 space-y-2">
            <label className="block text-sm font-medium text-red-900">
              Confirma con tu contraseña actual:
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-300"
              placeholder="Tu contraseña"
            />
            {errorBorrar && (
              <p className="rounded-md bg-red-100 p-2 text-xs text-red-800">
                {errorBorrar}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={eliminarCuenta}
                disabled={eliminando || password.length === 0}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {eliminando ? "Eliminando…" : "Sí, eliminar mi cuenta para siempre"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmando(false);
                  setPassword("");
                  setErrorBorrar(null);
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

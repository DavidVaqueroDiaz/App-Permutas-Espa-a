"use client";

import { useSearchParams } from "next/navigation";

/**
 * Banner que se muestra en la home cuando el usuario acaba de eliminar
 * su cuenta (`/?cuenta_eliminada=1`). Vive como client component para
 * que la home siga siendo estatica con ISR — leer searchParams en el
 * server component fuerza render dinamico en cada request.
 */
export function BannerCuentaEliminada() {
  const sp = useSearchParams();
  if (sp.get("cuenta_eliminada") !== "1") return null;

  return (
    <div className="mb-6 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <p className="font-medium">Tu cuenta ha sido eliminada.</p>
      <p className="mt-1">
        Hemos borrado tu perfil y todos los datos asociados. Si quieres
        volver a usar PermutaES algún día, puedes registrarte de nuevo.
      </p>
    </div>
  );
}

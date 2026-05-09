import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Estado del servicio · PermutaES",
  description: "Estado actual de los componentes de PermutaES (BD, email, monitorización).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EstadoCheck = {
  nombre: string;
  estado: "ok" | "aviso" | "error";
  latencia_ms: number | null;
  detalle: string;
};

async function chequearSupabase(): Promise<EstadoCheck> {
  const t0 = Date.now();
  try {
    const supabase = await createClient();
    const { error, data } = await supabase
      .from("sectores")
      .select("codigo", { count: "exact", head: false })
      .limit(1);
    const latencia = Date.now() - t0;
    if (error) {
      return {
        nombre: "Base de datos (Supabase)",
        estado: "error",
        latencia_ms: latencia,
        detalle: `Error: ${error.message}`,
      };
    }
    if (!data || data.length === 0) {
      return {
        nombre: "Base de datos (Supabase)",
        estado: "aviso",
        latencia_ms: latencia,
        detalle: "Conecta pero no devuelve filas.",
      };
    }
    return {
      nombre: "Base de datos (Supabase)",
      estado: "ok",
      latencia_ms: latencia,
      detalle: `Conexión OK (${latencia} ms).`,
    };
  } catch (e) {
    return {
      nombre: "Base de datos (Supabase)",
      estado: "error",
      latencia_ms: null,
      detalle: `Excepción: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function chequearResend(): Promise<EstadoCheck> {
  // No mandamos email de verdad para no gastar cuota. Tampoco usamos
  // GET /domains o /api-keys porque requieren scopes especiales que la
  // mayoria de API keys de envio NO tienen (Resend separa por scope:
  // "sending" vs "full access"). En su lugar hacemos una llamada que
  // SOLO usa el scope de envio: POST /emails con un payload invalido a
  // proposito (sin destinatario). Resend devolvera:
  //   - 401 si la API key esta mal -> ERROR
  //   - 422 (Unprocessable) si la key es valida pero el payload falla
  //     -> OK (significa que la API responde y autentica nuestra key).
  //   - 200 ya seria muy raro porque no enviamos a nadie.
  if (!process.env.RESEND_API_KEY) {
    return {
      nombre: "Email (Resend)",
      estado: "aviso",
      latencia_ms: null,
      detalle: "RESEND_API_KEY no configurada.",
    };
  }
  const t0 = Date.now();
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // payload vacio a proposito
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const latencia = Date.now() - t0;
    // 401 = API key invalida -> error real.
    if (r.status === 401) {
      return {
        nombre: "Email (Resend)",
        estado: "error",
        latencia_ms: latencia,
        detalle: "API key rechazada (HTTP 401). Revisar RESEND_API_KEY.",
      };
    }
    // 422 = key OK, payload invalido -> es lo esperado en healthcheck.
    if (r.status === 422 || r.status === 400) {
      return {
        nombre: "Email (Resend)",
        estado: "ok",
        latencia_ms: latencia,
        detalle: `API key valida y endpoint responde (${latencia} ms).`,
      };
    }
    // 200 / 5xx / otros: estado inesperado.
    if (r.status >= 500) {
      return {
        nombre: "Email (Resend)",
        estado: "error",
        latencia_ms: latencia,
        detalle: `Resend devuelve ${r.status} (problema en su lado).`,
      };
    }
    return {
      nombre: "Email (Resend)",
      estado: "aviso",
      latencia_ms: latencia,
      detalle: `Respuesta HTTP ${r.status} (inesperada pero no critica).`,
    };
  } catch (e) {
    return {
      nombre: "Email (Resend)",
      estado: "error",
      latencia_ms: null,
      detalle: `Sin respuesta: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

function chequearSentry(): EstadoCheck {
  // Sentry solo se inicializa en produccion + con DSN. Aqui comprobamos
  // que la env var esta puesta. Estado real solo lo sabemos viendo el
  // panel de Sentry directamente.
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return {
      nombre: "Monitorización (Sentry)",
      estado: "aviso",
      latencia_ms: null,
      detalle: "NEXT_PUBLIC_SENTRY_DSN no configurado — no se reportarán errores.",
    };
  }
  return {
    nombre: "Monitorización (Sentry)",
    estado: "ok",
    latencia_ms: null,
    detalle: "Configurado. Estado real visible en sentry.io.",
  };
}

function chequearCron(): EstadoCheck {
  if (!process.env.CRON_SECRET) {
    return {
      nombre: "Cron de mantenimiento (Vercel)",
      estado: "aviso",
      latencia_ms: null,
      detalle: "CRON_SECRET no configurado — los recordatorios de caducidad no se ejecutan.",
    };
  }
  return {
    nombre: "Cron de mantenimiento (Vercel)",
    estado: "ok",
    latencia_ms: null,
    detalle: "Configurado. Próxima ejecución diaria a las 09:00 UTC.",
  };
}

export default async function StatusPage() {
  const [supabaseCheck, resendCheck] = await Promise.all([
    chequearSupabase(),
    chequearResend(),
  ]);
  const sentryCheck = chequearSentry();
  const cronCheck = chequearCron();

  const checks: EstadoCheck[] = [
    supabaseCheck,
    resendCheck,
    sentryCheck,
    cronCheck,
  ];
  const algunError = checks.some((c) => c.estado === "error");
  const algunAviso = checks.some((c) => c.estado === "aviso");
  const estadoGlobal: "ok" | "aviso" | "error" = algunError
    ? "error"
    : algunAviso
      ? "aviso"
      : "ok";

  const titularGlobal = {
    ok: "Todos los sistemas operativos",
    aviso: "Servicio operativo con avisos",
    error: "Hay un componente caído",
  }[estadoGlobal];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-head text-3xl font-semibold tracking-tight text-brand">
        Estado del servicio
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Verificación en tiempo real del estado de cada componente. Esta
        página se recarga en cada visita (sin caché).
      </p>

      {/* Banner global */}
      <div
        className={
          "mt-6 rounded-xl2 border-2 p-5 shadow-card " +
          (estadoGlobal === "ok"
            ? "border-brand bg-brand-bg"
            : estadoGlobal === "aviso"
              ? "border-warn-text/30 bg-warn-bg"
              : "border-red-300 bg-red-50")
        }
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-text">
          {estadoGlobal === "ok"
            ? "Operativo"
            : estadoGlobal === "aviso"
              ? "Avisos"
              : "Caída"}
        </p>
        <h2
          className={
            "mt-1 font-head text-xl font-semibold " +
            (estadoGlobal === "error" ? "text-red-700" : "text-brand")
          }
        >
          {titularGlobal}
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          Última comprobación: {new Date().toLocaleString("es-ES")}
        </p>
      </div>

      {/* Detalle por componente */}
      <ul className="mt-6 space-y-3">
        {checks.map((c) => (
          <li
            key={c.nombre}
            className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-card"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{c.nombre}</p>
                <p className="mt-0.5 text-sm text-slate-600">{c.detalle}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={
                    "rounded-full px-2.5 py-0.5 text-xs font-medium " +
                    (c.estado === "ok"
                      ? "bg-brand-bg text-brand-text"
                      : c.estado === "aviso"
                        ? "bg-warn-bg text-warn-text"
                        : "bg-red-100 text-red-800")
                  }
                >
                  {c.estado === "ok"
                    ? "OK"
                    : c.estado === "aviso"
                      ? "AVISO"
                      : "ERROR"}
                </span>
                {c.latencia_ms !== null && (
                  <span className="text-[10px] text-slate-500">
                    {c.latencia_ms} ms
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <p>
          ¿Algo no va bien y aquí sale OK? Si has detectado un problema que
          no aparece reflejado aquí, escribe a soporte y lo miramos. Esta
          página solo verifica conectividad básica con cada servicio, no
          puede detectar todas las clases de fallo (p. ej. emails que llegan
          a spam, queries lentas, etc.).
        </p>
      </div>
    </main>
  );
}

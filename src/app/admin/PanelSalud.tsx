import type { Metricas, ResumenCadenas, Tarea } from "@/lib/admin/panel";

type Nivel = "ok" | "aviso" | "error" | "info";

type Chequeo = { nivel: Nivel; titulo: string; detalle: string };

const HORAS_MAX_SIN_EJECUTAR = 26;

function fecha(iso: string | null | undefined, conHora = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return conHora
    ? d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" })
    : d.toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" });
}

function chequeoTarea(t: Tarea): Chequeo {
  const titulo = `Tarea diaria «${t.nombre}»`;
  if (!t.activa) return { nivel: "error", titulo, detalle: "Está desactivada." };
  if (!t.ultima) return { nivel: "info", titulo, detalle: "Aún no se ha ejecutado ninguna vez." };
  const horas = (Date.now() - new Date(t.ultima).getTime()) / 3_600_000;
  if (t.ultimo_estado !== "succeeded") {
    return { nivel: "error", titulo, detalle: `La última ejecución (${fecha(t.ultima, true)}) falló.` };
  }
  if (horas > HORAS_MAX_SIN_EJECUTAR) {
    return { nivel: "error", titulo, detalle: `No se ejecuta desde ${fecha(t.ultima, true)}.` };
  }
  return {
    nivel: t.fallos_7d > 0 ? "aviso" : "ok",
    titulo,
    detalle:
      `Última: ${fecha(t.ultima, true)}.` +
      (t.fallos_7d > 0 ? ` ${t.fallos_7d} fallos en 7 días.` : ""),
  };
}

export function construirChequeos(m: Metricas | null, r: ResumenCadenas): Chequeo[] {
  if (!m) return [{ nivel: "error", titulo: "Cifras generales", detalle: "No se han podido cargar." }];
  const lista: Chequeo[] = [];

  const correos = m.correos_30d ?? [];
  const fallidos = correos.reduce((n, c) => n + c.fallidos, 0);
  const enviados = correos.reduce((n, c) => n + c.enviados, 0);
  lista.push(
    fallidos > 0
      ? {
          nivel: "aviso",
          titulo: "Correos",
          detalle: `${fallidos} fallidos y ${enviados} enviados en 30 días. Último fallo (${m.ultimo_fallo_correo?.tipo ?? "?"}, ${fecha(m.ultimo_fallo_correo?.fecha, true)}): ${m.ultimo_fallo_correo?.error ?? "sin detalle"}.`,
        }
      : {
          nivel: enviados > 0 ? "ok" : "info",
          titulo: "Correos",
          detalle:
            enviados > 0
              ? `${enviados} enviados en 30 días, ninguno fallido.`
              : "Aún no hay correos registrados (el registro empezó el 17/09/2026).",
        },
  );

  lista.push(
    m.recordatorios_atrasados === undefined
      ? { nivel: "info", titulo: "Recordatorios de caducidad", detalle: "Sin datos." }
      : m.recordatorios_atrasados > 0
        ? {
            nivel: "error",
            titulo: "Recordatorios de caducidad",
            detalle: `${m.recordatorios_atrasados} anuncios deberían tener ya su aviso de caducidad y no lo tienen: la tarea diaria de Vercel no está funcionando o los correos fallan.`,
          }
        : {
            nivel: "ok",
            titulo: "Recordatorios de caducidad",
            detalle: `Al día. ${m.anuncios.caducan_30d} anuncios caducan en los próximos 30 días; ${m.recordatorios_caducidad.total} avisos enviados en total.`,
          },
  );

  lista.push(
    m.anuncios.vencidos_sin_marcar > 0
      ? {
          nivel: "error",
          titulo: "Anuncios vencidos",
          detalle: `${m.anuncios.vencidos_sin_marcar} anuncios pasaron su fecha y siguen como activos.`,
        }
      : { nivel: "ok", titulo: "Anuncios vencidos", detalle: "Ninguno pendiente de cerrar." },
  );

  lista.push(
    m.anuncios_plazas_incompletas > 0
      ? {
          nivel: "aviso",
          titulo: "Municipios deseados",
          detalle: `${m.anuncios_plazas_incompletas} anuncios tienen menos municipios de los que eligieron (comunidad o provincia entera).`,
        }
      : { nivel: "ok", titulo: "Municipios deseados", detalle: "Todos los anuncios tienen su lista completa." },
  );

  lista.push(
    r.sinAviso > 0
      ? {
          nivel: "aviso",
          titulo: "Avisos de cadena",
          detalle: `${r.sinAviso} cadenas tienen a alguien sin aviso todavía. La revisión diaria de la mañana se lo envía; si sigue igual al día siguiente, algo falla (mira «Correos»).`,
        }
      : {
          nivel: "ok",
          titulo: "Avisos de cadena",
          detalle: `Todas las personas de las cadenas actuales tienen su aviso (${m.avisos_cadena.total} enviados en total).`,
        },
  );

  if (m.reportes_pendientes > 0) {
    lista.push({
      nivel: "aviso",
      titulo: "Reportes",
      detalle: `${m.reportes_pendientes} reportes de anuncios sin revisar.`,
    });
  }

  for (const t of m.tareas ?? []) lista.push(chequeoTarea(t));

  lista.push({
    nivel: "info",
    titulo: "Demos del modo demostración",
    detalle: `${m.demos_sinteticos_activos} anuncios de demostración activos (se borran solos a las 24 h y no cuentan en las cadenas reales).`,
  });
  return lista;
}

const ESTILO: Record<Nivel, { caja: string; icono: string; texto: string }> = {
  ok: { caja: "border-brand-mint/40 bg-brand-bg/40", icono: "✓", texto: "text-brand-text" },
  aviso: { caja: "border-warn-text/30 bg-warn-bg", icono: "!", texto: "text-warn-text" },
  error: { caja: "border-red-300 bg-red-50", icono: "✕", texto: "text-red-700" },
  info: { caja: "border-slate-200 bg-white", icono: "i", texto: "text-slate-600" },
};

export function PanelSalud({
  metricas: m,
  resumen: r,
}: {
  metricas: Metricas | null;
  resumen: ResumenCadenas;
}) {
  const chequeos = construirChequeos(m, r);
  const problemas = chequeos.filter((c) => c.nivel === "error").length;
  const avisos = chequeos.filter((c) => c.nivel === "aviso").length;

  return (
    <section className="mb-10">
      <h2 className="mb-1 font-head text-xl font-semibold text-slate-900">¿Está funcionando?</h2>
      <p className="mb-4 text-sm text-slate-600">
        {problemas > 0
          ? `Hay ${problemas} ${problemas === 1 ? "problema" : "problemas"} que revisar.`
          : avisos > 0
            ? `Todo funciona, con ${avisos} ${avisos === 1 ? "aviso" : "avisos"}.`
            : "Todo funciona."}
      </p>

      <ul className="mb-6 grid gap-2 md:grid-cols-2">
        {chequeos.map((c, i) => {
          const e = ESTILO[c.nivel];
          return (
            <li key={i} className={`flex gap-3 rounded-lg border p-3 ${e.caja}`}>
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${e.texto}`}
              >
                {e.icono}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${e.texto}`}>{c.titulo}</p>
                <p className="text-xs text-slate-700">{c.detalle}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {m && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Cifra
            titulo="Usuarios"
            valor={m.usuarios.total}
            lineas={[
              `${m.usuarios.confirmados} con el correo confirmado`,
              `${m.usuarios.nuevos_7d} nuevos en 7 días · ${m.usuarios.nuevos_30d} en 30`,
              `${m.usuarios.entraron_30d} entraron en los últimos 30 días`,
            ]}
          />
          <Cifra
            titulo="Anuncios activos"
            valor={m.anuncios.activos}
            lineas={[
              `${m.anuncios.nuevos_7d} nuevos en 7 días · ${m.anuncios.nuevos_30d} en 30`,
              `${m.anuncios.caducan_30d} caducan en 30 días · ${m.anuncios.caducados} caducados`,
              `${m.anuncios.renovados} renovados alguna vez`,
            ]}
          />
          <Cifra
            titulo="Cadenas ahora"
            valor={r.total}
            destacado={r.total > 0}
            lineas={[
              `${r.directas} directas · ${r.aTres} a 3 · ${r.aCuatro} a 4`,
              `${r.personas} personas en alguna cadena`,
              `${r.hablan} con conversación de ida y vuelta`,
            ]}
          />
          <Cifra
            titulo="Permutas conseguidas"
            valor={m.anuncios.permutados}
            destacado={m.anuncios.permutados > 0}
            lineas={[
              m.anuncios.ultima_permuta
                ? `Última: ${fecha(m.anuncios.ultima_permuta)}`
                : "Ninguna marcada todavía",
              `${m.anuncios.eliminados} anuncios eliminados`,
            ]}
          />
          <Cifra
            titulo="Conversaciones"
            valor={m.conversaciones.total}
            lineas={[
              `${m.conversaciones.con_respuesta} con respuesta`,
              `${m.conversaciones.solo_uno} sin contestar`,
              `${m.conversaciones.sin_mensajes} abiertas sin mensajes`,
            ]}
          />
          <Cifra
            titulo="Mensajes"
            valor={m.mensajes.total}
            lineas={[
              `${m.mensajes.ultimos_7d} en 7 días`,
              `${m.mensajes.ultimos_30d} en 30 días`,
            ]}
          />
          <Cifra
            titulo="Avisos de cadena"
            valor={m.avisos_cadena.total}
            lineas={[
              `${m.avisos_cadena.ultimos_30d} en 30 días`,
              `Último: ${fecha(m.avisos_cadena.ultimo)}`,
            ]}
          />
          <Cifra
            titulo="Con anuncio activo"
            valor={m.usuarios.con_anuncio_activo}
            lineas={[
              m.usuarios.total > 0
                ? `${Math.round((m.usuarios.con_anuncio_activo / m.usuarios.total) * 100)}% de los usuarios`
                : "—",
            ]}
          />
        </div>
      )}
    </section>
  );
}

function Cifra({
  titulo,
  valor,
  lineas,
  destacado,
}: {
  titulo: string;
  valor: number;
  lineas: string[];
  destacado?: boolean;
}) {
  return (
    <div
      className={
        "rounded-xl2 border p-4 shadow-card " +
        (destacado ? "border-brand bg-brand-bg" : "border-slate-200 bg-white")
      }
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 font-head text-2xl font-semibold text-brand">
        {valor.toLocaleString("es-ES")}
      </p>
      <ul className="mt-1 space-y-0.5 text-[11px] leading-snug text-slate-600">
        {lineas.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

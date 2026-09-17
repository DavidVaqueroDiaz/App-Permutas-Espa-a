/**
 * Comprobacion SOLO LECTURA, con el codigo real de la web y los datos de
 * produccion. No envia correos ni escribe nada.
 *
 *   npx tsx scripts/verificar-avisos-y-panel.ts
 *
 *  1. Revision diaria de avisos en modo simulacion: que avisos faltan.
 *  2. Datos del panel de admin: cifras, cadenas, contacto, historico.
 *  3. "Mis cadenas" de cada persona que esta en una cadena: que la ve,
 *     que aparece ella primero y que cuadra con el panel.
 * No imprime emails ni alias; los identificadores salen recortados.
 */
import fs from "node:fs";
import path from "node:path";

for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const corto = (s: string) => s.slice(0, 8);
let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = "") {
  console.log(`  ${ok ? "OK " : "KO "} ${nombre}${detalle ? ` (${detalle})` : ""}`);
  if (!ok) fallos++;
}

async function main() {
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { revisarAvisosPendientes } = await import("../src/lib/cadenas/notificar");
  const { cargarDatosPanel } = await import("../src/lib/admin/panel");
  const { detallarCadenasDeUsuario, cadenasDeUsuario } = await import("../src/lib/cadenas/mis-cadenas");
  const { idsDeHuella } = await import("../src/lib/matching");
  const sb = createAdminClient();

  console.log("1) Revision diaria de avisos (simulacion, no envia nada)");
  const sim = await revisarAvisosPendientes({ simular: true, cliente: sb });
  comprobar("la simulacion no envia ni falla", sim.enviados === 0 && sim.fallidos === 0);
  console.log(`  cadenas revisadas: ${sim.cadenas} | avisos que faltan: ${sim.pendientes.length}`);

  console.log("\n2) Datos del panel de admin");
  const panel = await cargarDatosPanel(sb);
  comprobar("el panel carga sin errores", panel.errores.length === 0, panel.errores.join(" / "));
  comprobar("hay cifras generales", !!panel.metricas);
  comprobar("mismas cadenas en panel y revision", panel.cadenas.length === sim.cadenas, `${panel.cadenas.length} vs ${sim.cadenas}`);
  const sinAvisoPanel = panel.cadenas.reduce(
    (n, c) => n + new Set(c.participantes.filter((p) => !p.avisadoEl).map((p) => p.usuarioId)).size,
    0,
  );
  comprobar("mismos avisos pendientes en panel y revision", sinAvisoPanel === sim.pendientes.length, `${sinAvisoPanel} vs ${sim.pendientes.length}`);
  const m = panel.metricas;
  if (m) {
    console.log(`  usuarios ${m.usuarios.total} · anuncios activos ${m.anuncios.activos} · conversaciones ${m.conversaciones.total} · avisos ${m.avisos_cadena.total} · recordatorios atrasados ${m.recordatorios_atrasados} · zonas incompletas ${m.anuncios_plazas_incompletas}`);
    console.log(`  tareas: ${m.tareas.map((t) => `${t.nombre}=${t.ultimo_estado ?? "sin ejecutar"}`).join(", ")}`);
  }
  console.log(`  resumen: ${JSON.stringify(panel.resumen)}`);
  for (const c of panel.cadenas) {
    const pend = c.participantes.filter((p) => !p.avisadoEl);
    console.log(
      `  cadena ${c.longitud} · ${c.contacto} · pares con chat ${c.pares.length} · ` +
        `sin aviso: ${pend.map((p) => `${corto(p.usuarioId)}${p.completo ? "(la completo)" : ""}`).join(", ") || "nadie"}`,
    );
  }
  const porResultado = new Map<string, number>();
  for (const h of panel.historicas) {
    const k = `${h.resultado}/${h.contacto}`;
    porResultado.set(k, (porResultado.get(k) ?? 0) + 1);
  }
  console.log(`  cadenas avisadas que ya no estan: ${panel.historicas.length} -> ${JSON.stringify(Object.fromEntries(porResultado))}`);
  for (const h of panel.historicas) {
    comprobar(`historica ${corto(h.huella)} con IDs legibles`, idsDeHuella(h.huella).length === h.longitud);
  }

  console.log("\n3) Mis cadenas de cada participante");
  const usuarios = new Set(panel.cadenas.flatMap((c) => c.participantes.map((p) => p.usuarioId)));
  for (const u of usuarios) {
    const esperadas = panel.cadenas.filter((c) => c.participantes.some((p) => p.usuarioId === u));
    const grupos = await detallarCadenasDeUsuario(sb, u);
    const vistas = grupos.flatMap((g) => g.cadenas);
    const contadas = (await cadenasDeUsuario(sb, u)).reduce((n, g) => n + g.cadenas.length, 0);
    comprobar(`${corto(u)} ve sus ${esperadas.length} cadenas`, vistas.length === esperadas.length, `ve ${vistas.length}`);
    comprobar(`${corto(u)} el contador de Mi cuenta cuadra`, contadas === esperadas.length);
    comprobar(
      `${corto(u)} aparece primero y puede contactar a los demas`,
      vistas.every(
        (c) =>
          c.participantes[0].es_perfil_busqueda &&
          c.participantes.slice(1).every((p) => p.contacto_disponible && !p.es_perfil_busqueda),
      ),
    );
    comprobar(
      `${corto(u)} el recorrido cierra el ciclo`,
      vistas.every((c) =>
        c.participantes.every(
          (p, i) => p.municipio_destino_nombre === c.participantes[(i + 1) % c.participantes.length].municipio_actual_nombre,
        ),
      ),
    );
  }

  console.log(`\n${fallos === 0 ? "TODO CORRECTO" : fallos + " COMPROBACIONES FALLIDAS"}`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

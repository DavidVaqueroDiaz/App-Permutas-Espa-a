/**
 * Marca como "ya avisados", SIN enviar correo, los avisos pendientes de
 * las cadenas que ya existian antes de la revision de septiembre de 2026
 * (sus participantes ya se conocian y hablaban). La fecha que se guarda
 * es la de cuando se formo la cadena, que es cuando esa persona la vio
 * en su pantalla al publicar. Decision de Vaquero (17/09/2026).
 *
 *   npx tsx scripts/marcar-avisos-antiguos.ts --probar | --aplicar
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const modo = process.argv[2];
if (modo !== "--probar" && modo !== "--aplicar") {
  console.error("Uso: npx tsx scripts/marcar-avisos-antiguos.ts --probar | --aplicar");
  process.exit(1);
}

async function main() {
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { revisarAvisosPendientes } = await import("../src/lib/cadenas/notificar");
  const { cargarDatosPanel } = await import("../src/lib/admin/panel");
  const sb = createAdminClient();

  const sim = await revisarAvisosPendientes({ simular: true, cliente: sb });
  const panel = await cargarDatosPanel(sb);
  const formada = new Map(panel.cadenas.map((c) => [c.huella, c.formadaEl]));
  const filas = sim.pendientes.map((clave) => {
    const [huella, usuario] = clave.split("|");
    return { huella, usuario, fecha: formada.get(huella) ?? new Date().toISOString() };
  });
  console.log(`Avisos pendientes a marcar sin enviar: ${filas.length}`);
  for (const f of filas) console.log(`  usuario ${f.usuario.slice(0, 8)} · cadena formada ${f.fecha.slice(0, 10)}`);

  const db = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  let ok = false;
  try {
    await db.query("begin");
    let insertadas = 0;
    for (const f of filas) {
      const r = await db.query(
        `insert into public.cadenas_notificadas (usuario_id, cadena_huella, notificada_el)
         values ($1, $2, $3) on conflict (usuario_id, cadena_huella) do nothing`,
        [f.usuario, f.huella, f.fecha],
      );
      insertadas += r.rowCount ?? 0;
    }
    ok = insertadas === filas.length;
    console.log(`Filas insertadas: ${insertadas}`);
    if (modo === "--aplicar" && ok) {
      await db.query("commit");
      console.log("APLICADO (COMMIT).");
    } else {
      await db.query("rollback");
      console.log("ROLLBACK: no se ha cambiado nada.");
    }
  } catch (e) {
    await db.query("rollback").catch(() => {});
    console.error("ERROR -> ROLLBACK:", (e as Error).message);
  } finally {
    await db.end();
  }

  if (modo === "--aplicar" && ok) {
    const despues = await revisarAvisosPendientes({ simular: true, cliente: sb });
    console.log(`Avisos pendientes despues: ${despues.pendientes.length}`);
    ok = despues.pendientes.length === 0;
  }
  process.exit(ok ? 0 : 1);
}

main();

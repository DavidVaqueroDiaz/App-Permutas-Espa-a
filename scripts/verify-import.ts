import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
  const c = new Client({
    user: process.env.SUPABASE_DB_USER!,
    password: process.env.SUPABASE_DB_PASSWORD!,
    host: process.env.SUPABASE_DB_HOST!,
    port: Number.parseInt(process.env.SUPABASE_DB_PORT!, 10),
    database: process.env.SUPABASE_DB_NAME!,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  console.log("Anuncios activos:", (await c.query("select count(*)::int as n from public.anuncios where estado='activo'")).rows[0].n);
  console.log("Test users:", (await c.query("select count(*)::int as n from auth.users where email like '%@permutaes.test'")).rows[0].n);
  console.log("Perfiles:", (await c.query("select count(*)::int as n from public.perfiles_usuario")).rows[0].n);
  const r = await c.query(`
    select e.codigo_oficial, e.denominacion, count(*) as n
    from public.anuncios a
    left join public.especialidades e on e.id = a.especialidad_id
    where a.estado='activo'
    group by e.codigo_oficial, e.denominacion
    having count(*) > 1
    order by n desc
    limit 20
  `);
  console.log("\nEspecialidades con >1 anuncio (potenciales matches):");
  for (const row of r.rows) {
    console.log(`  ${row.codigo_oficial ?? "—"} ${row.denominacion ?? "sin especialidad"}: ${row.n}`);
  }
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });

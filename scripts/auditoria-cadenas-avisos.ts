// @ts-nocheck -- herramienta de diagnostico suelta (filas de pg sin tipar)
/**
 * Diagnostico SOLO LECTURA de PermutaES (matching + avisos).
 * No escribe nada. No imprime emails ni alias de usuarios reales.
 *
 * Uso, desde la raiz del proyecto:
 *   npx tsx scripts/auditoria-cadenas-avisos.ts
 *
 * Recalcula todas las cadenas con el mismo motor de la web y las cruza
 * con los avisos registrados en `cadenas_notificadas`.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROJ = process.cwd(); // ejecutar desde la raiz del proyecto: npx tsx scripts/auditoria-cadenas-avisos.ts
const require = createRequire(path.join(PROJ, "package.json"));
const { Client } = require("pg");

for (const line of fs.readFileSync(path.join(PROJ, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

type AnuncioMatching = {
  id: string; usuario_id: string; sector_codigo: string; cuerpo_id: string;
  especialidad_id: string | null; municipio_actual_codigo: string; ccaa_codigo: string;
  servicio_salud_codigo: string | null; fecha_toma_posesion_definitiva: string;
  anyos_servicio_totales: number; permuta_anterior_fecha: string | null;
  ano_nacimiento: number; alias_publico: string; plazas_deseadas: Set<string>;
};

const corto = (id: string) => id.slice(0, 8);

async function main() {
  const { detectarCadenas } = await import(
    pathToFileURL(path.join(PROJ, "src/lib/matching.ts")).href
  );

  const db = new Client({
    host: process.env.SUPABASE_DB_HOST,
    port: Number(process.env.SUPABASE_DB_PORT ?? 5432),
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SUPABASE_DB_NAME ?? "postgres",
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  await db.query("set default_transaction_read_only = on");
  await db.query("begin read only");

  const q = async (sql: string, p: unknown[] = []) => (await db.query(sql, p)).rows;

  // Clasificacion de cada usuario: real / importado (.test) / sintetico (.invalid)
  const TIPO_USUARIO = `
    case
      when u.email like '%@permutaes.test' then 'importado_test'
      when u.email like '%@permutaes.invalid' then 'demo_sintetico'
      when u.email like '%@permutaes-demo.local' or u.email like 'demo+%' then 'demo_base'
      when u.email is null then 'sin_usuario'
      else 'real'
    end`;

  console.log("=== A. ANUNCIOS POR ESTADO / es_demo / TIPO DE USUARIO ===");
  console.table(await q(`
    select a.estado, a.es_demo, ${TIPO_USUARIO} as tipo_usuario, count(*)::int as n
    from public.anuncios a left join auth.users u on u.id = a.usuario_id
    group by 1,2,3 order by 1,2,3`));

  console.log("=== B. USUARIOS REALES ===");
  console.table(await q(`
    select ${TIPO_USUARIO} as tipo_usuario,
           count(*)::int as usuarios,
           count(*) filter (where u.email_confirmed_at is not null)::int as confirmados
    from auth.users u group by 1 order by 1`));

  console.log("=== C. CADUCIDAD DE ANUNCIOS ACTIVOS (no demo) POR MES ===");
  console.table(await q(`
    select to_char(date_trunc('month', a.caduca_el at time zone 'Europe/Madrid'), 'YYYY-MM') as mes_caduca,
           ${TIPO_USUARIO} as tipo_usuario, count(*)::int as n
    from public.anuncios a left join auth.users u on u.id = a.usuario_id
    where a.estado = 'activo' and not a.es_demo
    group by 1,2 order by 1,2`));
  console.table(await q(`
    select count(*) filter (where a.caduca_el < now())::int as activos_ya_vencidos,
           to_char(min(a.caduca_el) at time zone 'Europe/Madrid', 'YYYY-MM-DD') as primera_caducidad,
           count(*) filter (where a.actualizado_el > a.creado_el + interval '1 minute')::int as editados_alguna_vez,
           count(*) filter (where a.caduca_el > a.creado_el + interval '6 months 1 day')::int as con_caducidad_ampliada
    from public.anuncios a
    where a.estado = 'activo' and not a.es_demo`));

  console.log("=== D. TRIGGERS EN public.anuncios (¿alguno renueva caduca_el?) ===");
  console.table(await q(`
    select t.tgname, pg_get_triggerdef(t.oid) as def
    from pg_trigger t
    where t.tgrelid = 'public.anuncios'::regclass and not t.tgisinternal`));
  console.table(await q(`
    select p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosrc ilike '%caduca_el%'`));

  console.log("=== E. FUNCION tomar_email_para_notificar_cadena EN VIVO ===");
  const fe = await q(`
    select p.prosrc,
      has_function_privilege('authenticated', p.oid, 'execute') as authenticated_puede,
      has_function_privilege('anon', p.oid, 'execute') as anon_puede
    from pg_proc p where p.proname = 'tomar_email_para_notificar_cadena'`);
  for (const r of fe) {
    console.log("authenticated puede ejecutar:", r.authenticated_puede, "| anon:", r.anon_puede);
    console.log("excluye @permutaes.invalid:", String(r.prosrc).includes("permutaes.invalid"));
    console.log("comprueba que quien llama participa en la cadena:",
      /anuncios/i.test(String(r.prosrc)));
  }

  console.log("=== F. PLAZAS DESEADAS: anuncios activos con > 1000 y truncados ===");
  console.table(await q(`
    with c as (
      select a.id, a.es_demo, ${TIPO_USUARIO} as tipo_usuario,
             (select count(*) from public.anuncio_plazas_deseadas p where p.anuncio_id = a.id) as n
      from public.anuncios a left join auth.users u on u.id = a.usuario_id
      where a.estado = 'activo')
    select tipo_usuario, es_demo, count(*)::int as anuncios,
           count(*) filter (where n > 1000)::int as con_mas_de_1000,
           count(*) filter (where n = 1000)::int as con_exactamente_1000,
           max(n)::int as max_plazas
    from c group by 1,2 order by 1,2`));

  // Esperado segun atajos (ccaa/provincia expandidos + sueltos - municipio actual)
  const trunc = await q(`
    with at as (
      select a.id as anuncio_id, a.municipio_actual_codigo, t.tipo, t.valor
      from public.anuncios a join public.anuncio_atajos t on t.anuncio_id = a.id
      where a.estado = 'activo'),
    esperado as (
      select x.anuncio_id, count(distinct x.cod)::int as n_esperado from (
        select at.anuncio_id, m.codigo_ine as cod, at.municipio_actual_codigo
          from at join public.provincias pr on at.tipo = 'ccaa' and pr.ccaa_codigo = at.valor
                  join public.municipios m on m.provincia_codigo = pr.codigo_ine
        union all
        select at.anuncio_id, m.codigo_ine, at.municipio_actual_codigo
          from at join public.municipios m on at.tipo = 'provincia' and m.provincia_codigo = at.valor
        union all
        select at.anuncio_id, at.valor, at.municipio_actual_codigo
          from at where at.tipo = 'municipio_individual'
      ) x where x.cod <> x.municipio_actual_codigo
      group by x.anuncio_id),
    real_ as (
      select p.anuncio_id, count(*)::int as n_real
      from public.anuncio_plazas_deseadas p group by 1)
    select e.anuncio_id, e.n_esperado, coalesce(r.n_real, 0) as n_real
    from esperado e left join real_ r on r.anuncio_id = e.anuncio_id
    where coalesce(r.n_real, 0) < e.n_esperado`);
  console.log(`Anuncios activos con MENOS plazas de las que marcan sus atajos: ${trunc.length}`);
  for (const t of trunc.slice(0, 20)) {
    console.log(`  ${corto(t.anuncio_id)}: esperado ${t.n_esperado}, guardado ${t.n_real}`);
  }

  console.log("=== G. AVISOS DE CADENA REGISTRADOS (cadenas_notificadas) ===");
  console.table(await q(`
    select ${TIPO_USUARIO} as tipo_destinatario, count(*)::int as filas,
           to_char(min(c.notificada_el) at time zone 'Europe/Madrid', 'YYYY-MM-DD') as primera,
           to_char(max(c.notificada_el) at time zone 'Europe/Madrid', 'YYYY-MM-DD') as ultima
    from public.cadenas_notificadas c left join auth.users u on u.id = c.usuario_id
    group by 1 order by 1`));

  console.log("=== H. CRONS DE LA BASE DE DATOS ===");
  try {
    console.table(await q(`select jobid, jobname, schedule, active from cron.job order by jobid`));
    console.table(await q(`
      select j.jobname, d.status, count(*)::int as ejecuciones,
             to_char(max(d.start_time) at time zone 'Europe/Madrid', 'YYYY-MM-DD HH24:MI') as ultima
      from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      where d.start_time > now() - interval '30 days'
      group by 1,2 order by 1,2`));
  } catch (e) {
    console.log("(no pude leer cron.*):", (e as Error).message);
  }

  console.log("=== I. ANUNCIOS ACTIVOS CUYO DUEÑO NO SALE EN perfiles_publicos ===");
  console.table(await q(`
    select ${TIPO_USUARIO} as tipo_usuario, count(*)::int as n
    from public.anuncios a left join auth.users u on u.id = a.usuario_id
    where a.estado = 'activo'
      and not exists (select 1 from public.perfiles_publicos pp where pp.id = a.usuario_id)
    group by 1`));

  console.log("=== J. TAMAÑO MAXIMO DE UN GRUPO (sector+cuerpo+especialidad) ===");
  console.table(await q(`
    select count(*)::int as anuncios_activos_en_grupo,
           count(*) filter (where not a.es_demo)::int as sin_demos,
           count(distinct a.usuario_id)::int as usuarios
    from public.anuncios a where a.estado = 'activo'
    group by a.sector_codigo, a.cuerpo_id, a.especialidad_id
    order by 1 desc limit 5`));

  // ------------------------------------------------------------------
  // K. RECALCULO COMPLETO DE CADENAS Y CRUCE CON LOS AVISOS
  // ------------------------------------------------------------------
  console.log("=== K. CADENAS REALES vs AVISOS ENVIADOS ===");
  const anuncios = await q(`
    select a.id, a.usuario_id, a.sector_codigo, a.cuerpo_id, a.especialidad_id,
           a.municipio_actual_codigo, a.ccaa_codigo, a.servicio_salud_codigo,
           a.fecha_toma_posesion_definitiva::text as fecha_toma_posesion_definitiva,
           a.anyos_servicio_totales, a.permuta_anterior_fecha::text as permuta_anterior_fecha,
           a.es_demo, greatest(a.creado_el, a.actualizado_el) as tocado_el,
           ${TIPO_USUARIO} as tipo_usuario,
           pp.ano_nacimiento, pp.alias_publico
    from public.anuncios a
    left join auth.users u on u.id = a.usuario_id
    join public.perfiles_publicos pp on pp.id = a.usuario_id
    where a.estado = 'activo'`);
  const plazas = await q(`
    select p.anuncio_id, p.municipio_codigo
    from public.anuncio_plazas_deseadas p
    join public.anuncios a on a.id = p.anuncio_id and a.estado = 'activo'`);
  const plazasPor = new Map<string, Set<string>>();
  for (const p of plazas) {
    const s = plazasPor.get(p.anuncio_id) ?? new Set<string>();
    s.add(String(p.municipio_codigo).trim());
    plazasPor.set(p.anuncio_id, s);
  }
  const notif = await q(`select usuario_id, cadena_huella from public.cadenas_notificadas`);
  const notifSet = new Set(notif.map((n) => `${n.usuario_id}|${n.cadena_huella}`));

  const info = new Map<string, (typeof anuncios)[number]>();
  const grupos = new Map<string, AnuncioMatching[]>();
  for (const a of anuncios) {
    info.set(a.id, a);
    const m: AnuncioMatching = {
      id: a.id, usuario_id: a.usuario_id, sector_codigo: a.sector_codigo,
      cuerpo_id: a.cuerpo_id, especialidad_id: a.especialidad_id,
      municipio_actual_codigo: String(a.municipio_actual_codigo).trim(),
      ccaa_codigo: String(a.ccaa_codigo).trim(),
      servicio_salud_codigo: a.servicio_salud_codigo,
      fecha_toma_posesion_definitiva: a.fecha_toma_posesion_definitiva,
      anyos_servicio_totales: a.anyos_servicio_totales,
      permuta_anterior_fecha: a.permuta_anterior_fecha,
      ano_nacimiento: a.ano_nacimiento, alias_publico: a.alias_publico,
      plazas_deseadas: plazasPor.get(a.id) ?? new Set(),
    };
    const k = `${a.sector_codigo}|${a.cuerpo_id}|${a.especialidad_id ?? ""}`;
    const g = grupos.get(k) ?? [];
    g.push(m);
    grupos.set(k, g);
  }

  let cadenasConReal = 0;
  let cadenasSoloReales = 0;
  let cadenasRealConDemo = 0;
  let cadenasRealConImportado = 0;
  const faltas: string[] = [];
  const falsasAlarmas: string[] = [];
  for (const g of grupos.values()) {
    const origen = g.filter((x) => info.get(x.id)!.tipo_usuario === "real");
    if (origen.length === 0) continue;
    const cadenas = detectarCadenas(g, origen);
    for (const c of cadenas) {
      const part = c.anuncios.map((id: string) => info.get(id)!);
      const reales = part.filter((p) => p.tipo_usuario === "real");
      if (reales.length === 0) continue;
      cadenasConReal++;
      const hayDemo = part.some((p) => p.es_demo || p.tipo_usuario === "demo_sintetico");
      const hayImportado = part.some((p) => p.tipo_usuario === "importado_test");
      if (hayDemo) cadenasRealConDemo++;
      if (hayImportado) cadenasRealConImportado++;
      if (!hayDemo && !hayImportado) cadenasSoloReales++;

      // ¿Quien disparo la cadena? El anuncio tocado mas tarde.
      const ultimo = [...part].sort((x, y) => +new Date(y.tocado_el) - +new Date(x.tocado_el))[0];
      const sinAviso = reales.filter(
        (p) => p.usuario_id !== ultimo.usuario_id && !notifSet.has(`${p.usuario_id}|${c.huella}`),
      );
      const resumen = `longitud ${c.longitud} · anuncios ${part.map((p) => `${corto(p.id)}(${p.tipo_usuario}${p.es_demo ? ",demo" : ""})`).join(" -> ")}`;
      if (sinAviso.length > 0) {
        faltas.push(`${resumen} · SIN AVISO: ${sinAviso.map((p) => corto(p.id)).join(", ")}`);
      }
      if (hayDemo) falsasAlarmas.push(resumen);
    }
  }
  console.log(`Cadenas que incluyen a algun usuario real: ${cadenasConReal}`);
  console.log(`  - solo con usuarios reales: ${cadenasSoloReales}`);
  console.log(`  - con algun anuncio importado de PermutaDoc: ${cadenasRealConImportado}`);
  console.log(`  - con algun anuncio demo/sintetico: ${cadenasRealConDemo}`);
  console.log(`Cadenas donde un usuario real (que no fue quien la completo) NO tiene aviso registrado: ${faltas.length}`);
  for (const f of faltas.slice(0, 30)) console.log("  " + f);
  if (falsasAlarmas.length) {
    console.log(`Cadenas de usuarios reales que incluyen un anuncio demo (salen en 'Mi cuenta'):`);
    for (const f of falsasAlarmas.slice(0, 15)) console.log("  " + f);
  }

  // Usuarios reales activos: cuantos anuncios reales y cuantos con alguna cadena
  const realesActivos = anuncios.filter((a) => a.tipo_usuario === "real");
  console.log(`Anuncios activos de usuarios reales: ${realesActivos.length}`);

  await db.query("rollback");
  await db.end();
}

main().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  process.exit(1);
});

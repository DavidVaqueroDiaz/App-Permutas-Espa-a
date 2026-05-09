/**
 * import-demos.ts
 *
 * Importa los anuncios sinteticos de demostracion desde
 * `data/demo_anuncios.json` a Supabase, marcandolos con `es_demo=true`.
 *
 * Este script:
 *   1. Borra TODOS los anuncios anteriores marcados como demo (incluidos
 *      los importados de PermutaDoc con alias `permutadoc_*` que se
 *      consideraban "demos" via heuristica de alias).
 *   2. Crea un usuario sintetico por anuncio en auth.users + perfil
 *      en perfiles_usuario, con emails @permutaes.invalid (RFC 2606,
 *      no se pueden enviar correos a esos dominios — asi nadie recibe
 *      notificaciones de demos por error).
 *   3. Resuelve cuerpo, especialidad y municipios contra los catalogos
 *      reales usando un MATCHER inteligente que reconoce variaciones
 *      lexicas (ej. "Cuerpo Superior de Administracion General de la
 *      Junta de Andalucia" -> CCAA-A1).
 *   4. Inserta cada anuncio con es_demo=true.
 *   5. Inserta atajos geograficos para los destinos (ccaa, provincia,
 *      municipio_individual).
 *   6. Reporta exitos, fallos y razones.
 *
 * Uso:
 *   npx tsx scripts/import-demos.ts
 *
 * Re-ejecutable: borra los anteriores antes de insertar los nuevos.
 */
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

type Demo = {
  sector_codigo: string;
  ccaa_codigo: string;
  cuerpo_codigo_oficial: string | null;
  cuerpo_denominacion: string;
  especialidad_codigo_oficial: string | null;
  especialidad_denominacion: string | null;
  municipio_actual_nombre: string;
  provincia_actual_nombre: string;
  ano_toma_posesion: number;
  anyos_servicio_totales: number;
  ya_permuto_antes: boolean;
  ano_permuta_anterior: number | null;
  destinos: Array<{ tipo: string; nombre: string }>;
  observaciones: string;
};

// -------------------------------------------------------------------
// Normalizacion de strings para comparar lexicalmente
// -------------------------------------------------------------------
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['"`]/g, " ")  // apostrofo -> espacio (L'Hospitalet -> l hospitalet)
    .replace(/[\s\-_/.,()]+/g, " ")
    .trim();
}

// -------------------------------------------------------------------
// MATCHER de cuerpos: reconoce variaciones por sector
// -------------------------------------------------------------------
type Cuerpo = {
  id: string;
  sector_codigo: string;
  codigo_oficial: string | null;
  denominacion: string;
};

/**
 * Devuelve el id del cuerpo en la BD que mejor matchee la denominacion
 * generada por la IA. Estrategias por sector:
 *
 * - docente_loe: por codigo_oficial directo (la IA usa "0597", "0590"...
 *   y la BD tiene "597", "590"... — quitamos el cero inicial).
 * - sanitario_sns: por palabras clave en la denominacion.
 * - funcionario_age: por nivel administrativo (A1, A2, C1, C2).
 * - funcionario_ccaa: por nivel administrativo. Ignoramos el sufijo
 *   "de la Junta de Andalucia", "de Catalunya", etc.
 * - funcionario_local: por escala (A1, A2, C1, C2).
 * - habilitado_nacional: por especialidad ("Secretaria categoria
 *   superior" -> HN-SEC-SUP).
 * - policia_local: por escala mencionada en cuerpo o especialidad.
 */
function resolverCuerpoId(
  d: Demo,
  cuerposBd: Cuerpo[],
): { id: string | null; nota: string } {
  const sector = d.sector_codigo;
  const denom = norm(d.cuerpo_denominacion);
  const cuerposSector = cuerposBd.filter((c) => c.sector_codigo === sector);
  const find = (filtro: (c: Cuerpo) => boolean) =>
    cuerposSector.find(filtro)?.id ?? null;

  // Primero intentamos match exacto por denominacion
  const exacto = cuerposSector.find((c) => norm(c.denominacion) === denom);
  if (exacto) return { id: exacto.id, nota: "match exacto" };

  // Match por codigo_oficial (con o sin ceros iniciales)
  if (d.cuerpo_codigo_oficial) {
    const codNorm = d.cuerpo_codigo_oficial.replace(/^0+/, "");
    const porCodigo = cuerposSector.find(
      (c) => c.codigo_oficial && c.codigo_oficial.replace(/^0+/, "") === codNorm,
    );
    if (porCodigo) return { id: porCodigo.id, nota: `match por codigo ${d.cuerpo_codigo_oficial}` };
  }

  // Fallback por sector
  switch (sector) {
    case "docente_loe": {
      // Mapeo flexible por palabras clave
      if (denom.includes("maestr")) return { id: find((c) => c.codigo_oficial === "597"), nota: "maestros" };
      if (denom.includes("inspector")) {
        // No hay cuerpo de inspectores en mi BD para LOE. Usamos PES como proxy.
        return { id: null, nota: "Inspectores Educacion no existe en BD; saltando" };
      }
      if (denom.includes("ensenanza secundaria") || denom.includes("ense") && denom.includes("secundaria"))
        return { id: find((c) => c.codigo_oficial === "590"), nota: "secundaria" };
      if (denom.includes("tecnico") && denom.includes("fp"))
        return { id: find((c) => c.codigo_oficial === "591"), nota: "tecnicos FP" };
      if (denom.includes("musica") && denom.includes("escenicas"))
        return { id: find((c) => c.codigo_oficial === "594"), nota: "musica" };
      if (denom.includes("escuelas oficiales") || denom.includes("idiomas"))
        return { id: find((c) => c.codigo_oficial === "592"), nota: "EOI" };
      if (denom.includes("artes plasticas") || denom.includes("diseno"))
        return { id: find((c) => c.codigo_oficial === "595"), nota: "artes plasticas" };
      return { id: null, nota: "docente_loe sin match" };
    }

    case "sanitario_sns": {
      if (denom.includes("medicina familiar") || denom.includes("medico de familia"))
        return { id: find((c) => c.codigo_oficial === "MED01"), nota: "MFC" };
      if (denom.includes("pediatr"))
        return { id: find((c) => c.codigo_oficial === "MED02"), nota: "pediatra" };
      if (denom.includes("medico especialista") || denom.includes("medico/a especialista"))
        return { id: find((c) => c.codigo_oficial === "FEA"), nota: "FEA" };
      if (denom.includes("matron"))
        return { id: find((c) => c.codigo_oficial === "ENF02"), nota: "matron" };
      if (denom.includes("enfermer"))
        return { id: find((c) => c.codigo_oficial === "ENF01"), nota: "enfermeria" };
      if (denom.includes("auxiliar de enfermeria") || denom.includes("tcae"))
        return { id: find((c) => c.codigo_oficial === "TCAE"), nota: "TCAE" };
      if (denom.includes("celador"))
        return { id: find((c) => c.codigo_oficial === "CEL"), nota: "celador" };
      if (denom.includes("radiodiagn") || denom.includes("laboratorio"))
        return { id: find((c) => c.codigo_oficial === "TER"), nota: "TER" };
      if (denom.includes("fisioterapeut"))
        return { id: find((c) => c.codigo_oficial === "FIS"), nota: "fisio" };
      if (denom.includes("psicolog"))
        return { id: find((c) => c.codigo_oficial === "PSI"), nota: "psicologo" };
      if (denom.includes("trabajador") && denom.includes("social"))
        return { id: find((c) => c.codigo_oficial === "TSO"), nota: "trabajador social" };
      if (denom.includes("farmaceutic"))
        return { id: find((c) => c.codigo_oficial === "FAR"), nota: "farmaceutico" };
      return { id: null, nota: "sanitario sin match" };
    }

    case "funcionario_age": {
      // Por nivel administrativo
      if (denom.includes("inspector") && denom.includes("hacienda"))
        return { id: find((c) => c.codigo_oficial === "AGE-A1-IH"), nota: "Inspectores Hacienda" };
      if (denom.includes("inspector") && (denom.includes("trabajo") || denom.includes("ss")))
        return { id: find((c) => c.codigo_oficial === "AGE-A1-IT"), nota: "Inspectores Trabajo" };
      if (denom.includes("administradores civiles"))
        return { id: find((c) => c.codigo_oficial === "AGE-A1-CSACE"), nota: "Administradores Civiles" };
      if (denom.includes("gestion de la administracion civil") || denom.includes("a2"))
        return { id: find((c) => c.codigo_oficial === "AGE-A2-GAC"), nota: "Gestion AGE" };
      if (denom.includes("tecnico de hacienda"))
        return { id: find((c) => c.codigo_oficial === "AGE-A2-TH"), nota: "Tecnico Hacienda" };
      if (denom.includes("administrativo") || denom.includes("c1"))
        return { id: find((c) => c.codigo_oficial === "AGE-C1-GA"), nota: "General Admin" };
      if (denom.includes("auxiliar") || denom.includes("c2"))
        return { id: find((c) => c.codigo_oficial === "AGE-C2-GAUX"), nota: "Auxiliar" };
      // Por defecto, A1
      return { id: find((c) => c.codigo_oficial === "AGE-A1-CSACE"), nota: "AGE default A1" };
    }

    case "funcionario_ccaa": {
      // La IA usa nombres como "Cuerpo Superior de Administracion General
      // de la Junta de Andalucia" o equivalente en catalan/euskera/gallego.
      // Mapeamos por nivel/categoria.
      if (denom.includes("auxiliar") || denom.includes("c2") || denom.includes("laguntzaile"))
        return { id: find((c) => c.codigo_oficial === "CCAA-C2"), nota: "CCAA C2" };
      if (
        (denom.includes("administrativo") || denom.includes("administratiu") || denom.includes("administrativ")) &&
        !denom.includes("superior") && !denom.includes("auxiliar") && !denom.includes("gestion") && !denom.includes("kudeaketa")
      )
        return { id: find((c) => c.codigo_oficial === "CCAA-C1"), nota: "CCAA C1" };
      if (
        denom.includes("gestion") || denom.includes("gestio") || denom.includes("xestion") ||
        denom.includes("kudeaketa") || denom.includes("diplomados") || denom.includes("diplomats")
      )
        return { id: find((c) => c.codigo_oficial === "CCAA-A2"), nota: "CCAA A2" };
      if (
        denom.includes("superior") || denom.includes("facultativo") || denom.includes("facultatiu") ||
        denom.includes("goi mailako") || denom.includes("goi-mailako")
      )
        return { id: find((c) => c.codigo_oficial === "CCAA-A1"), nota: "CCAA A1" };
      // Por defecto C1
      return { id: find((c) => c.codigo_oficial === "CCAA-C1"), nota: "CCAA default C1" };
    }

    case "funcionario_local": {
      if (denom.includes("auxiliar") || denom.includes("c2"))
        return { id: find((c) => c.codigo_oficial === "LOCAL-C2"), nota: "LOCAL C2" };
      if (denom.includes("administrativo") && !denom.includes("superior") && !denom.includes("medio"))
        return { id: find((c) => c.codigo_oficial === "LOCAL-C1"), nota: "LOCAL C1" };
      if (denom.includes("medio") || denom.includes("a2"))
        return { id: find((c) => c.codigo_oficial === "LOCAL-A2"), nota: "LOCAL A2" };
      if (denom.includes("superior") || denom.includes("a1"))
        return { id: find((c) => c.codigo_oficial === "LOCAL-A1"), nota: "LOCAL A1" };
      return { id: find((c) => c.codigo_oficial === "LOCAL-C1"), nota: "LOCAL default C1" };
    }

    case "habilitado_nacional": {
      // La info real esta en la especialidad
      const esp = norm(d.especialidad_denominacion ?? "");
      if (esp.includes("secretaria") && esp.includes("intervencion"))
        return { id: find((c) => c.codigo_oficial === "HN-SECINT"), nota: "Sec-Int" };
      if (esp.includes("secretaria") && esp.includes("superior"))
        return { id: find((c) => c.codigo_oficial === "HN-SEC-SUP"), nota: "Sec sup" };
      if (esp.includes("secretaria") && esp.includes("entrada"))
        return { id: find((c) => c.codigo_oficial === "HN-SEC-ENT"), nota: "Sec ent" };
      if (esp.includes("intervencion") && esp.includes("superior"))
        return { id: find((c) => c.codigo_oficial === "HN-INT-SUP"), nota: "Int sup" };
      if (esp.includes("intervencion") && esp.includes("entrada"))
        return { id: find((c) => c.codigo_oficial === "HN-INT-ENT"), nota: "Int ent" };
      // Default: secretaria entrada
      return { id: find((c) => c.codigo_oficial === "HN-SEC-ENT"), nota: "HN default" };
    }

    case "policia_local": {
      const esp = norm(d.especialidad_denominacion ?? "");
      if (denom.includes("comisario principal") || esp.includes("comisario principal"))
        return { id: find((c) => c.codigo_oficial === "PL-COMP"), nota: "Com Princ" };
      if (denom.includes("comisario") || esp.includes("comisario"))
        return { id: find((c) => c.codigo_oficial === "PL-COM"), nota: "Comisario" };
      if (denom.includes("inspector") || esp.includes("inspector") || esp.includes("escala tecnica"))
        return { id: find((c) => c.codigo_oficial === "PL-INSP"), nota: "Inspector" };
      if (denom.includes("subinspector") || esp.includes("subinspector") || esp.includes("escala ejecutiva"))
        return { id: find((c) => c.codigo_oficial === "PL-SUB"), nota: "Subinspector" };
      if (denom.includes("oficial") || esp.includes("oficial"))
        return { id: find((c) => c.codigo_oficial === "PL-OFI"), nota: "Oficial" };
      // Default: agente (escala basica)
      return { id: find((c) => c.codigo_oficial === "PL-AGT"), nota: "Agente (default)" };
    }
  }

  return { id: null, nota: "sector desconocido" };
}

// -------------------------------------------------------------------
// MATCHER de especialidades
// -------------------------------------------------------------------
type Especialidad = {
  id: string;
  cuerpo_id: string;
  codigo_oficial: string | null;
  denominacion: string;
};

function resolverEspecialidadId(
  d: Demo,
  cuerpoId: string | null,
  especialidadesBd: Especialidad[],
): string | null {
  if (!d.especialidad_denominacion || !cuerpoId) return null;
  const denom = norm(d.especialidad_denominacion);
  const candidatas = especialidadesBd.filter((e) => e.cuerpo_id === cuerpoId);

  // Match exacto
  const exacto = candidatas.find((e) => norm(e.denominacion) === denom);
  if (exacto) return exacto.id;

  // Match por codigo
  if (d.especialidad_codigo_oficial) {
    const c = candidatas.find((e) => e.codigo_oficial === d.especialidad_codigo_oficial);
    if (c) return c.id;
  }

  // Match por palabras clave (la primera palabra significativa)
  const m = candidatas.find((e) => norm(e.denominacion).includes(denom) || denom.includes(norm(e.denominacion)));
  if (m) return m.id;

  // Si no encuentra, devuelve null (anuncio sin especialidad). El motor
  // de matching seguira funcionando por cuerpo+ubicacion.
  return null;
}

// -------------------------------------------------------------------
// MATCHER de municipios: maneja artículos invertidos del INE
// -------------------------------------------------------------------
type Municipio = {
  codigo_ine: string;
  nombre: string;
  provincia_codigo: string;
};

function resolverMunicipio(
  nombreBuscado: string,
  provinciaBuscada: string | null,
  municipiosBd: Municipio[],
  provinciasMap: Map<string, string>, // norm(nombre) -> codigo
): { codigo: string | null; ccaa: string | null } {
  const buscado = norm(nombreBuscado);

  // Normalizamos posibles inversiones de artículo:
  //   "A Coruña" / "Coruña, A"
  //   "L'Hospitalet de Llobregat" / "Hospitalet de Llobregat, L'"
  //   "Las Palmas de Gran Canaria" / "Palmas de Gran Canaria, Las"
  // El INE guarda con artículo al final precedido de coma.
  const variantes = [
    buscado,
    // Si empieza con artículo, probar con la version invertida
    buscado.replace(/^(a|el|la|las|los|el|l) (.+)$/, "$2 $1"),
    // Si tiene apóstrofo invertido
    buscado.replace(/^l (.+)$/, "$1 l"),
  ];

  // Filtramos por provincia si tenemos
  let candidatos = municipiosBd;
  if (provinciaBuscada) {
    const provNorm = norm(provinciaBuscada);
    const provCod = provinciasMap.get(provNorm);
    if (provCod) {
      candidatos = municipiosBd.filter((m) => m.provincia_codigo === provCod);
    }
  }

  // Probamos match exacto en variantes
  for (const v of variantes) {
    const m = candidatos.find((mun) => norm(mun.nombre) === v);
    if (m) return { codigo: m.codigo_ine, ccaa: null };
  }

  // Match contiene
  for (const v of variantes) {
    const m = candidatos.find((mun) => norm(mun.nombre).includes(v) || v.includes(norm(mun.nombre)));
    if (m) return { codigo: m.codigo_ine, ccaa: null };
  }

  return { codigo: null, ccaa: null };
}

// -------------------------------------------------------------------
// CORE
// -------------------------------------------------------------------
async function main() {
  const arr: Demo[] = JSON.parse(fs.readFileSync("data/demo_anuncios.json", "utf8"));
  console.log(`Importando ${arr.length} anuncios demo...\n`);

  const client = new Client({
    host: process.env.SUPABASE_DB_HOST!,
    port: Number(process.env.SUPABASE_DB_PORT!),
    user: process.env.SUPABASE_DB_USER!,
    password: process.env.SUPABASE_DB_PASSWORD!,
    database: process.env.SUPABASE_DB_NAME!,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  // 1) Borrar anuncios anteriores marcados como demo (incluidos los
  // viejos de PermutaDoc por alias). Borramos tambien los usuarios
  // creados para esos demos.
  console.log("--- Limpiando anuncios demo previos ---");
  const delAnuncios = await client.query(`
    delete from public.anuncios
    where es_demo = true
       or usuario_id in (
         select id from auth.users where email like '%@permutaes.test'
       )
  `);
  console.log(`  Anuncios borrados: ${delAnuncios.rowCount}`);

  const delUsers = await client.query(`
    delete from auth.users
    where email like '%@permutaes.test'
       or email like '%@permutaes.invalid'
  `);
  console.log(`  Usuarios sinteticos borrados: ${delUsers.rowCount}`);
  console.log("");

  // 2) Cargar catalogos
  console.log("--- Cargando catalogos ---");
  const cuerposBd: Cuerpo[] = (
    await client.query("select id, sector_codigo, codigo_oficial, denominacion from public.cuerpos")
  ).rows;
  const especialidadesBd: Especialidad[] = (
    await client.query("select id, cuerpo_id, codigo_oficial, denominacion from public.especialidades")
  ).rows;
  const municipiosBd: Municipio[] = (
    await client.query("select codigo_ine, nombre, provincia_codigo from public.municipios")
  ).rows;
  const provinciasBd = (
    await client.query("select codigo_ine, nombre, ccaa_codigo from public.provincias")
  ).rows as Array<{ codigo_ine: string; nombre: string; ccaa_codigo: string }>;
  const ccaaBd = (
    await client.query("select codigo_ine, nombre from public.ccaa")
  ).rows as Array<{ codigo_ine: string; nombre: string }>;

  const provinciasMap = new Map<string, string>();
  for (const p of provinciasBd) provinciasMap.set(norm(p.nombre), p.codigo_ine);

  const ccaaMap = new Map<string, string>();
  for (const c of ccaaBd) ccaaMap.set(norm(c.nombre), c.codigo_ine);

  const provinciasPorCcaa = new Map<string, string[]>();
  for (const p of provinciasBd) {
    if (!provinciasPorCcaa.has(p.ccaa_codigo)) provinciasPorCcaa.set(p.ccaa_codigo, []);
    provinciasPorCcaa.get(p.ccaa_codigo)!.push(p.codigo_ine);
  }

  console.log(`  Cuerpos: ${cuerposBd.length}, Especialidades: ${especialidadesBd.length}, Municipios: ${municipiosBd.length}`);
  console.log("");

  // 3) Insertar uno por uno
  console.log("--- Importando ---");
  let ok = 0, fail = 0;
  const fallos: string[] = [];

  for (let i = 0; i < arr.length; i++) {
    const d = arr[i];
    try {
      // 3a) Resolver cuerpo
      const { id: cuerpoId, nota: cuerpoNota } = resolverCuerpoId(d, cuerposBd);
      if (!cuerpoId) {
        fail++;
        fallos.push(`#${i} [${d.sector_codigo}/${d.ccaa_codigo}] cuerpo no resuelto: "${d.cuerpo_denominacion}" (${cuerpoNota})`);
        continue;
      }

      // 3b) Resolver especialidad (puede ser null, OK)
      const especialidadId = resolverEspecialidadId(d, cuerpoId, especialidadesBd);

      // 3c) Resolver municipio actual
      const { codigo: municipioCodigo } = resolverMunicipio(
        d.municipio_actual_nombre,
        d.provincia_actual_nombre,
        municipiosBd,
        provinciasMap,
      );
      if (!municipioCodigo) {
        fail++;
        fallos.push(`#${i} municipio no resuelto: "${d.municipio_actual_nombre}" (${d.provincia_actual_nombre})`);
        continue;
      }

      // 3d) Crear usuario sintetico. Alias: 'demo_' + 3 letras sector
      // + 2 codigo CCAA + '_' + 4 digitos contador. Ejemplo:
      //   demo_doc01_0042  (16 chars, dentro del limite de 20)
      const sectorAbbr: Record<string, string> = {
        docente_loe: "doc",
        sanitario_sns: "san",
        funcionario_age: "age",
        funcionario_ccaa: "aut",
        funcionario_local: "loc",
        habilitado_nacional: "hab",
        policia_local: "pol",
      };
      const abbr = sectorAbbr[d.sector_codigo] ?? "xxx";
      const aliasPublico = `demo_${abbr}${d.ccaa_codigo}_${String(i).padStart(4, "0")}`;
      const email = `${aliasPublico}-${crypto.randomBytes(3).toString("hex")}@permutaes.invalid`;
      const anoNacimiento = 2000 - d.anyos_servicio_totales - Math.floor(Math.random() * 10);

      const userIns = await client.query<{ id: string }>(
        `insert into auth.users (
          instance_id, id, aud, role, email,
          encrypted_password, email_confirmed_at,
          raw_user_meta_data, raw_app_meta_data,
          created_at, updated_at, is_anonymous, is_sso_user
        )
        values (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          'authenticated', 'authenticated', $1,
          crypt('disabled', gen_salt('bf')), now(),
          $2::jsonb, $3::jsonb,
          now(), now(), false, false
        )
        returning id`,
        [
          email,
          JSON.stringify({
            alias_publico: aliasPublico,
            ano_nacimiento: anoNacimiento,
            politica_privacidad_version: "v1",
            es_demo: true,
          }),
          JSON.stringify({ provider: "demo" }),
        ],
      );
      const userId = userIns.rows[0].id;

      // 3e) Crear anuncio
      const fechaToma = `${d.ano_toma_posesion}-01-01`;
      const fechaPermutaAnt = d.ano_permuta_anterior ? `${d.ano_permuta_anterior}-01-01` : null;

      const anuncioIns = await client.query<{ id: string }>(
        `insert into public.anuncios (
          usuario_id, sector_codigo, cuerpo_id, especialidad_id,
          municipio_actual_codigo, ccaa_codigo,
          fecha_toma_posesion_definitiva, anyos_servicio_totales,
          permuta_anterior_fecha, observaciones, estado, es_demo
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'activo', true)
        returning id`,
        [
          userId, d.sector_codigo, cuerpoId, especialidadId,
          municipioCodigo, d.ccaa_codigo,
          fechaToma, d.anyos_servicio_totales,
          fechaPermutaAnt, d.observaciones.slice(0, 500),
        ],
      );
      const anuncioId = anuncioIns.rows[0].id;

      // 3f) Insertar destinos como atajos + plazas_deseadas
      const plazasSet = new Set<string>();
      for (const dest of d.destinos) {
        if (dest.tipo === "ccaa") {
          const codCcaa = ccaaMap.get(norm(dest.nombre));
          if (codCcaa) {
            await client.query(
              "insert into public.anuncio_atajos (anuncio_id, tipo, valor) values ($1, 'ccaa', $2)",
              [anuncioId, codCcaa],
            );
            // Expandir a todos los municipios de esa CCAA
            const provs = provinciasPorCcaa.get(codCcaa) ?? [];
            for (const m of municipiosBd) {
              if (provs.includes(m.provincia_codigo) && m.codigo_ine !== municipioCodigo) {
                plazasSet.add(m.codigo_ine);
              }
            }
          }
        } else if (dest.tipo === "provincia") {
          const provNorm = norm(dest.nombre);
          const cod = provinciasMap.get(provNorm);
          if (cod) {
            await client.query(
              "insert into public.anuncio_atajos (anuncio_id, tipo, valor) values ($1, 'provincia', $2)",
              [anuncioId, cod],
            );
            for (const m of municipiosBd) {
              if (m.provincia_codigo === cod && m.codigo_ine !== municipioCodigo) {
                plazasSet.add(m.codigo_ine);
              }
            }
          }
        } else if (dest.tipo === "municipio") {
          const { codigo } = resolverMunicipio(dest.nombre, null, municipiosBd, provinciasMap);
          if (codigo && codigo !== municipioCodigo) {
            await client.query(
              "insert into public.anuncio_atajos (anuncio_id, tipo, valor) values ($1, 'municipio_individual', $2)",
              [anuncioId, codigo],
            );
            plazasSet.add(codigo);
          }
        }
      }

      // Insertar plazas_deseadas en bloque (limitamos a 500 para no
      // explotar la tabla con CCAA enteras enormes; si una CCAA tiene
      // mas de 500 municipios, los truncamos arbitrariamente — los
      // atajos ya guardan la intencion semantica).
      const plazasArr = [...plazasSet].slice(0, 500);
      if (plazasArr.length > 0) {
        const valuesSql = plazasArr.map((_, j) => `($1, $${j + 2})`).join(",");
        await client.query(
          `insert into public.anuncio_plazas_deseadas (anuncio_id, municipio_codigo) values ${valuesSql} on conflict do nothing`,
          [anuncioId, ...plazasArr],
        );
      }

      // 3g) Crear perfil_usuario
      await client.query(
        `insert into public.perfiles_usuario (
          id, alias_publico, ano_nacimiento, politica_privacidad_aceptada_version
        ) values ($1, $2, $3, 'v1') on conflict (id) do nothing`,
        [userId, aliasPublico, anoNacimiento],
      );

      ok++;
      if ((i + 1) % 50 === 0) console.log(`  Progreso: ${i + 1}/${arr.length} (${ok} ok, ${fail} fail)`);
    } catch (err) {
      fail++;
      const msg = err instanceof Error ? err.message : String(err);
      fallos.push(`#${i} [${d.sector_codigo}/${d.ccaa_codigo}] excepcion: ${msg.slice(0, 200)}`);
    }
  }

  console.log("");
  console.log(`=== RESUMEN ===`);
  console.log(`Importados:  ${ok} / ${arr.length}`);
  console.log(`Fallidos:    ${fail}`);
  if (fallos.length > 0) {
    console.log("\n--- FALLOS (primeros 30) ---");
    for (const f of fallos.slice(0, 30)) console.log("  " + f);
    if (fallos.length > 30) console.log(`  ...y ${fallos.length - 30} mas`);
  }

  await client.end();
}

main().catch((e) => {
  console.error("ERROR FATAL:", e);
  process.exit(1);
});

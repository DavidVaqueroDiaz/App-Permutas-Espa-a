/**
 * Importa los anuncios DEFINITIVOS de PermutaDoc (app anterior de Vaquero
 * basada en el JSON público de profesoradogalicia.com) a la nueva BD de
 * PermutaES como datos de prueba.
 *
 * - Crea usuarios sintéticos en auth.users con email único pero contraseña
 *   hashada inutilizable (no podrán hacer login real). El trigger
 *   handle_new_user crea sus perfiles_usuario.
 * - Cada anuncio tiene como plazas deseadas las 3 provincias gallegas
 *   distintas a la suya, expandidas a sus municipios.
 * - Solo importa tipo_permuta = 'definitiva' (provisionales no encajan
 *   en el modelo).
 *
 * Para borrar todos estos datos de prueba:
 *   delete from auth.users where email like '%@permutaes.test';
 * (cascada borra perfiles, anuncios, plazas y atajos).
 *
 * Ejecutar: npx tsx scripts/import-permutadoc.ts
 */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const PERMUTADOC_JSON = "C:/Users/Usuario/Desktop/permutas/anuncios/permutas.json";

// Cargar variables de entorno desde .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Mapeo provincia gallega -> código INE provincia
const PROVINCIAS = {
  "A Coruña": "15",
  "Lugo": "27",
  "Ourense": "32",
  "Pontevedra": "36",
} as const;

const PROVINCIAS_DESEADAS: Record<string, string[]> = {
  "15": ["27", "32", "36"],
  "27": ["15", "32", "36"],
  "32": ["15", "27", "36"],
  "36": ["15", "27", "32"],
};

type AnuncioDoc = {
  id: string;
  usuario_id: string;
  corpo: string; // "590", "597", "598"
  especialidade: string; // "590005", "597032", etc.
  provincia_actual: keyof typeof PROVINCIAS;
  localidade_actual: string;
  tipo_permuta: string; // "definitiva" | "provisional"
  centro_actual: string;
  observacions: string;
  zona_desexada: string;
  tipo_praza: string;
  praza_bilingue: string;
  afin: string;
  itinerancia: string;
  contacto: string;
  data_solicitude: string;
};

async function main() {
  const client = new Client({
    user: process.env.SUPABASE_DB_USER!,
    password: process.env.SUPABASE_DB_PASSWORD!,
    host: process.env.SUPABASE_DB_HOST!,
    port: Number.parseInt(process.env.SUPABASE_DB_PORT!, 10),
    database: process.env.SUPABASE_DB_NAME!,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("✓ Conectado a la BD.");

  // 1. Limpiar imports anteriores (idempotente).
  console.log("\nLimpiando imports anteriores (si los hay)...");
  await client.query("delete from auth.users where email like '%@permutaes.test'");
  console.log("✓ Borrados anuncios y usuarios de pruebas previos.");

  // 2. Leer y filtrar JSON.
  const json = JSON.parse(fs.readFileSync(PERMUTADOC_JSON, "utf8"));
  const todos: AnuncioDoc[] = json.data;
  // Importamos TODOS (definitivas + provisionales) para tener un dataset
  // de pruebas mas realista. La distincion definitiva/provisional la
  // mantenemos visible en las observaciones del anuncio.
  const definitivos = todos;
  console.log(`\n${definitivos.length} anuncios totales a importar.`);

  // 3. Pre-cargar mapas de cuerpo y especialidad.
  const cuerposRes = await client.query<{ id: string; codigo_oficial: string }>(
    "select id, codigo_oficial from public.cuerpos where sector_codigo = 'docente_loe'",
  );
  const cuerpoIdPorCodigo = new Map<string, string>();
  for (const r of cuerposRes.rows) cuerpoIdPorCodigo.set(r.codigo_oficial, r.id);

  const espRes = await client.query<{
    id: string;
    cuerpo_id: string;
    codigo_oficial: string;
  }>(
    `select id, cuerpo_id, codigo_oficial from public.especialidades
     where cuerpo_id in (select id from public.cuerpos where sector_codigo = 'docente_loe')`,
  );
  const espIdPorCuerpoYCodigo = new Map<string, string>();
  for (const r of espRes.rows)
    espIdPorCuerpoYCodigo.set(`${r.cuerpo_id}|${r.codigo_oficial}`, r.id);

  // 4. Pre-cargar municipios gallegos (provincias 15, 27, 32, 36).
  const muniRes = await client.query<{
    codigo_ine: string;
    nombre: string;
    provincia_codigo: string;
  }>(
    `select codigo_ine, nombre, provincia_codigo from public.municipios
     where provincia_codigo in ('15', '27', '32', '36')`,
  );
  const municipiosPorNombreNorm = new Map<string, string>();
  function normaliza(s: string): string {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }
  for (const m of muniRes.rows) {
    municipiosPorNombreNorm.set(normaliza(m.nombre), m.codigo_ine);
  }

  // Plazas deseadas por provincia: cargar municipios de las 3 provincias deseadas.
  const muniPorProv = new Map<string, string[]>();
  for (const m of muniRes.rows) {
    const lista = muniPorProv.get(m.provincia_codigo) ?? [];
    lista.push(m.codigo_ine);
    muniPorProv.set(m.provincia_codigo, lista);
  }

  // 5. Importar uno a uno.
  let creados = 0;
  let saltados = 0;

  for (const a of definitivos) {
    // Cuerpo
    const cuerpoId = cuerpoIdPorCodigo.get(a.corpo);
    if (!cuerpoId) {
      saltados++;
      continue;
    }

    // Especialidad: solo si la especialidad tiene >3 chars (590005 -> 005).
    const codigoEsp = a.especialidade.length > 3 ? a.especialidade.substring(3) : null;
    let especialidadId: string | null = null;
    if (codigoEsp) {
      especialidadId = espIdPorCuerpoYCodigo.get(`${cuerpoId}|${codigoEsp}`) ?? null;
      if (!especialidadId) {
        // Si la especialidad no está, importamos sin especialidad
        // (mejor que saltar el anuncio entero).
      }
    }

    // Municipio actual: resolver por nombre normalizado.
    const codMuni = municipiosPorNombreNorm.get(normaliza(a.localidade_actual));
    if (!codMuni) {
      console.warn(`  Sin municipio: "${a.localidade_actual}" (${a.provincia_actual}) — anuncio ${a.id}`);
      saltados++;
      continue;
    }

    const codProv = PROVINCIAS[a.provincia_actual];
    if (!codProv) {
      saltados++;
      continue;
    }

    // CCAA: 12 (Galicia) para todas estas provincias.
    const ccaaCodigo = "12";

    // Datos personales aleatorios pero consistentes entre ejecuciones.
    const seed = Number.parseInt(a.id, 10);
    const anoNacimiento = 1965 + (seed % 21); // 1965-1985
    const anyosServicio = 5 + (seed % 16); // 5-20
    const fechaToma = new Date(2018 + (seed % 5), seed % 12, (seed % 27) + 1)
      .toISOString()
      .slice(0, 10);

    // 1) crear usuario en auth.users
    const email = `permutadoc_${a.id}@permutaes.test`;
    const aliasPublico = `permutadoc_${a.id}`;
    const userInsert = await client.query<{ id: string }>(
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
        }),
        JSON.stringify({ provider: "test" }),
      ],
    );
    const userId = userInsert.rows[0].id;

    // Construir observaciones a partir de los datos reales del anuncio.
    const partes: string[] = [];
    partes.push(`[Anuncio de prueba importado de PermutaDoc · ${a.tipo_permuta}]`);
    if (a.observacions && a.observacions.trim()) {
      partes.push(a.observacions.trim());
    }
    if (a.zona_desexada && a.zona_desexada.trim()) {
      partes.push(`Zona deseada: ${a.zona_desexada.trim()}`);
    }
    const detallesExtra: string[] = [];
    if (a.tipo_praza) detallesExtra.push(`tipo plaza: ${a.tipo_praza}`);
    if (a.praza_bilingue && a.praza_bilingue !== "nonbil") detallesExtra.push(`bilingüe: ${a.praza_bilingue}`);
    if (a.afin && a.afin !== "afinnon") detallesExtra.push(`afín: ${a.afin}`);
    if (a.itinerancia && a.itinerancia !== "itinerancianon") detallesExtra.push(`itinerante: ${a.itinerancia}`);
    if (a.centro_actual) detallesExtra.push(`centro origen: ${a.centro_actual}`);
    if (detallesExtra.length > 0) partes.push(detallesExtra.join(" · "));
    const observaciones = partes.join("\n").slice(0, 500);

    // 2) crear el anuncio
    const anuncioInsert = await client.query<{ id: string }>(
      `insert into public.anuncios (
        usuario_id, sector_codigo, cuerpo_id, especialidad_id,
        municipio_actual_codigo, ccaa_codigo,
        fecha_toma_posesion_definitiva, anyos_servicio_totales,
        permuta_anterior_fecha, observaciones, estado
      ) values ($1, 'docente_loe', $2, $3, $4, $5, $6, $7, null, $8, 'activo')
      returning id`,
      [
        userId,
        cuerpoId,
        especialidadId,
        codMuni,
        ccaaCodigo,
        fechaToma,
        anyosServicio,
        observaciones,
      ],
    );
    const anuncioId = anuncioInsert.rows[0].id;

    // 3) plazas deseadas: las 3 provincias gallegas distintas a la actual
    const provDeseadas = PROVINCIAS_DESEADAS[codProv] ?? [];
    const codigosMuniDeseados: string[] = [];
    for (const pd of provDeseadas) {
      for (const cm of muniPorProv.get(pd) ?? []) codigosMuniDeseados.push(cm);
    }
    if (codigosMuniDeseados.length > 0) {
      await client.query(
        `insert into public.anuncio_plazas_deseadas (anuncio_id, municipio_codigo)
         select $1, unnest($2::text[])`,
        [anuncioId, codigosMuniDeseados],
      );
    }
    // Y los atajos (para que en la UI se vea bonito)
    for (const pd of provDeseadas) {
      await client.query(
        `insert into public.anuncio_atajos (anuncio_id, tipo, valor)
         values ($1, 'provincia', $2)`,
        [anuncioId, pd],
      );
    }

    creados++;
    if (creados % 10 === 0) console.log(`  ${creados} importados...`);
  }

  console.log(`\n✓ Creados: ${creados}`);
  console.log(`✗ Saltados: ${saltados}`);
  await client.end();
}

main().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});

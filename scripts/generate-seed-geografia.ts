/**
 * Genera la migración SQL `0002_seed_geografia.sql` con:
 *   - Cambio de columnas latitud/longitud/poblacion a nullable
 *     (las rellenaremos cuando carguemos el Nomenclátor del CNIG).
 *   - Insertos de las 19 CCAA + Ceuta y Melilla.
 *   - Insertos de las 52 provincias.
 *   - Insertos de los ~8.131 municipios leídos del Excel del INE
 *     `descargas de cowork/diccionario26.xlsx`.
 *
 * Ejecutar:
 *   npx tsx scripts/generate-seed-geografia.ts
 *
 * Resultado: archivo `supabase/migrations/0002_seed_geografia.sql`
 * listo para pegar en el SQL Editor de Supabase.
 */
import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

// ----------------------------------------------------------------------
// Datos hardcodeados: CCAA (19) y provincias (52)
// ----------------------------------------------------------------------

/**
 * CODAUTO oficial del INE. Son los códigos que aparecen en la columna
 * CODAUTO del Excel. Lista canónica:
 * https://www.ine.es/daco/daco42/codmun/cod_ccaa.htm
 */
const CCAA: Array<[string, string]> = [
  ["01", "Andalucía"],
  ["02", "Aragón"],
  ["03", "Principado de Asturias"],
  ["04", "Illes Balears"],
  ["05", "Canarias"],
  ["06", "Cantabria"],
  ["07", "Castilla y León"],
  ["08", "Castilla-La Mancha"],
  ["09", "Cataluña"],
  ["10", "Comunitat Valenciana"],
  ["11", "Extremadura"],
  ["12", "Galicia"],
  ["13", "Comunidad de Madrid"],
  ["14", "Región de Murcia"],
  ["15", "Comunidad Foral de Navarra"],
  ["16", "País Vasco"],
  ["17", "La Rioja"],
  ["18", "Ceuta"],
  ["19", "Melilla"],
];

/**
 * Provincias: codigo INE 2 dígitos, nombre, codigo CCAA 2 dígitos.
 * https://www.ine.es/daco/daco42/codmun/cod_provincia.htm
 */
const PROVINCIAS: Array<[string, string, string]> = [
  ["01", "Araba/Álava", "16"],
  ["02", "Albacete", "08"],
  ["03", "Alicante/Alacant", "10"],
  ["04", "Almería", "01"],
  ["05", "Ávila", "07"],
  ["06", "Badajoz", "11"],
  ["07", "Illes Balears", "04"],
  ["08", "Barcelona", "09"],
  ["09", "Burgos", "07"],
  ["10", "Cáceres", "11"],
  ["11", "Cádiz", "01"],
  ["12", "Castellón/Castelló", "10"],
  ["13", "Ciudad Real", "08"],
  ["14", "Córdoba", "01"],
  ["15", "A Coruña", "12"],
  ["16", "Cuenca", "08"],
  ["17", "Girona", "09"],
  ["18", "Granada", "01"],
  ["19", "Guadalajara", "08"],
  ["20", "Gipuzkoa", "16"],
  ["21", "Huelva", "01"],
  ["22", "Huesca", "02"],
  ["23", "Jaén", "01"],
  ["24", "León", "07"],
  ["25", "Lleida", "09"],
  ["26", "La Rioja", "17"],
  ["27", "Lugo", "12"],
  ["28", "Madrid", "13"],
  ["29", "Málaga", "01"],
  ["30", "Murcia", "14"],
  ["31", "Navarra", "15"],
  ["32", "Ourense", "12"],
  ["33", "Asturias", "03"],
  ["34", "Palencia", "07"],
  ["35", "Las Palmas", "05"],
  ["36", "Pontevedra", "12"],
  ["37", "Salamanca", "07"],
  ["38", "Santa Cruz de Tenerife", "05"],
  ["39", "Cantabria", "06"],
  ["40", "Segovia", "07"],
  ["41", "Sevilla", "01"],
  ["42", "Soria", "07"],
  ["43", "Tarragona", "09"],
  ["44", "Teruel", "02"],
  ["45", "Toledo", "08"],
  ["46", "Valencia/València", "10"],
  ["47", "Valladolid", "07"],
  ["48", "Bizkaia", "16"],
  ["49", "Zamora", "07"],
  ["50", "Zaragoza", "02"],
  ["51", "Ceuta", "18"],
  ["52", "Melilla", "19"],
];

// ----------------------------------------------------------------------
// Lectura del Excel del INE
// ----------------------------------------------------------------------

const EXCEL_PATH = path.join(
  process.cwd(),
  "descargas de cowork",
  "diccionario26.xlsx",
);

type IneRow = {
  CODAUTO: string;
  CPRO: string;
  CMUN: string;
  DC: number;
  NOMBRE: string;
};

const workbook = XLSX.readFile(EXCEL_PATH);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

// La fila 0 es el título, la fila 1 son los headers. Saltamos la fila 0.
const allRows = XLSX.utils.sheet_to_json<IneRow>(sheet, { range: 1, raw: false });

const municipios = allRows
  .filter((row) => row.CPRO && row.CMUN && row.NOMBRE)
  .map((row) => ({
    codigo_ine: `${String(row.CPRO).padStart(2, "0")}${String(row.CMUN).padStart(3, "0")}`,
    nombre: row.NOMBRE,
    provincia_codigo: String(row.CPRO).padStart(2, "0"),
  }));

console.log(`Leídos ${municipios.length} municipios del Excel del INE.`);

// ----------------------------------------------------------------------
// Generación del SQL
// ----------------------------------------------------------------------

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

const sql: string[] = [];

sql.push(
  "-- =========================================================================",
  "-- 0002_seed_geografia.sql",
  "-- Carga inicial de geografía: CCAA, provincias, municipios.",
  "--",
  "-- Cambia las columnas latitud/longitud/poblacion de municipios a nullable",
  "-- porque por ahora no tenemos coordenadas (vendrán del Nomenclátor del CNIG",
  "-- en una migración posterior).",
  "-- =========================================================================",
  "",
  "-- ----- Ajuste de columnas: lat/lng/poblacion pasan a nullable -----",
  "",
  "alter table public.municipios alter column latitud   drop not null;",
  "alter table public.municipios alter column longitud  drop not null;",
  "",
  "-- ----- 19 CCAA -----",
  "",
  "insert into public.ccaa (codigo_ine, nombre) values",
  CCAA.map(([codigo, nombre]) => `  ('${codigo}', '${escapeSql(nombre)}')`).join(",\n"),
  "on conflict (codigo_ine) do nothing;",
  "",
  "-- ----- 52 provincias -----",
  "",
  "insert into public.provincias (codigo_ine, nombre, ccaa_codigo) values",
  PROVINCIAS.map(([codigo, nombre, ccaa]) => `  ('${codigo}', '${escapeSql(nombre)}', '${ccaa}')`).join(",\n"),
  "on conflict (codigo_ine) do nothing;",
  "",
  `-- ----- ${municipios.length} municipios -----`,
  "",
);

// Insertos de municipios en lotes de 1000 para no generar una sola sentencia gigantesca.
const BATCH_SIZE = 1000;
for (let i = 0; i < municipios.length; i += BATCH_SIZE) {
  const batch = municipios.slice(i, i + BATCH_SIZE);
  sql.push("insert into public.municipios (codigo_ine, nombre, provincia_codigo) values");
  sql.push(
    batch
      .map(
        (m) =>
          `  ('${m.codigo_ine}', '${escapeSql(m.nombre)}', '${m.provincia_codigo}')`,
      )
      .join(",\n"),
  );
  sql.push("on conflict (codigo_ine) do nothing;");
  sql.push("");
}

const outputPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "0002_seed_geografia.sql",
);

fs.writeFileSync(outputPath, sql.join("\n"), "utf8");

console.log(`SQL generado en ${outputPath}`);
console.log(`Líneas: ${sql.join("\n").split("\n").length}`);
console.log(`Tamaño: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

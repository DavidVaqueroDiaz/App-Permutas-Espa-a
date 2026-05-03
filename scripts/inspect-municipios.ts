/**
 * Script auxiliar para inspeccionar la estructura del Excel del INE
 * "diccionario26.xlsx" y entender sus columnas antes de escribir el
 * script de importación final.
 *
 * Ejecutar: npx tsx scripts/inspect-municipios.ts
 */
import * as XLSX from "xlsx";
import path from "node:path";

const EXCEL_PATH = path.join(
  process.cwd(),
  "descargas de cowork",
  "diccionario26.xlsx",
);

const workbook = XLSX.readFile(EXCEL_PATH);

console.log("=== HOJAS DEL EXCEL ===");
for (const name of workbook.SheetNames) {
  const sheet = workbook.Sheets[name];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  console.log(
    `  - ${name}: ${range.e.r - range.s.r + 1} filas, ${range.e.c - range.s.c + 1} columnas`,
  );
}

const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
  header: 1,
  raw: true,
});

console.log("\n=== PRIMERAS 5 FILAS ===");
for (let i = 0; i < Math.min(5, rows.length); i++) {
  console.log(`Fila ${i}:`, rows[i]);
}

console.log("\n=== FILAS 10-12 (datos típicos) ===");
for (let i = 10; i < Math.min(13, rows.length); i++) {
  console.log(`Fila ${i}:`, rows[i]);
}

console.log(`\nTotal de filas: ${rows.length}`);

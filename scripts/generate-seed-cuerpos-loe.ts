/**
 * Genera la migración SQL `0003_seed_cuerpos_loe.sql` con:
 *   - 12 cuerpos docentes LOE (RD 1834/2008 + LOMLOE).
 *   - ~250 especialidades repartidas entre ellos.
 *
 * Fuente:
 *   - PDF "Códigos de todas las especialidades" (Junta de Andalucía,
 *     basado en RD 1834/2008): cuerpos 511, 512, 513, 590, 591, 592,
 *     593, 594, 595, 596.
 *   - Cuerpo 597 Maestros: especialidades estándar del Anexo VI del
 *     RD 1834/2008.
 *
 * Ejecutar:
 *   npx tsx scripts/generate-seed-cuerpos-loe.ts
 *
 * Resultado: archivo `supabase/migrations/0003_seed_cuerpos_loe.sql`.
 */
import fs from "node:fs";
import path from "node:path";

type Cuerpo = {
  codigo: string;
  denominacion: string;
  subgrupo: string;
};

type Especialidad = {
  cuerpo_codigo: string;
  codigo: string;
  denominacion: string;
};

const NORMA = "RD 1834/2008";

const CUERPOS: Cuerpo[] = [
  { codigo: "511", denominacion: "Catedráticos de Enseñanza Secundaria",                  subgrupo: "A1" },
  { codigo: "512", denominacion: "Catedráticos de Escuelas Oficiales de Idiomas",         subgrupo: "A1" },
  { codigo: "513", denominacion: "Catedráticos de Artes Plásticas y Diseño",              subgrupo: "A1" },
  { codigo: "590", denominacion: "Profesores de Enseñanza Secundaria",                    subgrupo: "A1" },
  { codigo: "591", denominacion: "Profesores Técnicos de Formación Profesional",          subgrupo: "A2" },
  { codigo: "592", denominacion: "Profesores de Escuelas Oficiales de Idiomas",           subgrupo: "A1" },
  { codigo: "593", denominacion: "Catedráticos de Música y Artes Escénicas",              subgrupo: "A1" },
  { codigo: "594", denominacion: "Profesores de Música y Artes Escénicas",                subgrupo: "A1" },
  { codigo: "595", denominacion: "Profesores de Artes Plásticas y Diseño",                subgrupo: "A1" },
  { codigo: "596", denominacion: "Maestros de Taller de Artes Plásticas y Diseño",        subgrupo: "A2" },
  { codigo: "597", denominacion: "Maestros",                                               subgrupo: "A1" },
  { codigo: "598", denominacion: "Profesores Especialistas en Sectores Singulares de FP", subgrupo: "A2" },
];

// Especialidades del Cuerpo 590 (y por replicación 511, mismas).
const ESPECIALIDADES_590: [string, string][] = [
  ["001", "Filosofía"],
  ["002", "Griego"],
  ["003", "Latín"],
  ["004", "Lengua Castellana y Literatura"],
  ["005", "Geografía e Historia"],
  ["006", "Matemáticas"],
  ["007", "Física y Química"],
  ["008", "Biología y Geología"],
  ["009", "Dibujo"],
  ["010", "Francés"],
  ["011", "Inglés"],
  ["012", "Alemán"],
  ["013", "Italiano"],
  ["016", "Música"],
  ["017", "Educación Física"],
  ["018", "Orientación Educativa"],
  ["019", "Tecnología"],
  ["058", "Apoyo al Área de Lengua y Ciencias Sociales"],
  ["059", "Apoyo al Área Científica o Tecnología"],
  ["061", "Economía"],
  ["101", "Administración de Empresas"],
  ["102", "Análisis y Química Industrial"],
  ["103", "Asesoría y Procesos de Imagen Personal"],
  ["104", "Construcciones Civiles y Edificación"],
  ["105", "Formación y Orientación Laboral"],
  ["106", "Hostelería y Turismo"],
  ["107", "Informática"],
  ["108", "Intervención Sociocomunitaria"],
  ["109", "Navegación e Instalaciones Marinas"],
  ["110", "Organización y Gestión Comercial"],
  ["111", "Organización y Procesos de Mantenimiento de Vehículos"],
  ["112", "Organización y Proyectos de Fabricación Mecánica"],
  ["113", "Organización y Proyectos de Sistemas Energéticos"],
  ["114", "Procesos de Cultivo Acuícola"],
  ["115", "Procesos de Producción Agraria"],
  ["116", "Procesos en la Industria Alimentaria"],
  ["117", "Procesos Diagnósticos Clínicos y Procedimientos"],
  ["118", "Procesos Sanitarios"],
  ["119", "Procesos y Medios de Comunicación"],
  ["120", "Procesos y Productos Textil, Confección y Piel"],
  ["121", "Procesos y Productos. Vidrio y Cerámica"],
  ["122", "Procesos y Productos en Artes Gráficas"],
  ["123", "Procesos y Productos en Madera y Mueble"],
  ["124", "Sistemas Electrónicos"],
  ["125", "Sistemas Electrotécnicos y Automáticos"],
  ["803", "Cultura Clásica"],
];

// Cuerpo 591 — Profesores Técnicos de FP.
const ESPECIALIDADES_591: [string, string][] = [
  ["201", "Cocina y Pastelería"],
  ["202", "Equipos Electrónicos"],
  ["203", "Estética"],
  ["204", "Fabricación e Instalación de Carpintería y Mueble"],
  ["205", "Instalaciones y Mantenimiento de Equipos Térmicos"],
  ["206", "Instalaciones Electrotécnicas"],
  ["207", "Instalaciones y Equipos de Cría y Cultivo"],
  ["208", "Laboratorio"],
  ["209", "Mantenimiento de Vehículos"],
  ["210", "Máquinas, Servicios y Producción"],
  ["211", "Mecanizado y Mantenimiento de Máquinas"],
  ["212", "Oficina de Proyectos de Construcción"],
  ["213", "Oficina de Proyectos y Fabricación Mecánica"],
  ["214", "Operaciones y Equipos de Elaboración de Productos"],
  ["215", "Operaciones de Procesos"],
  ["216", "Operaciones y Equipos Producción Agraria"],
  ["217", "Patronaje y Confección"],
  ["218", "Peluquería"],
  ["219", "Procedimientos de Diagnóstico Clínico y Ortoprotésico"],
  ["220", "Procedimientos Sanitarios y Asistenciales"],
  ["221", "Procesos Comerciales"],
  ["222", "Procesos Gestión Administrativa"],
  ["223", "Producción en Artes Gráficas"],
  ["224", "Producción Textil y Tratamientos Físico-Químicos"],
  ["225", "Servicios a la Comunidad"],
  ["226", "Servicios de Restauración"],
  ["227", "Sistemas y Aplicaciones Informáticas"],
  ["228", "Soldadura"],
  ["229", "Técnicas y Procedimientos de Imagen y Sonido"],
];

// Cuerpo 592 — Profesores de EOI (y 512 Catedráticos EOI iguales).
const ESPECIALIDADES_592: [string, string][] = [
  ["001", "Alemán"],
  ["002", "Árabe"],
  ["006", "Español"],
  ["008", "Francés"],
  ["010", "Griego"],
  ["011", "Inglés"],
  ["012", "Italiano"],
  ["013", "Japonés"],
  ["015", "Portugués"],
  ["017", "Ruso"],
];

// Cuerpo 593 — Catedráticos de Música y Artes Escénicas.
const ESPECIALIDADES_593: [string, string][] = [
  ["002", "Armonía y Melodía Acompañada"],
  ["003", "Arpa"],
  ["005", "Danza Clásica"],
  ["006", "Canto"],
  ["007", "Caracterización"],
  ["008", "Clarinete"],
  ["009", "Clave"],
  ["010", "Composición"],
  ["013", "Conjunto Coral e Instrumental"],
  ["014", "Contrabajo"],
  ["015", "Contrapunto y Fuga"],
  ["017", "Danza Española"],
  ["020", "Dirección de Coro"],
  ["023", "Dirección de Orquesta y Conjunto Instrumental"],
  ["024", "Dramaturgia"],
  ["026", "Escenografía"],
  ["027", "Esgrima"],
  ["029", "Expresión Corporal"],
  ["030", "Fagot"],
  ["031", "Flauta de Pico"],
  ["032", "Flauta Travesera"],
  ["035", "Guitarra"],
  ["037", "Historia de la Cultura y del Arte"],
  ["038", "Historia de la Literatura Dramática"],
  ["039", "Historia de la Música"],
  ["042", "Instrumentos de Pulso y Púa"],
  ["043", "Interpretación"],
  ["050", "Música de Cámara"],
  ["051", "Musicología"],
  ["052", "Oboe"],
  ["053", "Órgano"],
  ["055", "Ortofonía y Dicción"],
  ["057", "Pedagogía"],
  ["058", "Percusión"],
  ["059", "Piano"],
  ["061", "Improvisación y Acompañamiento"],
  ["066", "Saxofón"],
  ["072", "Trombón"],
  ["074", "Trompa"],
  ["075", "Trompeta"],
  ["076", "Tuba"],
  ["077", "Viola"],
  ["078", "Violín"],
  ["079", "Violonchelo"],
  ["092", "Instrumentos de Cuerda Pulsada del Renacimiento y Barroco"],
  ["100", "Tecnología Musical"],
  ["102", "Viola da Gamba"],
];

// Cuerpo 594 — Profesores de Música y Artes Escénicas.
const ESPECIALIDADES_594: [string, string][] = [
  ["402", "Arpa"],
  ["403", "Canto"],
  ["404", "Clarinete"],
  ["405", "Clave"],
  ["406", "Contrabajo"],
  ["407", "Coro"],
  ["408", "Fagot"],
  ["410", "Flauta Travesera"],
  ["411", "Flauta de Pico"],
  ["412", "Fundamentos de Composición"],
  ["414", "Guitarra"],
  ["415", "Guitarra Flamenca"],
  ["416", "Historia de la Música"],
  ["417", "Instrumentos de Cuerda Pulsada del Renacimiento y Barroco"],
  ["419", "Oboe"],
  ["420", "Órgano"],
  ["421", "Orquesta"],
  ["422", "Percusión"],
  ["423", "Piano"],
  ["424", "Saxofón"],
  ["426", "Trombón"],
  ["427", "Trompa"],
  ["428", "Trompeta"],
  ["429", "Tuba"],
  ["431", "Viola"],
  ["432", "Viola da Gamba"],
  ["433", "Violín"],
  ["434", "Violonchelo"],
  ["435", "Danza Española"],
  ["436", "Danza Clásica"],
  ["437", "Danza Contemporánea"],
  ["438", "Flamenco"],
  ["439", "Historia de la Danza"],
  ["440", "Acrobacia"],
  ["441", "Canto Aplicado al Arte Dramático"],
  ["442", "Caracterización e Indumentaria"],
  ["443", "Danza Aplicada al Arte Dramático"],
  ["444", "Dicción y Expresión Oral"],
  ["445", "Dirección Escénica"],
  ["446", "Dramaturgia"],
  ["447", "Esgrima"],
  ["448", "Espacio Escénico"],
  ["449", "Expresión Corporal"],
  ["450", "Iluminación"],
  ["451", "Interpretación"],
  ["454", "Interpretación en el Teatro del Gesto"],
  ["455", "Literatura Dramática"],
  ["456", "Técnicas Escénicas"],
  ["457", "Técnicas Gráficas"],
  ["458", "Teoría e Historia del Arte"],
  ["460", "Lenguaje Musical"],
];

// Cuerpo 595 — Profesores de Artes Plásticas y Diseño (y 513 catedráticos).
const ESPECIALIDADES_595: [string, string][] = [
  ["501", "Cerámica"],
  ["502", "Conservación y Restauración de Materiales Arqueológicos"],
  ["503", "Conservación y Restauración de Obras Escultóricas"],
  ["504", "Conservación y Restauración de Obras Pictóricas"],
  ["505", "Conservación y Restauración de Textiles"],
  ["506", "Conservación y Restauración del Documento Gráfico"],
  ["507", "Dibujo Artístico y Color"],
  ["508", "Dibujo Técnico"],
  ["509", "Diseño de Interiores"],
  ["510", "Diseño de Moda"],
  ["511", "Diseño de Producto"],
  ["512", "Diseño Gráfico"],
  ["513", "Diseño Textil"],
  ["514", "Edición de Arte"],
  ["515", "Fotografía"],
  ["516", "Historia del Arte"],
  ["517", "Joyería y Orfebrería"],
  ["518", "Materiales y Tecnología: Cerámica y Vidrio"],
  ["519", "Materiales y Tecnología: Conservación y Restauración"],
  ["520", "Materiales y Tecnología: Diseño"],
  ["521", "Medios Audiovisuales"],
  ["522", "Medios Informáticos"],
  ["523", "Organización Industrial y Legislación"],
  ["524", "Vidrio"],
  ["525", "Volumen"],
];

// Cuerpo 596 — Maestros de Taller de Artes Plásticas y Diseño.
const ESPECIALIDADES_596: [string, string][] = [
  ["601", "Artesanía y Ornamentación con Elementos Vegetales"],
  ["602", "Bordados y Encajes"],
  ["603", "Complementos y Accesorios"],
  ["604", "Dorado y Policromía"],
  ["605", "Ebanistería Artística"],
  ["606", "Encuadernación Artística"],
  ["607", "Esmaltes"],
  ["608", "Fotografía y Procesos de Reproducción"],
  ["609", "Modelismo y Maquetismo"],
  ["610", "Moldes y Reproducciones"],
  ["611", "Musivaria"],
  ["612", "Talla en Piedra y Madera"],
  ["613", "Técnicas Cerámicas"],
  ["614", "Técnicas de Grabado y Estampación"],
  ["615", "Técnicas de Joyería y Bisutería"],
  ["616", "Técnicas de Orfebrería y Platería"],
  ["617", "Técnicas de Patronaje y Confección"],
  ["618", "Técnicas del Metal"],
  ["619", "Técnicas Murales"],
  ["620", "Técnicas Textiles"],
  ["621", "Técnicas Vidrieras"],
];

// Cuerpo 597 — Maestros (Anexo VI del RD 1834/2008).
const ESPECIALIDADES_597: [string, string][] = [
  ["031", "Educación Infantil"],
  ["032", "Lengua Extranjera: Inglés"],
  ["033", "Lengua Extranjera: Francés"],
  ["034", "Educación Física"],
  ["035", "Música"],
  ["036", "Pedagogía Terapéutica"],
  ["037", "Audición y Lenguaje"],
  ["038", "Educación Primaria"],
];

// Componer la lista global aplicando los pares "catedrático ↔ profesor".
const ESPECIALIDADES: Especialidad[] = [];

function añadir(cuerpo_codigo: string, lista: [string, string][]) {
  for (const [codigo, denominacion] of lista) {
    ESPECIALIDADES.push({ cuerpo_codigo, codigo, denominacion });
  }
}

añadir("511", ESPECIALIDADES_590); // Catedráticos de Secundaria comparten especialidades con 590.
añadir("512", ESPECIALIDADES_592); // Catedráticos de EOI comparten con 592.
añadir("513", ESPECIALIDADES_595); // Catedráticos de AAPP y Diseño comparten con 595.
añadir("590", ESPECIALIDADES_590);
añadir("591", ESPECIALIDADES_591);
añadir("592", ESPECIALIDADES_592);
añadir("593", ESPECIALIDADES_593);
añadir("594", ESPECIALIDADES_594);
añadir("595", ESPECIALIDADES_595);
añadir("596", ESPECIALIDADES_596);
añadir("597", ESPECIALIDADES_597);
// Cuerpo 598 (Profesores Especialistas en Sectores Singulares de FP, LOMLOE):
// las especialidades aún no están consolidadas en una norma única estatal.
// Se cargarán cuando dispongamos de la fuente oficial.

console.log(`Cuerpos: ${CUERPOS.length}`);
console.log(`Especialidades totales: ${ESPECIALIDADES.length}`);

// ----------------------------------------------------------------------
// Generación del SQL
// ----------------------------------------------------------------------

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

const sql: string[] = [];

sql.push(
  "-- =========================================================================",
  "-- 0003_seed_cuerpos_loe.sql",
  "-- Carga de cuerpos docentes LOE y sus especialidades.",
  "-- Fuente: RD 1834/2008 + LOMLOE.",
  "-- =========================================================================",
  "",
  "-- ----- 12 cuerpos LOE -----",
  "",
  "insert into public.cuerpos (sector_codigo, codigo_oficial, denominacion, subgrupo, norma_reguladora) values",
  CUERPOS.map(
    (c) =>
      `  ('docente_loe', '${c.codigo}', '${escapeSql(c.denominacion)}', '${c.subgrupo}', '${NORMA}')`,
  ).join(",\n"),
  "on conflict (sector_codigo, codigo_oficial, denominacion) do nothing;",
  "",
  `-- ----- ${ESPECIALIDADES.length} especialidades docentes -----`,
  "",
  "with valores(cuerpo_codigo, codigo, denominacion) as (",
  "  values",
);

const valoresLineas = ESPECIALIDADES.map(
  (e) =>
    `    ('${e.cuerpo_codigo}', '${e.codigo}', '${escapeSql(e.denominacion)}')`,
);
sql.push(valoresLineas.join(",\n"));

sql.push(
  ")",
  "insert into public.especialidades (cuerpo_id, codigo_oficial, denominacion)",
  "select c.id, v.codigo, v.denominacion",
  "from valores v",
  "join public.cuerpos c on c.sector_codigo = 'docente_loe' and c.codigo_oficial = v.cuerpo_codigo",
  "on conflict (cuerpo_id, codigo_oficial, denominacion) do nothing;",
  "",
);

const outputPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "0003_seed_cuerpos_loe.sql",
);

fs.writeFileSync(outputPath, sql.join("\n"), "utf8");

console.log(`SQL generado en ${outputPath}`);
console.log(`Tamaño: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

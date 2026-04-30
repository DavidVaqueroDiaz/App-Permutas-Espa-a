# PROGRESO

Plataforma nacional de permutas funcionariales en España. Nombre provisional: PermutaES.

Este archivo es la memoria viva del proyecto. Cada vez que retomemos sesión, lo primero que se lee es esto.

---

## Fase actual

**Fase de diseño CERRADA.** Las 7 tareas de planificación están entregadas, comiteadas y aprobadas por Vaquero. Las 16 decisiones (A-P) están cerradas.

**La próxima sesión arranca Fase 0 — Setup técnico.** Será la primera vez que se escriba código real del proyecto.

---

## Decisiones cerradas (2026-04-30)

- **Alcance**: todo el funcionariado español que pueda permutar legalmente. No hay "MVP de un solo sector". Desde el día 1 la app cubre todos los sectores con permuta admitida en la ley.
- **Tipo de permuta**: solo permutas DEFINITIVAS. Se elimina del modelo el campo "tipo (definitiva/provisional/ambas)" que aparecía en el prompt inicial.
- **Verificación de usuarios**: no hay en MVP. Cualquiera puede registrarse y publicar.
- **Algoritmo**: enforza las reglas legales. Si dos anuncios no pueden permutar legalmente (sector incompatible, especialidad distinta, ámbito geográfico no permitido, edad, antigüedad, carencia entre permutas, etc.), la app NO los empareja. No se limita a avisar.
- **Monetización**: ninguna. App gratuita. Monetización se evaluará en fase posterior.
- **Carpeta local**: `C:\Users\Usuario\Desktop\APP permutas`.
- **Repo**: https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a (público).
- **Push a GitHub**: lo hace Vaquero. Claude solo hace commits locales.

---

## Decisiones cerradas en Tarea 2 (2026-04-30)

- A: modelo de contacto entre usuarios = mensajería interna en la app.
- B: motivos de permuta = no se incluyen.
- C: visibilidad pública de anuncios = lectura limitada anónima, detalle solo para registrados.
- D: forma jurídica del responsable de tratamiento = autónomo (a revisar cuando haya tracción).

## Decisiones cerradas en Tarea 3 (2026-04-30)

- E: dato de edad = año de nacimiento (no fecha completa).
- F: caducidad de anuncios = 6 meses, renovable con un clic.
- G: idiomas de la taxonomía = solo castellano en MVP.
- H: retención de mensajes = 1 año desde último mensaje, luego borrado automático.

## Decisiones cerradas en Tarea 4 (2026-04-30)

- I: idioma de la interfaz = solo castellano en MVP.
- J: nivel de la landing pública = simple con explicación + buscador.
- K: notificaciones por email = solo email transaccional crítico.

## Decisiones cerradas en Tarea 5 (2026-04-30)

- L: stack tecnológico = Stack A (Next.js + Supabase + Vercel + Resend).

## Decisiones cerradas en Tarea 6 (2026-04-30)

- M: sector inicial Fase 1 = docencia LOE.

## Decisiones cerradas en Tarea 7 (2026-04-30)

- N: dominio propio se registra en Fase 3 (apertura al público). Hasta entonces, todo gratis con subdominio Vercel.
- O: cuentas de Twitter/X y LinkedIn desde Fase 2.
- P: blog editorial dentro de la app desde Fase 3, con 3-5 artículos iniciales.

---

## Resumen de las 16 decisiones cerradas (A-P)

| # | Decisión | Valor cerrado |
|---|---|---|
| A | Modelo de contacto entre usuarios | Mensajería interna en la app |
| B | Motivos de permuta | No se incluyen |
| C | Visibilidad pública de anuncios | Lectura limitada anónima, detalle solo para registrados |
| D | Forma jurídica del responsable de tratamiento | Autónomo (a revisar cuando haya tracción) |
| E | Dato de edad del usuario | Solo año de nacimiento |
| F | Caducidad de anuncios | 6 meses, renovable con un clic |
| G | Idiomas de la taxonomía | Solo castellano en MVP |
| H | Retención de mensajes | 1 año desde último mensaje, luego borrado automático |
| I | Idioma de la interfaz | Solo castellano en MVP |
| J | Nivel de la landing pública | Simple con explicación + buscador |
| K | Notificaciones por email | Solo email transaccional crítico |
| L | Stack tecnológico | Next.js + Supabase + Vercel + Resend |
| M | Sector inicial Fase 1 | Docencia LOE |
| N | Cuándo registrar dominio propio | Fase 3 (apertura al público) |
| O | Apertura de redes sociales | Twitter/X + LinkedIn desde Fase 2 |
| P | Blog dentro de la app | Sí, desde Fase 3 |

---

## Tareas de diseño completadas

Todas entregadas el 2026-04-30 y aprobadas por Vaquero. Todas comiteadas en el repo.

| Tarea | Documento | Decisiones cerradas |
|---|---|---|
| 1 — Lectura y comprensión | (parte de la sesión) | Punto de partida |
| 2 — Resumen ejecutivo | `TAREA_2_RESUMEN_EJECUTIVO.md` | A, B, C, D |
| 3 — Esquema de datos | `TAREA_3_ESQUEMA_DATOS.md` | E, F, G, H |
| 4 — Mock del formulario | `TAREA_4_MOCK_FORMULARIO.md` | I, J, K |
| 5 — Stack tecnológico | `TAREA_5_STACK_TECNOLOGICO.md` | L |
| 6 — Plan de fases | `TAREA_6_PLAN_DE_FASES.md` | M |
| 7 — SEO + GEO (descubrimiento por IA) | `TAREA_7_SEO_GEO.md` | N, O, P |

---

## Próxima sesión — Arrancar Fase 0 (setup técnico)

Plan según `TAREA_6_PLAN_DE_FASES.md` y `TAREA_7_SEO_GEO.md`:

### Acciones manuales que Vaquero debe hacer (yo le guiaré paso a paso)

1. Crear cuenta gratuita en Supabase (región Europa, `eu-west-1` o `eu-central-1`). Crear un proyecto llamado `permutaes-dev`.
2. Crear cuenta gratuita en Resend.
3. Decidir nombre de la app (probablemente `PermutaES`, pero abrir a alternativas).

### Acciones técnicas que hace Claude

1. Inicializar proyecto Next.js 15 + TypeScript + Tailwind dentro del repo.
2. Estructura de carpetas (rutas, componentes, librerías de utilidad, estilos).
3. Configurar autenticación Supabase básica.
4. Configurar Resend para emails transaccionales.
5. Configurar `robots.txt` permisivo a bots de IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Applebot-Extended).
6. Configurar `sitemap.xml` automático.
7. Crear `llms.txt` en raíz.
8. Página de inicio provisional (`PermutaES, próximamente`) para verificar despliegue.
9. Variables de entorno en local y en Vercel.
10. Documentar todo en `STACK_INSTALADO.md`.

### Criterios de salida de Fase 0

- URL de Vercel funcional (`permutaes.vercel.app` o subdominio asignado).
- Cualquier `git push` a `main` actualiza la URL en menos de 2 minutos.
- Vaquero puede registrarse vía Supabase Auth (aunque sea contra una pantalla provisional).

---

## Algoritmo central (recordatorio permanente)

Cada anuncio es un nodo de un grafo dirigido. Existe arista A→B si A aceptaría irse a la plaza actual de B Y se cumplen TODAS las reglas de compatibilidad legal (sector, cuerpo, especialidad, ámbito geográfico permitido por la norma del sector, requisitos personales).

Una "cadena de permutas" es un ciclo en ese grafo:

- **Cadena 2** = ciclo A→B→A. Permuta directa entre dos personas.
- **Cadena 3** = ciclo A→B→C→A. Tres movimientos simultáneos.
- **Cadena 4** = ciclo A→B→C→D→A. Cuatro movimientos simultáneos.

No se contemplan cadenas de longitud ≥ 5 (inmanejables operativamente).

Las plazas deseadas se almacenan como lista LIMPIA de códigos INE municipales (5 cifras). NO hay interpretación de texto libre. El usuario las selecciona clicando en el mapa o usando atajos (toda la provincia X, toda la CCAA Y, comarca Z, radio de N km).

---

## Convenciones del proyecto

- **Pasos pequeños y verificables.** Mejor un cambio probado que cinco mezclados.
- **Git desde el día 0.** Commits frecuentes con mensajes claros. Push lo hace Vaquero.
- **Estilo de comunicación.** Explicar como si Vaquero nunca hubiera tocado código. Preguntar antes de decisiones técnicas grandes (stack, dependencias, proveedores). No imponer.
- **PROGRESO.md vivo.** Se actualiza al final de cada sesión con lo que se haya cerrado y lo que quede pendiente.
- **Privacidad.** Nunca incluir emails ni datos personales en el repo. Nunca exponer datos de contacto en la UI hasta que haya match.

---

## Histórico

### 2026-04-30 — Sesión 1

- Vaquero entrega el prompt inicial extenso del proyecto y un informe de Perplexity de 26 páginas con el marco legal de las permutas en España.
- Claude lee ambos materiales íntegros.
- Se cierran las 5 decisiones de la sección "Decisiones cerradas".
- Se redacta un prompt extenso (Bloques A–F) para una segunda ronda de investigación en Perplexity, orientada a obtener catálogos exhaustivos y reglas operativas concretas. Vaquero ejecuta la investigación y aporta los 6 PDFs (`investigacion A.pdf` a `investigacion F.pdf`) más documentos oficiales adjuntos.
- Vaquero usa NotebookLM para resolver dudas adicionales (`dudas.txt`) y Cowork para descargar fuentes oficiales (`descargas de cowork/`: diccionario de municipios INE 2026, RD 184/2015 consolidado, Ordenación sanitaria 2021 del Ministerio, BEPSAP julio 2025).
- Se redacta un segundo prompt para Perplexity con las dudas que NotebookLM no pudo resolver y Vaquero entrega el resultado en `dudas perplexity.pdf`. Cubre cuerpos autonómicos (5 CCAA con regulación localizada), Policía Local (5 CCAA con regulación, todas intra-CCAA), Servicios de Salud (Aragón añade un trámite específico), catálogos descargables (solo Murcia).
- Se inicializa el repo Git en `C:\Users\Usuario\Desktop\APP permutas`, se conecta al remoto `https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a`, se crean `PROGRESO.md` y `.gitignore`, y se hace el commit inicial.
- El PDF de Perplexity, el `prompt inicial.txt`, los 6 PDFs de investigación, las dudas y las descargas de Cowork quedan en `.gitignore` (material de referencia personal — no se suben al repo público).
- Se entrega la Tarea 2 (`TAREA_2_RESUMEN_EJECUTIVO.md`): definición del producto, 7 sectores cubiertos desde el día 1, 12 sectores excluidos con justificación, matriz de reglas de matching por sector y 4 decisiones críticas (modelo de contacto, motivos de permuta, visibilidad pública, forma jurídica). Vaquero aprueba las 4 recomendaciones.
- Se entrega la Tarea 3 (`TAREA_3_ESQUEMA_DATOS.md`): modelo conceptual de 15 tablas agrupadas en 4 bloques (identidad, geografía, taxonomía profesional, operación), reglas de matching como pseudocódigo legible por sector, estrategia de ingesta de datos (inicial vs progresiva) y 4 decisiones técnicas (fecha nacimiento, caducidad anuncios, multilingüismo, retención mensajes). Vaquero aprueba las 4 recomendaciones.
- Se entrega la Tarea 4 (`TAREA_4_MOCK_FORMULARIO.md`): wizard de creación de anuncio en 8 pasos adaptables al sector elegido, pantalla de mapa con clic individual + autocompletado + atajos por provincia/CCAA/comarca/radio, vista pública limitada para anónimos, vista completa para registrados, mensajería interna entre participantes de cadenas detectadas, reglas de validación por campo y comportamientos ante casos límite. Se abren 3 decisiones (idioma interfaz, nivel landing, política de notificaciones). Vaquero pide aclarar el flujo de la landing y se añade la sección 1.1 con su descripción detallada (cabecera, hero con CTA "Publicar mi anuncio", buscador rápido funcional para anónimos, "Cómo funciona", sectores cubiertos, diferenciadores, CTA final, pie con atribuciones legales). Vaquero aprueba las 3 decisiones I, J, K.
- Se entrega la Tarea 5 (`TAREA_5_STACK_TECNOLOGICO.md`): glosario para no programadores, comparativa entre Stack A (Next.js + Supabase + Vercel + Resend, recomendado) y Stack B (Next.js + SQLite/Turso + Auth.js + Vercel + Resend, alternativo más simple), coste estimado mensual (~1€ al arrancar, ~65€ a escala) y de tiempo (~30-33 sesiones de trabajo, 3-4 meses), recomendación clara del Stack A y FAQ con las preguntas previsibles del usuario no programador. Vaquero aprueba la decisión L = Stack A.
- Se entrega la Tarea 6 (`TAREA_6_PLAN_DE_FASES.md`): plan de desarrollo en 5 fases (0 setup, 1 alfa interna con un solo sector, 2 beta privada con 5-15 invitados y resto de sectores, 3 beta pública sin promoción, 4 producción/lanzamiento) con criterios objetivos de transición y entregables por fase. Tiempo total ~32 sesiones. Coste acumulado de servicios ~10€ hasta producción, más revisión legal puntual ~150-300€. Vaquero aprueba la decisión M = docencia LOE y plantea preocupación sobre SEO para asistentes de IA.
- Se entrega la Tarea 7 (`TAREA_7_SEO_GEO.md`) a petición de Vaquero: estrategia de descubrimiento doble (SEO clásico + GEO/AEO para asistentes de IA tipo ChatGPT/Claude/Perplexity). Glosario, estructura técnica desde Fase 0 (HTML semántico, robots.txt permisivo a bots de IA, sitemap, llms.txt, JSON-LD Schema.org, Open Graph), páginas pilar en Fase 1 (`/que-es-una-permuta`, `/permutas/{sector}`, FAQ), presencia externa en Fase 2 (cuentas Twitter/X y LinkedIn, Google Search Console), blog editorial en Fase 3, dominio propio en Fase 3 o 4 (sin él no hay GEO serio). Vaquero pidió arrancar todo gratis posponiendo el dominio: el documento argumenta que el dominio (~10€/año) es necesario al menos para Fase 3 cuando hay exposición externa. Vaquero aprueba decisiones N (dominio en Fase 3), O (Twitter/X + LinkedIn desde Fase 2), P (blog editorial desde Fase 3).
- **CIERRE DE LA FASE DE DISEÑO.** Las 16 decisiones (A-P) están cerradas. 7 documentos de tarea + PROGRESO.md + .gitignore comiteados en 8 commits. La próxima sesión arranca Fase 0 (setup técnico) según el plan de Tarea 6.

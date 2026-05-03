# PROGRESO

Plataforma nacional de permutas funcionariales en España. Nombre provisional: PermutaES.

Este archivo es la memoria viva del proyecto. Cada vez que retomemos sesión, lo primero que se lee es esto.

---

## Fase actual

**Fase 1 — Alfa interna en curso.**
- Bloque 1 (modelo de datos en Supabase): COMPLETADO el 2026-04-30 (sesión 3).
- Bloque 2 (carga inicial de datos): COMPLETADO el 2026-04-30 (sesión 3) — geografía y taxonomía docente. Pendiente: GeoJSON, coordenadas y áreas sanitarias para fases posteriores.
- Próximo: Bloque 3 (pantallas de identidad: registro, login, recuperación, "Mi cuenta").

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

## Estado actual de la infraestructura

| Recurso | Valor / estado |
|---|---|
| URL pública | https://permutaes.vercel.app |
| Repo | https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a |
| Supabase | Proyecto `permutaes-dev` en Central EU (Frankfurt). URL en `.env.local` y en Vercel. |
| Resend | Cuenta activa, API key en `.env.local` y en Vercel. |
| Vercel | Proyecto `permutaes` (Hobby plan, gratis). Despliegue automático conectado a `main`. |
| Variables de entorno | 4 variables configuradas tanto en local (`.env.local`, ignorado por Git) como en Vercel (Production + Preview). |
| SEO/GEO base | `robots.txt` permisivo a bots de IA, `sitemap.xml` dinámico, `llms.txt`, metadatos completos en castellano. |

---

## Próxima sesión — Arrancar Fase 1 (alfa interna, docencia LOE)

Lo que toca construir, según `TAREA_6_PLAN_DE_FASES.md` y `TAREA_3_ESQUEMA_DATOS.md`:

1. Carga inicial de datos en Supabase: 8.131 municipios INE con coordenadas, GeoJSON nacional simplificado, CCAA y provincias, cuerpos LOE y especialidades docentes (a partir del PDF de Andalucía).
2. Modelo de tablas en Supabase según el esquema de Tarea 3 (al menos las del Bloque 1 Identidad, Bloque 2 Geografía y Bloque 3 Taxonomía Profesional para docencia).
3. Pantallas de identidad: registro, confirmación de email vía Resend, login, recuperación de contraseña, "Mi cuenta".
4. Wizard de creación de anuncio (8 pasos) solo para docencia LOE.
5. Pantalla del mapa con multi-clic + atajos por provincia/CCAA/comarca/radio.
6. Motor de matching para docencia (ciclos de 2, 3 y 4).
7. Pantallas "Mis anuncios" y "Cadenas detectadas".
8. Mensajería interna entre usuarios de una misma cadena.
9. Páginas pilar SEO: `/que-es-una-permuta`, `/permutas/docentes`, `/preguntas-frecuentes`.
10. Cookies y avisos legales mínimos.
11. Datos sintéticos de prueba: ~50 anuncios docentes provocando ciertos ciclos.

Estimación: ~15 sesiones de trabajo.

Criterios de salida de Fase 1: usuario nuevo puede registrarse, confirmar email, publicar un anuncio docente y verlo en "Mis anuncios" sin errores; el motor detecta correctamente las cadenas esperadas en datos sintéticos; emails transaccionales llegan a la bandeja en menos de 1 minuto.

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

### 2026-04-30 — Sesión 2 — Fase 0 (setup técnico) completada

- Vaquero crea cuenta y proyecto en Supabase: `permutaes-dev` en región Central EU (Frankfurt), plan free.
- Vaquero crea cuenta en Resend y genera API key.
- Claude monta el proyecto Next.js 16 + React 19 + TypeScript + Tailwind v4 dentro del repo. Resuelve el conflicto de carpeta no vacía creando el scaffold en subcarpeta temporal (`setup-tmp`) y moviendo el contenido a la raíz preservando `.git`, `PROGRESO.md` y los `TAREA_*.md`.
- Claude refuerza `.gitignore` con bloqueo amplio de archivos con "key", "secret", "token", "password", "credentials" en el nombre, después de detectar que Vaquero había guardado un `resend API key.txt` en la raíz.
- Claude configura SEO/GEO base: `src/app/robots.ts` dinámico permitiendo explícitamente bots de IA (GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, GoogleOther, CCBot, Applebot-Extended, Bytespider, Amazonbot, Meta-ExternalAgent), `src/app/sitemap.ts` dinámico, `public/llms.txt`, metadatos completos en `layout.tsx` (title, description, keywords, Open Graph, Twitter Cards, canonical, robots).
- Claude crea `src/app/page.tsx` con página provisional "PermutaES próximamente" explicando los 7 sectores cubiertos y los 3 pasos de funcionamiento.
- Claude crea `.env.local.example` con plantilla de las 4 variables de entorno (Supabase URL, Supabase publishable key, Resend API key, Resend from email). Vaquero rellena `.env.local` con las claves reales.
- Claude documenta el setup en `STACK_INSTALADO.md` y reescribe `README.md` con información del proyecto.
- Vaquero resuelve un bloqueo de PowerShell (ExecutionPolicy Restricted) ejecutando `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force`.
- Vaquero verifica `npm run dev` localmente y confirma que la página se ve en `http://localhost:3000`.
- Vaquero hace `git push` con los cambios (commit `372a444`).
- Vaquero importa el repo en Vercel como proyecto `permutaes`, configura las 4 variables de entorno (Production + Preview) y dispara el primer deploy.
- Despliegue exitoso en https://permutaes.vercel.app. Vaquero confirma que la URL pública carga correctamente.
- **CIERRE DE FASE 0.** La app está en internet con scaffold mínimo y SEO/GEO base. La próxima sesión arranca Fase 1 (alfa interna, docencia LOE).

### 2026-04-30 — Sesión 3 — Fase 1, Bloque 1 (modelo de datos) completado

- Vaquero pidió ver el esquema antes de continuar y aprobó arrancar con el núcleo mínimo de tablas (geografía, taxonomía, identidad) en lugar de las 15 de Tarea 3.
- Se cambió la regla del proyecto: a partir de ahora `git push` lo hace Claude automáticamente tras cada commit (antes lo hacía Vaquero). Memoria de proyecto actualizada.
- Claude instala `@supabase/ssr` y `@supabase/supabase-js`. Crea `src/lib/supabase/client.ts` (Browser Client), `src/lib/supabase/server.ts` (Server Client con cookies) y `src/middleware.ts` (refresca sesión en cada request, excluye estáticos y archivos especiales SEO).
- Claude crea `supabase/migrations/0001_initial_schema.sql` con:
  - Tablas de geografía: `ccaa`, `provincias`, `municipios` (PK código INE, índices, full-text search en castellano sobre nombre).
  - Tablas de taxonomía: `sectores`, `cuerpos`, `especialidades` (UUIDs, FKs y unique constraints).
  - Tabla `perfiles_usuario` que extiende `auth.users` con alias_publico, ano_nacimiento, consentimiento RGPD, trigger de actualizado_el.
  - RLS habilitado en todas. Geografía y taxonomía con lectura pública (anon + authenticated). `perfiles_usuario` con aislamiento por owner.
  - Datos semilla: inserción de los 7 sectores cubiertos según TAREA_2.
- Vaquero ejecuta el SQL en SQL Editor de Supabase. Resultado: "Success. No rows returned" — las 7 tablas y los 7 sectores creados sin errores.
- Claude modifica `src/app/page.tsx` para que sea Server Component asíncrono y lea los sectores desde Supabase en lugar de hardcodearlos.
- Despliegue automático en Vercel verifica end-to-end la conexión Next.js → Supabase. Vaquero confirma visualmente en https://permutaes.vercel.app que los 7 sectores aparecen ahora ordenados alfabéticamente (señal de que vienen de la BD).
- 2 commits creados (`ecbc86c`, `858af6b`) y pusheados.

### 2026-04-30 — Sesión 3 (continuación) — Fase 1, Bloque 2 (carga de datos) completado

- Vaquero pidió que Claude pudiera aplicar migraciones directamente sin copy/paste manual. Se reorganizó la conexión: variables `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_NAME` separadas en `.env.local` (en lugar de URL única, para evitar problemas con caracteres especiales en password).
- Tras varios intentos fallidos con la contraseña original, Vaquero regeneró la contraseña de la base de datos en Supabase. La nueva contraseña se acordó por chat de forma temporal con el compromiso de rotarla al final de la sesión.
- Claude crea `scripts/test-db-connection.ts`, `scripts/debug-db-url.ts` y `scripts/apply-migration.ts` para automatizar las migraciones. Dependencias nuevas: `pg`, `@types/pg`, `dotenv` (devDependencies).
- Migración 0002 (geografía): script `generate-seed-geografia.ts` que lee el Excel del INE `diccionario26.xlsx` y genera el SQL. Aplicada en 0.6s. 19 CCAA, 52 provincias y 8.132 municipios cargados (cifras oficiales INE 2026 enero).
- Migración 0003 (taxonomía docente): script `generate-seed-cuerpos-loe.ts` con datos hardcodeados extraídos del PDF "Códigos de todas las especialidades" (Junta de Andalucía, basado en RD 1834/2008). Aplicada en 0.1s. 12 cuerpos LOE (511, 512, 513, 590-598) y 318 especialidades cargadas.
- A partir de ahora cualquier migración se aplica con `npx tsx scripts/apply-migration.ts <ruta>` sin intervención manual de Vaquero.
- Pendiente para fases siguientes: coordenadas y población de los 8.132 municipios (Nomenclátor CNIG), GeoJSON nacional simplificado (datos.gob.es), áreas de salud por servicio sanitario, cuerpos AGE / autonómicos / locales / habilitados / policía local.

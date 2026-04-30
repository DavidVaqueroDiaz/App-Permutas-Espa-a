# PROGRESO

Plataforma nacional de permutas funcionariales en España. Nombre provisional: PermutaES.

Este archivo es la memoria viva del proyecto. Cada vez que retomemos sesión, lo primero que se lee es esto.

---

## Fase actual

**Diseño.** NO HAY CÓDIGO TODAVÍA. El repo guarda solo planificación hasta que cerremos esquema de datos, formulario y stack.

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

---

## Bloqueado a la espera de

Respuesta de Vaquero a las 3 decisiones planteadas en `TAREA_7_SEO_GEO.md` (N: cuándo registrar dominio propio, O: apertura de redes sociales, P: blog dentro de la app). Cuando se cierren, termina la fase de diseño y la siguiente sesión arranca Fase 0 (setup técnico).

---

## Tareas pendientes

1. **Tarea 2 — Resumen ejecutivo.** ENTREGADA en `TAREA_2_RESUMEN_EJECUTIVO.md` el 2026-04-30 y aprobada por Vaquero (decisiones A, B, C, D OK).
2. **Tarea 3 — Esquema de datos.** ENTREGADA en `TAREA_3_ESQUEMA_DATOS.md` el 2026-04-30 y aprobada por Vaquero (decisiones E, F, G, H OK).
3. **Tarea 4 — Mock del formulario.** ENTREGADA en `TAREA_4_MOCK_FORMULARIO.md` el 2026-04-30 y aprobada por Vaquero (decisiones I, J, K OK), ampliada con sección 1.1 sobre la landing pública.
4. **Tarea 5 — Stack candidato.** ENTREGADA en `TAREA_5_STACK_TECNOLOGICO.md` el 2026-04-30 y aprobada por Vaquero (decisión L = Stack A).
5. **Tarea 6 — Plan de fases.** ENTREGADA en `TAREA_6_PLAN_DE_FASES.md` el 2026-04-30 y aprobada por Vaquero (decisión M = docencia LOE).
6. **Tarea 7 — Estrategia SEO + GEO (descubrimiento por IA).** ENTREGADA en `TAREA_7_SEO_GEO.md` el 2026-04-30 a petición de Vaquero. Pendiente respuesta a decisiones N, O y P.

---

## Próxima sesión

Arrancar **Fase 0 — Setup técnico** según `TAREA_6_PLAN_DE_FASES.md`:
1. Inicializar proyecto Next.js + TypeScript + Tailwind.
2. Crear cuenta y proyecto Supabase (región Europa).
3. Conectar Vercel ↔ GitHub para despliegue automático.
4. Verificar despliegue inicial.
5. Configurar Resend.
6. Documentar en `STACK_INSTALADO.md`.

Vaquero deberá ejecutar acciones manuales (registrar cuentas en Supabase, Resend; registrar dominio si quiere). Claude le guiará paso a paso.

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
- Se entrega la Tarea 7 (`TAREA_7_SEO_GEO.md`) a petición de Vaquero: estrategia de descubrimiento doble (SEO clásico + GEO/AEO para asistentes de IA tipo ChatGPT/Claude/Perplexity). Glosario, estructura técnica desde Fase 0 (HTML semántico, robots.txt permisivo a bots de IA, sitemap, llms.txt, JSON-LD Schema.org, Open Graph), páginas pilar en Fase 1 (`/que-es-una-permuta`, `/permutas/{sector}`, FAQ), presencia externa en Fase 2 (cuentas Twitter/X y LinkedIn, Google Search Console), blog editorial en Fase 3, dominio propio en Fase 3 o 4 (sin él no hay GEO serio). Vaquero pidió arrancar todo gratis posponiendo el dominio: el documento argumenta que el dominio (~10€/año) es necesario al menos para Fase 3 cuando hay exposición externa. Decisiones abiertas: N (cuándo dominio), O (redes sociales), P (blog).

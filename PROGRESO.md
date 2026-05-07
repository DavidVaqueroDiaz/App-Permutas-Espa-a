# PROGRESO

Plataforma nacional de permutas funcionariales en España. Nombre provisional: PermutaES.

Este archivo es la memoria viva del proyecto. Cada vez que retomemos sesión, lo primero que se lee es esto.

---

## Fase actual

**Fase 1 — Alfa interna, recta final.**

Bloques cerrados:
- Bloque 1 (modelo de datos en Supabase) — 2026-04-30.
- Bloque 2 (carga inicial de datos: geografía y taxonomía docente) — 2026-04-30. Coords nacionales: 2026-05-04.
- Bloque 3 (pantallas de identidad: registro, login, recuperación, "Mi cuenta") — sesiones intermedias.
- Bloque 4 (wizard de creación de anuncio en 8 pasos) — sesiones intermedias.
- Bloque 5 parte 1/2 (mapa visual de selección en wizard, MapLibre + GeoJSON por CCAA) — 2026-05-04.
- Bloque 6 (motor de matching con detección de cadenas 2/3/4) — sesión intermedia.
- Bloque 7 (`/auto-permutas` con UI tipo PermutaDoc) — completado 2026-05-04.
- Bloque 8 (mensajería interna 1-on-1 + email transaccional con Resend) — 2026-05-04.

Pendiente para cerrar Fase 1:
- Bloque 5 parte 2/2: mapa visual también en `/auto-permutas` (modo single).
- Realtime de Supabase + cron de retención 2 años para mensajería.
- Panel admin para Vaquero (desarrollador) — al final.
- Bloque 9 (páginas pilar SEO: `/que-es-una-permuta`, `/permutas/docentes`, FAQ) — pendiente.
- Bloque 10 (cookies y avisos legales) — completado en sesiones intermedias.
- Bloque 11 (datos sintéticos de prueba) — completado (378 anuncios importados de PermutaDoc).

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
| H | Retención de mensajes | 2 años desde último mensaje, luego borrado automático *(actualizada el 2026-05-04: era 1 año, Vaquero lo amplía a 2 para no romper conexiones de un año a otro)* |
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

## Mejoras de UX detectadas (sesión 2026-05-06, paseo como usuario nuevo)

Apuntadas para implementar más adelante. Por orden de prioridad:

1. **Empty state del buscador de cadenas con explicación accionable.** Ahora dice solo *"No hay cadenas en esta categoría"*. Mejor: indicar cuántos anuncios se han analizado del cuerpo elegido, sugerir ampliar radio o añadir más localidades objetivo, y un CTA a publicar el propio anuncio.

2. **Aviso "alfa con datos de Galicia" en la home.** El mapa choropleta muestra los 380 anuncios casi todos en Galicia (porque solo hemos importado PermutaDoc). Sin contexto, parece que la app solo cubre Galicia. Añadir un aviso pequeño junto al mapa: *"Estamos en alfa. Los anuncios actuales vienen de la importación inicial de PermutaDoc. Cuando se abra el registro, los anuncios crecerán por toda España."*

3. **Etiqueta "En construcción" del hero choca con tener 380 anuncios.** Reformular a *"Versión alfa · Datos iniciales de Galicia"* o quitarla cuando ya haya tracción.

4. **Layout shift en `/auto-permutas` al elegir cuerpo.** El campo `Especialidad` aparece dinámicamente y empuja todo hacia abajo, haciendo que clicks en curso caigan en el campo equivocado. Reservar espacio o animar.

5. **Mensaje de error pegajoso en el formulario de auto-permutas.** El aviso *"Faltan datos…"* se queda visible mientras el usuario va rellenando. Limpiarlo en cuanto cambie cualquier campo.

6. **Atribución del mapa de la home dice "Code for Germany"**, suena raro. Cambiar a "CNIG / IGN España" u otra atribución natural.

7. **Logout vía link GET no cierra sesión.** El endpoint pide POST. Si un usuario distraído pulsa una hipotética URL `/logout`, se queda confuso al ver que sigue logueado. Considerar aceptar también GET, o redirigir con un formulario.

8. **"Otros sectores próximamente"** se lee como carencia. Reformular como *"Versión alfa: empezamos por docencia LOE. Más sectores se irán abriendo en beta."* — encuadre de decisión controlada, no de funcionalidad ausente.

9. **Placeholders de ejemplo en campos de localidad.** En `/auto-permutas` los inputs de plaza actual y destino dicen *"Empieza a escribir..."* y *"A dónde te gustaría ir..."*. Mejor con un ejemplo concreto: *"Ej: Zaragoza, Madrid, Vigo..."* — el usuario adivina mejor el formato.

10. **Mapa interactivo del wizard / auto-permutas en móvil.** Pendiente revisar UX en pantallas pequeñas: el modal a pantalla completa funciona pero el desplegable de CCAA + leyenda + map controls pueden quedar apretados.

11. **Hero de la home: aclarar qué funciona ya y qué no.** Una frase breve tipo *"Buscar cadenas y ver anuncios ya funciona. El registro y la mensajería están en alfa cerrada"* baja confusión sobre el estado del producto.

---

## Histórico

### 2026-05-07 — Sesión — Pre-lanzamiento: dominio propio, SMTP custom, branding final, accesibilidad de Contacto

Sesión larga de cierre antes de enviar invitaciones a alfa-testers. Tras esta sesión, la app está **lista para lanzamiento alfa**.

**1. Dominio propio `permutaes.es` operativo (commits previos en sesión).**
- DNS configurado y propagado: A/AAAA a Vercel, MX/SPF/DKIM/DMARC a Resend.
- `NEXT_PUBLIC_SITE_URL` y `RESEND_FROM_EMAIL=noreply@permutaes.es` añadidos a Vercel y desplegados.
- Supabase Auth → Site URL apuntando a `https://permutaes.es` y redirect URLs con `/**` wildcards. Confirmación de email y recuperación funcionan end-to-end.
- Centralizado el resolver de URL en `src/lib/site-url.ts`: `NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` → fallback. Sustituidas las 12 ocurrencias hardcoded de `permutaes.vercel.app`.

**2. SMTP custom de Supabase Auth con Resend (commit previo en sesión).**
- Como el dashboard de Supabase no exponía la opción SMTP, se hizo via **Management API**: script `scripts/aplicar-smtp-auth.ts` que activa `external_email_enabled` y configura `smtp_host=smtp.resend.com`, port 465, user `resend`, sender `noreply@permutaes.es`. Tras ejecutarlo y borrar el token de gestión, los correos de auth ya salen del dominio propio.

**3. Pulido de cierre — paquete de 12 puntos detectados por auditorías Comet/Cowork.**
- Wizard `/anuncios/nuevo`: ProgressBar arranca en 12 % en lugar de 0; "Guardar y salir" con toast; modal personalizado para "Empezar de cero" en lugar de `confirm()` nativo; edición inline desde el resumen del paso 8.
- Registro `/registro`: `useActionState` con `defaultValue` desde `valoresEnviados` para preservar inputs en error; `traducirErrorSupabase()` ES; `aria-invalid` en `campoConError`.
- Páginas globales: `not-found.tsx` y `error.tsx` en castellano con branding y CTAs; el error envía a Sentry.
- Skip-link "Saltar al contenido principal" añadido al layout (WCAG).
- JSON-LD `Organization` + `WebSite` en home; `AboutPage` en `/sobre-el-proyecto`; `FAQPage`, `Article` en sus páginas correspondientes.
- Cabecera: `<span>` en lugar de `<h1>` para no duplicar h1 por página.
- Aviso destacado en home explicando que los anuncios actuales son la importación inicial de Galicia.

**4. Demo no-contactable para anuncios importados (commit `3e39433`).**
- 381 anuncios importados de PermutaDoc tienen alias `permutadoc_<n>`. En lugar de borrarlos, se marcan como **demo no-contactables** para que la web siga poblada para visitas pero no se generen conversaciones fantasma.
- `src/lib/alias.ts`: helpers `esAliasImportado(alias)` (regex `^permutadoc_\d+$`) y `aliasMostrable(alias, contexto)` que humaniza "permutadoc_2622" → "Maestros · Música · en Sobrado" con contexto, "Usuario PermutaDoc #2622" sin él.
- Server action `iniciarConversacionDesdeAnuncio` rechaza con mensaje claro si el destinatario es demo. Banner amarillo en `/anuncios/[id]` y badge "📦 Demo" en `/anuncios` y `/auto-permutas`. Botón "Contactar" sustituido por texto en cursiva en demos.

**5. JOIN PostgREST roto en `/anuncios/[id]` y `/admin` (mismo commit).**
- Síntoma: 404 en TODOS los detalles de anuncios; admin mostraba 0/382. Causa: `anuncios.usuario_id` y `perfiles_usuario.id` referencian ambos a `auth.users(id)` por separado, sin FK directa entre ellas → PostgREST no puede inferir la relación.
- Fix: cargar el alias en una **segunda query** vía la vista `perfiles_publicos`. Mismo patrón aplicado en admin con `aliasPorUsuario` Map para resolver en lote.

**6. Página `/sobre-el-proyecto` con historia personal (commit `a0b8f94`).**
- Razón humana del proyecto: "Mi pareja es profesora. Aprobó las oposiciones y la destinaron a A Coruña, cuando ella es de Pontevedra…"
- Secciones: La historia, Quién está detrás, Por qué es gratis, A qué nos comprometemos, Cómo puedes ayudar.
- Página `/contacto` con form que envía via Resend con `replyTo` del usuario, rate-limit 3/hora por IP, destino vía `CONTACTO_EMAIL_DESTINO`.

**7. Branding final — nuevo logo SVG vectorial + foto real (commit `a0a762d`).**
- `public/logo.svg`: logo vectorial real (paths con `#061e14` y `#0e5239`), no PNG embebido.
- `scripts/optimizar-logo.ts` rasteriza desde SVG con `.trim()` para recortar márgenes A4 → genera `public/logo.png/256/512`, `src/app/icon.png` y `apple-icon.png`. Pasaron de 15 KB a 7,2 KB.
- HeaderClient usa `/logo.svg` directamente (escala perfecta), con fondo blanco redondeado para contraste sobre header verde.
- `/sobre-el-proyecto`: placeholder "DV" sustituido por foto real `public/sobre/david.jpeg`, 112×112 redonda con anillo sutil.

**8. Botón "Contacto" siempre accesible (commit `d313546`).**
- Desktop: chip "✉ Contacto" al final del nav, separado por divider sutil. Visible siempre (login o no).
- Móvil: entrada "✉ Contacto" en el hamburguesa, después de las opciones de cuenta y antes de Cerrar sesión.
- Antes había que bajar al footer para encontrarlo.

**Verificación pre-lanzamiento (al final de la sesión):**
- 15/15 páginas clave devuelven 200.
- DNS, Resend, SMTP, Sentry verificados.
- `/status` muestra 12 OK.
- og:image (175 KB), favicon (15 KB), HSTS activo.
- 11 env vars confirmadas en Vercel; token de Supabase Management borrado.

**Estado al cierre:** la app está lista para enviar invitaciones a alfa-testers. Próximo paso: enviar la primera tanda de invitaciones y observar feedback. Vaquero pendiente de hacer una **revisión estética** y pasar pequeños retoques de textos/formato.

---

### 2026-05-04 — Sesión — Tema visual PermutaDoc + mensajería + coords España + mapa wizard

Sesión densa con cinco bloques cerrados de un tirón.

**1. Migración del sistema visual al estilo PermutaDoc (commit `6701701`).**
- Nueva paleta brand verde botánico (`#0d4a3a` principal, mint `#5dcaa5`, `brand-bg/text` para avisos), variables `--shadow-card` y `--radius-xl2`, fondo general `#f8fafb`.
- Tipografías cambiadas: Geist sustituida por **DM Sans** (cuerpo) + **Sora** (titulares) cargadas con `next/font`.
- **Modo oscuro eliminado** completo: 312 ocurrencias `dark:` en 28 archivos quitadas con script de migración (después borrado). La app es siempre claro, igual que PermutaDoc.
- Reemplazo global `emerald-*` → `brand-*` y `bg-slate-900` → `bg-brand` en botones primarios.
- Cabecera nueva al estilo PermutaDoc: fondo brand verde con logo SVG en pastilla mint, accesos en pills con ring blanco.
- Tarjetas con `rounded-xl2` (14px) + `shadow-card` (sombra tintada en verde).

**2. Visualización de cadenas tipo PermutaDoc en `/auto-permutas` (commits `bf21be2`, `b69ed43`).**
- Nueva `CadenaCard` que replica `ResultCard` de PermutaDoc: cabecera con tipo de permuta + ruta cerrando el ciclo + porcentaje, badge "★ Mejor coincidencia" en la primera, diagrama `Chain` cerrando el ciclo, lista descriptiva "Los movimientos de la permuta", grid de detalles por participante con Centro / Tipo / Busca / Obs. / Anuncio del / km en línea recta + aviso ⚠ si > 30 días.
- `actions.ts` parsea ahora el campo `observaciones` de los anuncios importados de PermutaDoc — extrae tipo, zona deseada, centro origen y deja la observación libre limpia.
- Bug del corte del círculo S arreglado: nombres de 2 líneas ya no descuadran las columnas (`min-h-[2.5em]` con `leading-tight` en el span del nombre).

**3. Bloque A — Mensajería interna (commits `594c065`, `22dba19`, `baaf25c`).**
- Migración 0008: tablas `conversaciones` (par único usuario_a < usuario_b) y `mensajes` (max 2000 chars). Trigger que actualiza `ultimo_mensaje_el` y crea notificación tipo `mensaje_nuevo`. RLS estricta: solo participantes pueden leer; INSERT en conversaciones bloqueado salvo via RPC.
- RPCs `iniciar_conversacion(otro_usuario, mi_anuncio, su_anuncio)` con validación de taxonomía, `marcar_conversacion_vista(conv_id)` y `datos_email_destinatario_mensaje(conv_id)` para resolver email sin exponer auth.users al cliente.
- Server actions: `iniciarConversacion`, `iniciarConversacionDesdeAnuncio`, `enviarMensaje`, `listarMisConversaciones`, `leerConversacion`.
- Páginas `/mensajes` (bandeja con conteo de no leídos por conversación) y `/mensajes/[id]` (chat con burbujas brand para tus mensajes y blancas para las del otro, optimistic UI al enviar, Enter envía / Shift+Enter salto, scroll automático al fondo).
- Botón "Contactar →" en `/auto-permutas` conectado: redirige a `/mensajes/[conversacion_id]` o muestra el error si el usuario no tiene anuncio en la misma especialidad.
- Migración 0009: función `contar_conversaciones_con_no_leidos()` para badge mint en el Header.
- Migración 0010: función auxiliar para resolver email del destinatario y marcar notificación enviada.
- **Email transaccional con Resend** (decisión K - "solo email transaccional crítico"): plantilla HTML responsive con cabecera brand, citado del mensaje (sanitizado), CTA "Responder en PermutaES →". Best-effort: si falla no rompe el envío del mensaje. Se omiten emails a `@permutaes.test` (cuentas sintéticas importadas).

**4. Bloque C — Coordenadas de toda España (commit `daccf07`).**
- Investigación: comparativa de fuentes (CNIG oficial Shapefile, Wikidata SPARQL 76% cobertura, repos comunitarios, datos.gob.es). Decidido `softlinegeodb` (consolida INE + CNIG en dump SQL).
- `scripts/import-coords-spain.ts`: descarga el dump (~2 MB), parsea con regex la tabla `softlinegeodb_ine_municipios_geo`, calcula `codigo_ine = id_municipio_geo % 100000` (últimos 5 dígitos del campo CCAA+PROV+MUNI), aplica `UPDATE FROM VALUES` en lotes de 500 (no se usa TEMP TABLE porque el pooler de Supabase puede romper la transacción).
- Parche manual para Usansolo (48916, segregado de Galdakao en 2022, posterior al snapshot del dump). **Cobertura: 8.132 / 8.132 municipios** ✅. Esto desbloquea búsquedas en `/auto-permutas` para toda España (antes solo Galicia).
- Atribución añadida al aviso legal mencionando softlinegeodb (datos derivados de INE/CNIG, CC-BY 4.0 sobre los datos factuales).

**5. Bloque B parte 1/2 — Mapa interactivo en wizard (commit `fa5936c`).**
- `scripts/build-municipios-geojson.ts`: descarga el TopoJSON de `martgnz/es-atlas` (1,8 MB, INE como `id`), reconstruye GeoJSON con `topojson-client`, agrupa los 8.213 features por CCAA usando el mapping provincia→CCAA de la BD, combina polígonos múltiples del mismo municipio en MultiPolygon, parche manual para Usansolo. Genera 19 ficheros `public/geojson/munis-{ccaa}.geojson`. Cobertura: 8.132/8.132.
- Componente `MapaSelectorMunicipios` con MapLibre GL: reutilizable en modos `single` y `multi`. Desplegable de CCAA carga el fichero correspondiente bajo demanda. Render minimalista (sin basemap externo): polígonos sobre fondo slate-100. Estados visuales: disponible (slate-200), seleccionado (brand verde), excluido (amarillo, p.ej. tu plaza actual). Hover muestra nombre en popup. Outline brand marca el municipio bajo el cursor.
- Integración en Paso 5 del wizard: botón "🗺 Seleccionar en el mapa" debajo del autocompletado, modal a pantalla completa, carga perezosa con `next/dynamic` (MapLibre pesa ~700 KB gzip y solo se baja al abrir el modal).

**Pendiente para mañana:**

1. **Bloque B parte 2/2 — Mapa interactivo en `/auto-permutas`**: botón "🗺 Seleccionar en el mapa" junto al campo "Localidad objetivo" que abra el mismo `MapaSelectorMunicipios` en modo `single`. Pulido UX móvil + accesibilidad por teclado.
2. **Mejoras pendientes del bloque A** (mensajería):
   - Realtime de Supabase para que los mensajes nuevos aparezcan sin recargar.
   - Cron diario de retención (borrar conversaciones inactivas > 2 años, decisión H).
3. **Panel de administración para Vaquero (desarrollador)** — al final de Fase 1.

### 2026-05-03 — Sesión — Fixes en Auto permutas

- Bug 1: el buscador no encontraba "A Coruña" cuando se escribía "a coru". Causa: `normalizar` quitaba comas y bajaba a minúsculas, pero no había paso para neutralizar el artículo ("Coruña, A" vs "A Coruña" vs "a coru"). Solución: nueva función `clave(s) = quitarArticulo(normalizar(s))` aplicada en ambos lados de la comparación. Ahora "a coru", "coru", "a coruña" y "coruña a" resuelven al mismo municipio.
- Bug 2: 11 municipios gallegos quedaron sin coordenadas tras la primera importación. El INE los guarda como "Coruña, A", "Baña, A", etc. y la regex de `quitarArticulo` en el script estaba en minúsculas y se aplicaba antes de `normalizar`, así que no acertaba el artículo pospuesto. Aplicado el mismo fix en `scripts/import-coords-galicia.ts` y reejecutado: 302 → 311 municipios gallegos con coords. Quedan 2 fuera del alcance porque no están en la fuente PermutaDoc: "A Peroxa" (32059) y "Pobra do Brollón" (27047, typo "de"/"do" en upstream). Cesuras está obsoleto desde 2013.
- Commit: `a132711 fix(auto-permutas): autocomplete y coords reconocen articulo pospuesto`. Push pendiente.

**Pendiente para próximas sesiones (estado al cierre del 2026-05-03):**

1. ~~Mapa interactivo wizard~~ → parte 1/2 hecha el 2026-05-04. Falta parte 2/2 (auto-permutas + pulido).
2. ~~Replicar detalle visual de PermutaDoc en /auto-permutas~~ → hecho el 2026-05-04.
3. ~~Mensajería interna entre participantes~~ → hecha en 2026-05-04 (faltan Realtime y cron de retención).
4. ~~Cargar coordenadas para el resto de España~~ → hecho el 2026-05-04 (8.132 / 8.132).
5. **Panel de administración para Vaquero (desarrollador)** — al final del ciclo. Acceso solo cuando Vaquero inicia sesión con su cuenta. Funciones: eliminar cualquier anuncio, y otras funciones de operación a concretar (eliminar usuarios, ver totales agregados, limpiar BD, etc.). Aún no se ha definido el detalle; se cierra cuando lleguemos a ese punto.

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

# TAREA 7 — Estrategia de descubrimiento (SEO clásico + IA)

Documento añadido al cierre de la sesión 1 a petición de Vaquero. Cubre cómo lograr que la app sea descubierta tanto por buscadores tradicionales (Google, Bing) como por asistentes de IA (ChatGPT, Claude, Perplexity, Google AI Overviews, Copilot).

Este documento es complementario al plan de fases y cruza con casi todas las fases. Lo tratamos aparte porque la estrategia de visibilidad merece un documento propio.

---

## 1. Por qué este documento es importante

Hoy los usuarios buscan información de tres formas:

1. **Buscadores clásicos** (Google, Bing). Escriben palabras clave y reciben enlaces. Aquí ya hay cierta gente buscando "permutas funcionariales", "permuta docentes Galicia", etc.
2. **Asistentes de IA conversacionales** (ChatGPT, Claude, Perplexity, Gemini, Copilot). Escriben preguntas en lenguaje natural y reciben una respuesta directa. *"¿Dónde puedo buscar permutas de funcionario en España?"*. La IA decide qué fuentes citar y cuáles recomendar.
3. **Redes sociales y foros** (Facebook, Twitter, Reddit, foros sectoriales). El boca a boca digital.

**SEO clásico** = optimización para los buscadores tradicionales.
**GEO** (Generative Engine Optimization) o **AEO** (Answer Engine Optimization) = optimización para que las IAs recomienden tu sitio cuando un usuario les pregunta.

GEO es el concepto NUEVO y crucial para el caso de Vaquero. Se diferencia del SEO clásico en que:
- Las IAs no muestran 10 enlaces, dan UNA respuesta o recomiendan UN puñado de fuentes. La competencia es brutal.
- Las IAs valoran no solo lo que dice tu web, sino lo que **otros sitios autorizados dicen sobre ella**.
- Las IAs leen y absorben contenido estructurado (Schema.org, FAQ, listas claras) mucho mejor que texto suelto.

PermutaES tiene una ventaja: **es la primera plataforma nacional**. No hay competencia directa establecida. Si llegamos primero al imaginario de las IAs, capturamos la respuesta por defecto.

---

## 2. Glosario rápido

| Término | Qué es |
|---|---|
| **SEO** (Search Engine Optimization) | Conjunto de técnicas para aparecer alto en Google/Bing. |
| **GEO** (Generative Engine Optimization) | Técnicas para que asistentes de IA recomienden tu web. |
| **AEO** (Answer Engine Optimization) | Sinónimo cercano. Optimización para que tu contenido sea la "respuesta" en buscadores con IA. |
| **Schema.org** / **JSON-LD** | Etiquetas invisibles en el HTML que describen el contenido. Ej: "esta página es una FAQ", "esto es una organización con dirección X". Google y las IAs las leen. |
| **llms.txt** | Archivo estándar nuevo (2024) en la raíz del sitio donde explicas a las IAs qué cubre tu web y qué endpoints expones. |
| **robots.txt** | Archivo en la raíz donde decides qué bots pueden entrar. Algunos sitios bloquean a GPTBot, ClaudeBot... nosotros los queremos dejar entrar. |
| **Sitemap** | Lista en formato XML de todas las URLs de tu sitio para que los crawlers las descubran. |
| **Backlinks** | Enlaces desde otros sitios hacia el tuyo. Cuantos más y de mejor calidad, más autoridad percibida. |
| **Open Graph** / **Twitter Cards** | Metadatos para que cuando alguien comparta un enlace en redes sociales aparezca con título, imagen y descripción bonita. |
| **Páginas pilar** | Páginas largas y autorizadas sobre un tema concreto. Las IAs y Google las identifican como "fuentes de referencia". |

---

## 3. Qué hacemos desde el día 1 (Fase 0 y Fase 1)

Estos son fundamentos técnicos que NO se añaden al final — se montan desde el principio porque cuesta poco hacerlos bien y mucho retroactivamente.

### 3.1 Estructura técnica básica

| Elemento | Qué hacemos | Por qué |
|---|---|---|
| **HTML semántico** | Usar correctamente `<h1>`, `<h2>`, `<article>`, `<nav>`, `<main>`, etc. | Los crawlers (humanos, Google, IA) entienden la jerarquía del contenido. |
| **URLs amigables** | `/permutas/docentes/ingles` en lugar de `/p?id=4321&t=2`. | Más legibles para humanos y para máquinas. |
| **Sitemap.xml** | Generado automáticamente por Next.js. Lista todas las páginas indexables. | Google lo lee para descubrir el sitio. |
| **robots.txt** | Configuramos para permitir explícitamente los bots de IA: `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`, `Applebot-Extended`. | Por defecto algunos sitios los bloquean. Nosotros queremos lo contrario. |
| **llms.txt** | Archivo en la raíz que describe la app: qué hace, qué sectores cubre, qué URLs son las principales. | Estándar emergente (2024). Las IAs lo leen para entender el sitio rápido. |
| **HTTPS y velocidad** | Vercel ya lo da automático. | Las IAs y Google penalizan sitios lentos o inseguros. |
| **Datos estructurados (JSON-LD)** | Marcamos cada página relevante con Schema.org: `Organization` para la app, `WebSite` para el sitio, `FAQPage` para las preguntas frecuentes, `BreadcrumbList` para la navegación. | Google AI Overviews y otros asistentes consumen estos datos. |
| **Open Graph y Twitter Cards** | Cada página con su título, descripción e imagen optimizadas para compartir en redes. | Cuando alguien comparte el enlace, aparece bonito en WhatsApp, Facebook, Twitter. |

### 3.2 Contenido SEO/GEO desde el día 1

La landing pública (Tarea 4, sección 1.1) ya incluye un bloque "¿Cómo funciona?" y un bloque "Sectores cubiertos". A esos vamos a añadir páginas dedicadas:

- **Página por sector**: `/permutas/docentes`, `/permutas/sanidad`, `/permutas/age`, etc. Cada una con:
   - Definición clara: "¿Qué es una permuta para [sector]?"
   - Marco legal aplicable (mención breve de la norma).
   - Requisitos para permutar.
   - Cómo usar PermutaES para este sector.
   - FAQ con 5-10 preguntas habituales.
- **Página explicativa larga**: `/que-es-una-permuta`. Definición canónica de qué es una permuta funcionarial. Esta será la página pilar — el objetivo es que las IAs la citen como fuente cuando alguien pregunta "qué es una permuta de funcionario".
- **Página "Cómo funciona la app"**: `/como-funciona`. Explicación paso a paso del flujo (registrarse → publicar → recibir alertas → contactar).
- **Página de FAQ general**: `/preguntas-frecuentes`. Con marcado FAQPage Schema.

Estas páginas se construyen en **Fase 1** (alfa interna) junto con el resto de la app. No son algo que añadamos al final.

---

## 4. Qué hacemos en Fase 2 — Presencia externa

Hasta ahora todo eran cosas dentro de nuestra propia web. En Fase 2 (beta privada) empezamos a sembrar presencia FUERA de la app, que es lo que las IAs valoran de verdad.

### 4.1 Backlinks orgánicos iniciales

- **Wikipedia**: añadir referencia a PermutaES en los artículos de "Permuta (Derecho)" o crear sección sobre permutas funcionariales si no existe. Cuidado: Wikipedia exige neutralidad y fuentes — nada de autopromoción descarada. Lo razonable es que cuando llevemos 6 meses con la app funcionando, alguien externo cite la app como fuente; nosotros no debemos editar Wikipedia con conflicto de interés.
- **Foros sectoriales** (Funcionarios.net, foros sindicales): mencionar la app cuando ALGUIEN pregunta sobre permutas. No spammear. Aportar valor primero.
- **Blogs personales y de sindicatos**: tu propio LinkedIn o blog si lo tienes; ofrecer una pieza explicativa a sindicatos colaboradores cuando las relaciones lo permitan (Fase 4).

### 4.2 Presencia social mínima

Cuenta de la app en:
- **Twitter/X** (alta autoridad para crawlers).
- **LinkedIn** (público profesional, alto peso para SEO B2B).
- Posiblemente **Mastodon** y **Bluesky** (público técnico).

Publicar de forma regular pero ligera: cada cadena de permuta detectada (anonimizada), cada nuevo sector activado, cualquier hito.

### 4.3 Indexación explícita

- Enviar sitemap a **Google Search Console** y **Bing Webmaster Tools**.
- Verificar que los bots de IA están entrando: revisar logs.
- Solicitar inclusión en directorios temáticos relevantes (asociaciones, portales de empleo público, etc.).

---

## 5. Qué hacemos en Fase 3 — Beta pública

### 5.1 Contenido editorial

Empezar a publicar en un blog dentro del propio dominio de PermutaES:

- "Cómo gestionar una permuta de [sector] paso a paso" (un artículo por sector).
- "Casos de éxito": cadenas reales detectadas (con consentimiento de los implicados, anonimizadas).
- "Comparativa: permuta vs concurso de traslados" (ya investigado en los PDFs de la sesión 1).
- "Marco legal de las permutas funcionariales en España" (basado en la investigación inicial).

Cada artículo es una página optimizada SEO, citable por IAs.

### 5.2 Reseñas y menciones controladas

Incentivar a usuarios beta a:
- Mencionar la app en grupos de Facebook de permutas (sin spam).
- Escribir reseñas en Trustpilot, Google Maps (si registras la actividad), etc.

### 5.3 Pruebas con asistentes de IA

Mensualmente probar:
- *"¿Dónde puedo buscar permutas de funcionario en España?"* en ChatGPT, Claude, Perplexity, Gemini.
- Si la app no aparece, analizar qué cita y por qué. Ajustar contenido/estrategia.

---

## 6. Qué hacemos en Fase 4 — Lanzamiento

### 6.1 Dominio propio (decisión técnica importante)

Hasta ahora la app vive en `permutaes.vercel.app` (subdominio gratuito de Vercel). En Fase 4 esto es **insuficiente** para SEO/GEO porque:

- Los buscadores y las IAs valoran mucho menos los subdominios de plataformas (vercel.app, netlify.app, github.io).
- Compartir el enlace en redes sociales con `permutaes.vercel.app` da imagen de no-profesional.
- No puedes redirigir un dominio externo si quieres migrar (estás atado).

**Mi recomendación: registrar el dominio al inicio de Fase 4** (no en Fase 0, como tú prefieres). Coste: ~10€/año para un `.es` o `.com`. Sugerencia de nombres: `permutaes.es`, `permutaes.com`, `permutaes.app`.

Si quieres adelantarlo, en Fase 3 (cuando abrimos al público) el dominio ya marcaría diferencia para que las IAs empiecen a indexar la URL definitiva.

**Lo que NO recomiendo**: arrancar producción sin dominio propio. Penalizaríamos toda la estrategia GEO/SEO desde el primer día.

### 6.2 Comunicación de lanzamiento

- Nota de prensa breve a medios sectoriales (Magisnet en educación, Diario Médico en sanidad, etc.).
- Email a sindicatos ofreciendo la herramienta gratuita.
- Hilo en Twitter/X explicando el proyecto.
- Post en LinkedIn extenso.
- Posible aparición en podcasts de funcionarios (los hay).

Cada canal genera potencialmente backlinks y menciones.

### 6.3 Optimización continua

A partir de aquí el SEO/GEO ya no es un proyecto puntual sino una rutina:
- Cada 2 meses, revisar qué responden las IAs cuando se les pregunta sobre permutas funcionariales.
- Añadir o refinar páginas según los huecos detectados.
- Mantener la actividad en redes sociales y blog.

---

## 7. Cómo encaja esto con el plan de fases existente

Reformulación rápida del plan de Tarea 6 incorporando SEO/GEO:

| Fase | Trabajo SEO/GEO añadido |
|---|---|
| **Fase 0** | Sin trabajo de SEO específico — solo la base técnica (HTML semántico, robots.txt, sitemap, HTTPS por Vercel). Coste cero. |
| **Fase 1** | Páginas pilar: `/que-es-una-permuta`, `/como-funciona`, `/preguntas-frecuentes`. JSON-LD en cada una. Open Graph y Twitter Cards. llms.txt. Coste: 1-2 sesiones extra dentro de las 15 ya planificadas. |
| **Fase 2** | Apertura de cuentas en Twitter/X y LinkedIn. Primera publicación. Inscripción en Google Search Console y Bing Webmaster. Coste: 0,5 sesión extra. |
| **Fase 3** | 3-5 artículos de blog ya publicados. Pruebas mensuales con IAs. Coste: 1-2 sesiones extra dentro de las 4 ya planificadas. |
| **Fase 4** | Dominio propio registrado y migración. Plan de comunicación con backlinks. Coste: 0,5 sesión extra + 10-15€/año del dominio. |

Total adicional: ~3-4 sesiones repartidas y ~10-15€/año.

---

## 8. Lo que necesito que decidas

Tres puntos para cerrar:

### Decisión N — Cuándo registramos el dominio propio

- **N1 — Fase 4 (lanzamiento)**: dominio justo cuando se quita la etiqueta BETA y se anuncia públicamente. Coste 0€ hasta entonces.
- **N2 — Fase 3 (beta pública)**: dominio cuando abrimos a internet sin promoción. Las IAs ya empezarían a indexar la URL definitiva. Coste: 10-15€ adelantado.
- **N3 — Fase 0 (ahora)**: dominio desde el principio. Máximo beneficio SEO/GEO. Coste: 10-15€/año desde ya.

**Mi recomendación: N2 (Fase 3)**. Equilibra tu petición de "todo gratis al principio" con la realidad de que sin dominio no hay GEO serio. En Fase 0, 1 y 2 no hay nadie de fuera mirando, así que da igual la URL. En Fase 3 abrimos al público y necesitamos que las IAs vean una URL "seria" desde el primer día de exposición externa. 10€ una vez, no es una inversión grande.

### Decisión O — Apertura de cuentas en redes sociales

- **O1 — Twitter/X + LinkedIn desde Fase 2** (lo que recomendé en el plan).
- **O2 — Solo cuando la app salga a producción (Fase 4)**.

**Mi recomendación: O1**. Cuanto antes tengamos cuentas activas (aunque publiquemos poco) más reputación digital iremos sumando.

### Decisión P — Blog dentro de la app

- **P1 — Sí, blog desde Fase 3** (3-5 artículos al lanzar pública).
- **P2 — No blog en MVP**, nos centramos solo en las páginas pilar.

**Mi recomendación: P1**. El blog es la principal fuente de tráfico orgánico a medio plazo y la materia prima que las IAs absorben. Sin blog, dependemos solo de las páginas pilar, que se quedan cortas en cobertura semántica.

---

## 9. Resumen para ti

- Vamos a montar la **base técnica de SEO/GEO desde Fase 0**, sin coste extra.
- Vamos a **construir contenido optimizado** desde Fase 1 (páginas pilar) y Fase 3 (blog).
- Vamos a **abrir presencia externa** (redes sociales, backlinks) desde Fase 2.
- En Fase 3 (beta pública) o Fase 4 (lanzamiento) **registramos dominio propio** — sin él, todo el SEO/GEO se desinfla.
- Probaremos periódicamente con asistentes de IA si la app aparece cuando alguien pregunta dónde permutar como funcionario.

El objetivo: cuando alguien le pregunte a ChatGPT, Claude o Perplexity *"¿dónde puedo encontrar permutas de plaza para funcionarios en España?"*, **PermutaES esté entre las 3 primeras fuentes que cite**.

---

Cuando me respondas a las decisiones N, O y P, **se cierra completamente la fase de diseño** y arrancamos Fase 0 en la siguiente sesión.

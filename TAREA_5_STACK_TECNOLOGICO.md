# TAREA 5 — Stack tecnológico

Documento entregado al cierre de la sesión 1. Recoge las decisiones cerradas en Tareas 2, 3 y 4.

Este documento te propone **dos stacks alternativos** y te explica cada pieza en lenguaje claro. Al final hay una **recomendación** y la decisión final la tomas tú. No hay código todavía. Cuando elijas stack, montaremos el esqueleto técnico en la siguiente sesión y empezará la programación de verdad.

---

## 1. ¿Qué es un "stack" y por qué importa esta decisión?

Un stack es el conjunto de herramientas y tecnologías que se usan para construir una aplicación. Como cuando montas un mueble: necesitas una madera (el lenguaje y framework), unos tornillos (las librerías), unas piezas extra (la base de datos, el servicio de email) y un sitio donde dejarlo (el hosting). Cada decisión condiciona las siguientes.

Esta es **la decisión técnica más grande** del proyecto. Una vez elegido el stack, cambiarlo a mitad de camino es muy costoso. Por eso te lo presento con detalle.

---

## 2. Glosario rápido (sin tecnicismos)

| Término | Qué es, en lenguaje normal |
|---|---|
| **Frontend** | La parte visible de la web. Lo que ve el usuario en su navegador. |
| **Backend** | La parte invisible. El servidor que responde cuando el usuario hace algo (publicar anuncio, buscar, etc.). |
| **Framework** | Un esqueleto pre-hecho de código que evita empezar de cero. Ejemplo: React, Next.js. |
| **Base de datos** | Donde se guardan los anuncios, usuarios, mensajes... de forma estructurada y permanente. |
| **API** | El "menú" de cosas que el frontend puede pedirle al backend. Cuando publicas un anuncio, el navegador llama a una API del backend. |
| **Hosting** | El sitio físico (un servidor en algún lugar del mundo) donde vive tu aplicación. |
| **Despliegue** | El proceso de subir tu código al hosting para que funcione en internet. |
| **Auth (autenticación)** | El sistema de usuarios y contraseñas. Quién es quién y quién puede hacer qué. |
| **CDN** | Una red que reparte tu web por servidores de todo el mundo para que cargue rápido en cualquier país. |

---

## 3. Componentes que hay que elegir

Para PermutaES necesitamos decidir 9 piezas:

1. Framework de frontend.
2. Framework / forma del backend.
3. Base de datos.
4. Sistema de autenticación.
5. Librería del mapa interactivo.
6. Fuente y formato de los datos geográficos.
7. Hosting (dónde vive la web).
8. Servicio de email transaccional.
9. Dominio.

Cada stack que te propongo cubre los 9.

---

## 4. STACK A — Recomendado (Next.js + Supabase)

### 4.1 Visión global

Un solo proyecto Next.js que contiene frontend y backend juntos. Una sola plataforma (Supabase) que da base de datos, autenticación y almacenamiento. Hosting en Vercel, donde ya tienes cuenta. Mapa con Leaflet sobre OpenStreetMap, ambos gratuitos.

Esta es la combinación más estándar hoy en proyectos similares. Tiene comunidad enorme, mucha documentación, y Vercel + Supabase tienen plan gratuito generoso suficiente para arrancar.

### 4.2 Detalle de cada pieza

| Componente | Elección | Por qué |
|---|---|---|
| **Frontend + backend** | Next.js 15 (con React) | Es el estándar actual. Un mismo proyecto contiene frontend y backend. PermutaDoc ya usaba React, así que parte del conocimiento se reaprovecha. Funciona bien con SEO (Google lee mejor las webs hechas con Next.js que las hechas con React puro). |
| **Lenguaje** | TypeScript | Es JavaScript con avisos automáticos cuando cometes errores de tipo. Reduce bugs sin esfuerzo. |
| **Estilos** | Tailwind CSS | El mismo que usaste en PermutaDoc. Permite estilar muy rápido sin escribir CSS aparte. |
| **Base de datos** | PostgreSQL gestionado por Supabase | Postgres es la base de datos relacional más potente y libre. Supabase nos la da gestionada (no la mantenemos nosotros) y añade una capa con muchos extras. |
| **Autenticación** | Supabase Auth | Viene incluido con Supabase. Soporta registro con email, recuperación de contraseña, sesiones, y el día de mañana login con Google si hace falta. |
| **Almacenamiento de archivos** | Supabase Storage | Por si en el futuro necesitamos guardar PDFs (justificantes de matrícula, etc.). Incluido. |
| **Mapa interactivo** | Leaflet + react-leaflet, sobre OpenStreetMap | Gratuito al 100%. Se puede personalizar. Ya lo dominamos por experiencia previa con mapas en proyectos similares. Alternativa Google Maps queda descartada por coste. |
| **Datos geográficos** | GeoJSON nacional simplificado de datos.gob.es (`ge0012152`) + diccionario INE para municipios + Nomenclátor CNIG para coordenadas | Ya están localizados en la investigación. Licencia abierta con atribución. |
| **Hosting** | Vercel | Es la plataforma hecha por los mismos creadores de Next.js. El despliegue es automático: cada vez que haces commit y push a GitHub, Vercel reconstruye y publica la nueva versión en menos de un minuto. Ya tienes cuenta conectada. |
| **Email transaccional** | Resend | Servicio moderno, fácil de integrar con Next.js. Plan gratuito de 3.000 emails al mes (suficiente para arrancar). Buena reputación de entrega. |
| **Dominio** | Lo registras donde prefieras (Cloudflare Registrar, Namecheap, etc.) | Necesitas un nombre propio (`permutaes.es` o similar). |

### 4.3 Lo bueno

- **Una sola plataforma para BD + Auth + Storage** (Supabase). Menos cosas que aprender, menos cosas que mantener.
- **Despliegue automático**: tú haces `git push`, Vercel hace el resto.
- **Gratis al arrancar**: planes free de Vercel y Supabase cubren tráfico bajo o medio sin pagar nada.
- **Buena para SEO**: Next.js renderiza la web en el servidor antes de mandarla al navegador, Google lo lee bien.
- **Comunidad enorme**: cualquier problema que tengas, alguien lo ha resuelto antes en internet.
- **Postgres es una BD seria**: cuando crezca el proyecto, no tendrás que cambiar de motor.

### 4.4 Lo malo

- **Vendor lock-in con Supabase**: si Supabase sube precios o cambia de política, mover la BD a otro sitio es trabajo. Mitigado porque Postgres es estándar abierto: en último caso podrías migrar a otro proveedor de Postgres.
- **Vercel tiene límites en el plan gratis**: si la app explota en tráfico, hay que pasar a Pro (~20€/mes).
- **Curva de aprendizaje**: Next.js 15 es más complejo que el React puro de PermutaDoc.

### 4.5 Coste mensual estimado

| Concepto | Plan inicial | Cuando escale |
|---|---|---|
| Vercel | 0€ | ~20€/mes (plan Pro si superas 100 GB/mes de tráfico) |
| Supabase | 0€ | ~25€/mes (plan Pro si superas 500 MB de BD o 2 GB de transferencia/mes) |
| Resend | 0€ | ~20€/mes (plan Pro si superas 3.000 emails/mes) |
| Dominio | ~10-15€/año (~1€/mes) | igual |
| **Total** | **~1€/mes** | **~65€/mes** |

Probablemente estarás más de un año en plan gratuito antes de necesitar pagar nada significativo.

---

## 5. STACK B — Alternativa más sencilla (Next.js + SQLite + Auth.js)

### 5.1 Visión global

Mismo Next.js que el Stack A, pero la base de datos es SQLite (mucho más simple, sin servidor) y la autenticación es Auth.js (la librería estándar para Next.js, sin depender de un servicio externo). Misma plataforma de despliegue (Vercel) y misma librería de mapa.

La idea: menos plataformas de terceros, menos vendor lock-in, pero también menos extras incluidos. Tú montas más piezas a mano.

### 5.2 Detalle de cada pieza (solo lo que cambia respecto al Stack A)

| Componente | Elección | Por qué |
|---|---|---|
| **Base de datos** | SQLite alojado en Turso | SQLite es el motor más simple y portátil. Turso lo aloja y replica para que funcione bien en producción. Plan gratuito muy generoso. |
| **Autenticación** | Auth.js (antes NextAuth) | Librería oss para gestionar usuarios y sesiones dentro del propio proyecto Next.js. No depende de un proveedor externo. |
| **Almacenamiento de archivos** | Sin solución integrada en MVP | Si en el futuro necesitamos PDFs, añadimos S3 o similar. Por ahora la app no lo requiere. |

### 5.3 Lo bueno

- **Menos vendor lock-in**: Turso usa SQLite estándar, Auth.js es código en tu propio proyecto. Migrar a otro hosting es más fácil.
- **Más simple conceptualmente**: tu BD vive en un fichero (más o menos), todo es más cercano.
- **Plan gratuito de Turso muy amplio**: 500 BDs gratis, 9 GB de almacenamiento, miles de millones de lecturas/mes.

### 5.4 Lo malo

- **Tienes que montar más cosas a mano**: especialmente el flujo de email para confirmar cuenta y reset de contraseña (Supabase Auth te lo da gratis, Auth.js requiere configurarlo tú).
- **SQLite tiene limitaciones**: para una app de cientos de miles de usuarios concurrentes hay que reflexionar; para 10k usuarios es perfecto.
- **Sin tiempo real fácil**: Supabase incluye "subscripciones en tiempo real" gratis (útil si en el futuro quieres notificaciones instantáneas en la app); con Stack B hay que añadir más complejidad para conseguirlo.

### 5.5 Coste mensual estimado

| Concepto | Plan inicial | Cuando escale |
|---|---|---|
| Vercel | 0€ | ~20€/mes |
| Turso | 0€ | ~25€/mes |
| Resend | 0€ | ~20€/mes |
| Dominio | ~1€/mes | igual |
| **Total** | **~1€/mes** | **~65€/mes** |

Coste muy similar al Stack A.

---

## 6. Comparativa lado a lado

| Aspecto | Stack A (Recomendado) | Stack B (Alternativo) |
|---|---|---|
| Frontend | Next.js + React + Tailwind | Next.js + React + Tailwind |
| Lenguaje | TypeScript | TypeScript |
| Base de datos | Postgres (Supabase) | SQLite (Turso) |
| Autenticación | Supabase Auth (incluida) | Auth.js (montaje propio) |
| Almacenamiento | Supabase Storage | No incluido (añadir si hace falta) |
| Tiempo real | Sí, incluido | No, hay que añadir |
| Mapa | Leaflet + OpenStreetMap | Leaflet + OpenStreetMap |
| Hosting | Vercel | Vercel |
| Email | Resend | Resend |
| Coste arranque | ~1€/mes | ~1€/mes |
| Coste a escala | ~65€/mes | ~65€/mes |
| Madurez del ecosistema | Muy alta | Media |
| Vendor lock-in | Medio (Supabase) | Bajo |
| Curva de aprendizaje | Moderada | Moderada-alta (más cosas a montar) |

---

## 7. Tiempo estimado de desarrollo

Es difícil dar un número exacto sin saber cuántas horas a la semana le vas a poder dedicar y si voy a programar yo a base de tus instrucciones o si lo haces tú con mi guía. Te doy una estimación asumiendo que **yo programo con tu supervisión**, en bloques de pocas horas por sesión.

| Bloque de trabajo | Stack A | Stack B |
|---|---|---|
| Setup inicial (proyecto, BD, auth, deploy básico) | 2 sesiones | 3-4 sesiones (más config manual) |
| Carga de datos geográficos y taxonomía | 2 sesiones | 2 sesiones |
| Pantallas básicas (registro, login, mi cuenta) | 2 sesiones | 3 sesiones |
| Wizard de creación de anuncio (los 8 pasos) | 5 sesiones | 5 sesiones |
| Pantalla del mapa con multi-clic y atajos | 4 sesiones | 4 sesiones |
| Motor de matching y detección de cadenas | 4 sesiones | 4 sesiones |
| Pantalla de cadenas detectadas | 2 sesiones | 2 sesiones |
| Mensajería interna | 3 sesiones | 4 sesiones (sin tiempo real fácil) |
| Búsqueda pública y landing | 2 sesiones | 2 sesiones |
| Cumplimiento legal (textos RGPD, cookies, aviso legal) | 1 sesión | 1 sesión |
| Pulido, accesibilidad, testing | 3 sesiones | 3 sesiones |
| **Total estimado** | **~30 sesiones** | **~33 sesiones** |

Una "sesión" aquí es un bloque de trabajo coherente, ni necesariamente una hora ni un día — depende de tu disponibilidad. Si trabajamos 2-3 sesiones por semana, estamos hablando de unos **3-4 meses de desarrollo** hasta MVP funcional con todas las pantallas.

---

## 8. Mi recomendación

**Stack A (Next.js + Supabase + Vercel + Resend).**

Razones, en orden de importancia:

1. **Auth incluido sin montaje**. Supabase Auth te da registro con confirmación por email, recuperación de contraseña, gestión de sesiones, todo configurado. Con Stack B esto son varias sesiones más de trabajo y más superficie para que algo falle.
2. **Coste idéntico** al Stack B durante mucho tiempo.
3. **Postgres es más serio que SQLite** para una app que va a crecer en sectores y usuarios. SQLite es excelente, pero Postgres tiene más herramientas y cuando llegue el momento de hacer estadísticas o migraciones complejas vas a agradecer tenerlo.
4. **Vercel + Supabase son los más populares hoy** en este tipo de proyectos. Si necesitamos pedir ayuda en internet o contratar a alguien puntualmente, hay infinitos tutoriales y desarrolladores.
5. **Misma facilidad de despliegue**: en ambos casos haces `git push` y todo se actualiza.

El Stack B es perfectamente válido si quieres minimizar dependencia de plataformas de terceros, pero el coste de tiempo extra para montar Auth.js no merece la pena en mi opinión.

---

## 9. Decisión que necesito que tomes

Una sola pregunta:

| | Decisión | Mi recomendación |
|---|---|---|
| **L** | Stack tecnológico | **Stack A — Next.js + Supabase + Vercel + Resend** |

Cuando me digas OK (o "prefiero Stack B"), lo siguiente es la **Tarea 6 — Plan de fases**: cómo dividir los 3-4 meses de desarrollo en hitos verificables, qué se entrega en cada fase, y cómo decidimos cuándo abrimos la app al público.

Después de la Tarea 6 cerramos la fase de diseño y empezamos a programar de verdad.

---

## 10. Preguntas que probablemente tengas

**¿Voy a tener que aprender programación?**
No. Yo escribo el código y tú lo revisas y pruebas. Tu papel es decir qué quieres y verificar que funciona como esperas. Cuando algo no funcione, me lo cuentas y lo arreglo.

**¿Y si decido cambiar de stack a mitad?**
Es posible pero costoso. La parte de frontend (Next.js + React + Tailwind) es la misma en ambos stacks, así que esa parte se mantiene. La parte que cambia es la base de datos y la autenticación. Estamos hablando de varias sesiones de trabajo perdidas para migrar.

**¿Esto es lo mismo que en PermutaDoc?**
Más o menos. PermutaDoc usaba Vite + React + Tailwind sin backend (era una web estática que leía un JSON). Aquí mantenemos React + Tailwind pero subimos a Next.js (más completo) y le añadimos backend, base de datos y autenticación. El conocimiento de React de PermutaDoc se reutiliza directamente.

**¿Qué pasa con los datos cuando trabajemos?**
Habrá un entorno de desarrollo (que solo ves tú y yo, con datos de prueba) y un entorno de producción (la app de verdad, abierta al público). Cuando hagamos cambios, primero los probamos en desarrollo, después los pasamos a producción.

**¿Tengo que pagar algo desde el primer día?**
Solo el dominio (~10-15€/año). Todo lo demás empieza en plan gratis. Cuando la app tenga mucho tráfico o muchos usuarios, evaluaremos pasar a planes de pago.

**¿Y los datos de los usuarios? ¿Son seguros?**
Supabase aloja datos en Europa (puedes elegir la región), cumple RGPD y tiene cifrado en reposo y en tránsito. La autenticación gestiona contraseñas de forma profesional (nunca se guardan en claro). Adicionalmente nosotros aplicaremos buenas prácticas: cifrado de mensajes sensibles si los hubiera, copias de seguridad automáticas, control de accesos.

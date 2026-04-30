# TAREA 6 — Plan de fases

Documento entregado al cierre de la sesión 1. Cierra la fase de diseño del proyecto. Stack confirmado: **Next.js + Supabase + Vercel + Resend**.

Este documento divide el desarrollo en cinco fases con criterios objetivos de transición entre ellas. Cada fase tiene un objetivo claro, una lista de entregables y unas condiciones que hay que cumplir para pasar a la siguiente. La idea es no avanzar a la siguiente fase mientras la actual no esté sólida.

---

## 1. Visión general

```
FASE 0 — Setup técnico                  ──▶  2 sesiones
   ↓
FASE 1 — Alfa interna (MVP funcional)   ──▶  15 sesiones
   (solo tú y yo probando, con datos
    sintéticos, un solo sector activo)
   ↓
FASE 2 — Beta privada                   ──▶  8 sesiones
   (5-15 usuarios reales invitados,
    todos los sectores grandes activos,
    feedback semanal)
   ↓
FASE 3 — Beta pública                   ──▶  4 sesiones
   (acceso libre desde internet pero
    sin promoción, etiqueta "BETA",
    recogida masiva de feedback)
   ↓
FASE 4 — Producción / Lanzamiento       ──▶  3 sesiones
   (anuncio público, SEO real,
    presencia en redes y posiblemente
    contacto con sindicatos)
   ↓
FASE 5 y posteriores — Evolución         ──▶  abierto
   (nuevas funcionalidades según
    feedback y necesidades reales)
```

Tiempo total estimado hasta producción: **~32 sesiones de trabajo**, equivalentes a 3-4 meses si trabajamos 2-3 sesiones por semana.

---

## 2. FASE 0 — Setup técnico (2 sesiones)

### Objetivo
Tener el esqueleto del proyecto montado y desplegado, sin funcionalidad real todavía.

### Qué se construye
1. Proyecto Next.js + TypeScript + Tailwind inicializado en el repo.
2. Cuenta y proyecto Supabase creados (región Europa, plan gratuito).
3. Conexión Vercel ↔ GitHub configurada: cada commit a `main` se despliega automáticamente.
4. Estructura de carpetas básica del proyecto (rutas, componentes, librerías, estilos).
5. Página de inicio con un texto provisional ("PermutaES, próximamente") para verificar que el despliegue funciona.
6. Variables de entorno configuradas (claves de Supabase, Resend) en local y en Vercel.
7. Primer login técnico (cuenta de Vaquero) probando que Supabase Auth funciona.

### Entregables
- Repo con estructura del proyecto.
- URL de Vercel funcional (`permutaes.vercel.app` o el dominio que registres).
- Documento `STACK_INSTALADO.md` con los servicios contratados, sus credenciales (referencias, no las claves) y dónde están guardadas.

### Criterios para pasar a Fase 1
- [ ] La URL de despliegue carga la página de inicio sin errores.
- [ ] Puedes registrarte en Supabase Auth desde la web (aunque sea contra una pantalla provisional).
- [ ] Cualquier `git push` a `main` actualiza la URL en menos de 2 minutos sin intervención manual.

---

## 3. FASE 1 — Alfa interna (15 sesiones)

### Objetivo
Tener una app **funcionalmente completa para un solo sector** (docencia LOE), probada solo por ti y por mí con datos sintéticos. Si esta fase funciona, sabemos que el modelo de datos, el matcher y el flujo del wizard son correctos. Lo demás es replicar para otros sectores.

### Por qué docencia LOE primero
1. Es el sector con mejor catálogo cargable: RD 1834/2008 + Excel de Andalucía con todos los códigos.
2. Tiene la regulación geográfica más simple (sin límites territoriales).
3. La taxonomía es la más estable y conocida.
4. Probaste la idea con PermutaDoc, así que ya conoces el dominio.

### Qué se construye
1. **Carga inicial de datos**:
   - 8.131 municipios INE con códigos y coordenadas.
   - GeoJSON nacional simplificado.
   - Comunidades Autónomas y provincias.
   - Cuerpos LOE (~10) y todas sus especialidades (~200).
2. **Pantallas de identidad**: registro, confirmación de email, login, recuperación de contraseña, "Mi cuenta".
3. **Wizard de creación de anuncio** (los 8 pasos), pero solo para el sector docente. El selector de sector tiene los 7 sectores listados, los 6 que no son docentes muestran "próximamente".
4. **Pantalla del mapa con multi-clic + atajos** por provincia, CCAA, comarca y radio.
5. **Motor de matching** completo (ciclos de 2, 3 y 4) aplicando la regla de docentes.
6. **Pantalla "Cadenas detectadas"** con visualización gráfica del ciclo y score.
7. **Pantalla "Mis anuncios"** con edición, pausar, renovar, marcar como permutado, eliminar.
8. **Mensajería interna** entre usuarios de una misma cadena.
9. **Notificaciones por email** (transaccionales) con Resend: confirmación de cuenta, recuperar contraseña, nueva cadena detectada, mensaje recibido, anuncio caduca pronto.
10. **Cookies y avisos legales mínimos** (banner cookies según AEPD, aviso legal, política de privacidad, condiciones de uso).
11. **Búsqueda pública anónima** y **landing pública** según mock de Tarea 4.

### Datos sintéticos para probar
Generaremos ~50 anuncios falsos de docentes repartidos por España con diferentes especialidades y plazas deseadas. La idea es:
- Provocar al menos 3 cadenas directas (longitud 2).
- Provocar al menos 2 cadenas a 3.
- Provocar al menos 1 cadena a 4.
- Provocar muchos casos donde **no haya** cadena, para verificar que el filtro legal funciona (especialidades distintas, jubilación próxima, etc.).

### Entregables
- App accesible en la URL de Vercel, completa para docencia LOE.
- Documento `PRUEBAS_ALFA.md` con la lista de casos de prueba probados y su resultado.

### Criterios para pasar a Fase 2
- [ ] Un usuario nuevo puede registrarse, confirmar email, publicar un anuncio docente y verlo en "Mis anuncios" sin ningún error.
- [ ] El motor de matching detecta correctamente las cadenas esperadas en los datos sintéticos (tolerancia: 0 falsos positivos, 0 falsos negativos).
- [ ] La app no crashea en ningún punto del wizard ni del mapa.
- [ ] Aviso legal, política de privacidad y banner de cookies cumplen los mínimos legales (revisión rápida).
- [ ] Los emails transaccionales llegan a tu bandeja en menos de 1 minuto.
- [ ] Has navegado tú la app entera al menos dos veces y has dado el visto bueno.

---

## 4. FASE 2 — Beta privada (8 sesiones)

### Objetivo
Probar la app con **usuarios reales** en un grupo cerrado, antes de abrirla al público. Activar el resto de sectores con regulación clara. Detectar problemas que no se ven con datos sintéticos.

### Quiénes son los usuarios
5-15 funcionarios reales que conozcas personalmente o a través de tu red (familiares, amigos, compañeros de oposiciones, contactos sindicales). Deben representar al menos 2-3 sectores distintos para probar la diversidad. Idealmente:
- 3-5 docentes
- 2-3 sanitarios
- 2-3 funcionarios AGE o autonómicos
- 1-2 habilitados nacionales

A cada uno le das un código de invitación. Sin código no se pueden registrar.

### Qué se añade respecto a Fase 1
1. **Sistema de invitación por código**. Solo se registra quien tenga código. Tú generas códigos desde un panel sencillo.
2. **Activación de los demás sectores**:
   - Sanitarios SNS (con servicio de salud + categoría unitaria + especialidad).
   - AGE (con cuerpos cargados desde el PDF de INAP — parsing manual o semi-automático).
   - Habilitados nacionales (lista corta, hardcodeable).
   - Funcionarios autonómicos (texto libre por ahora, con catálogo donde lo tengamos).
   - Funcionarios locales (denominaciones tipo).
   - Policía Local (en las 5 CCAA con regulación).
3. **Panel mínimo de moderación interna**. Para que tú y yo podamos:
   - Ver lista de anuncios.
   - Ver lista de usuarios y eliminar cuentas problemáticas.
   - Ver denuncias entrantes.
4. **Recogida de feedback** dentro de la propia app: botón "Tengo una sugerencia" en el menú.
5. **Métricas básicas** (Vercel Analytics gratuito): cuántos usuarios entran, qué páginas visitan más.
6. **Refinamiento de score de cadenas** según el feedback de los usuarios reales (puede que descubramos que algunos criterios son menos importantes de lo que pensábamos).

### Entregables
- App accesible solo con código de invitación.
- Lista de los 5-15 usuarios beta y los códigos asignados.
- Documento `FEEDBACK_BETA.md` con todo lo que reporten los usuarios y su estado (resuelto / pendiente / no aplica).

### Criterios para pasar a Fase 3
- [ ] Al menos 5 usuarios reales han creado anuncios y han usado la app durante al menos 2 semanas.
- [ ] Se ha detectado al menos una cadena con anuncios reales (no sintéticos). Si no, indagar por qué.
- [ ] Cero bugs críticos abiertos (definimos crítico como: el usuario no puede registrarse, no puede publicar, o pierde datos).
- [ ] Al menos 5 sectores activos.
- [ ] Conformidad legal completada: aviso legal, política de privacidad final, política de cookies, condiciones de uso, RAT (Registro de Actividades de Tratamiento) interno documentado.
- [ ] Los usuarios beta declaran que la app es "usable" en una encuesta corta.

---

## 5. FASE 3 — Beta pública (4 sesiones)

### Objetivo
Abrir la app a cualquiera con conexión a internet, pero **sin promoción**. La idea es ver qué pasa cuando la usa gente que no conoces, qué errores aparecen y qué patrones de uso emergen. La app lleva una etiqueta visible "BETA" en todas las pantallas.

### Qué se añade respecto a Fase 2
1. **Eliminación del sistema de invitación**. Cualquiera puede registrarse.
2. **Etiqueta "BETA" visible** en cabecera, footer y emails.
3. **Texto explicativo** en la landing: *"PermutaES está en beta. Funciona, pero algunos sectores aún están parcialmente cargados. Si encuentras algún problema o falta tu cuerpo, escríbenos."*
4. **Formulario público de contacto** (no solo dentro de la app, también accesible desde fuera).
5. **Página de estado** ("¿algún problema?") con incidencias conocidas.
6. **Mejora del SEO básico**: meta tags, sitemap, robots.txt, descripciones por sector. Sin contratar agencia ni invertir en publicidad.
7. **Observabilidad básica**: logs de errores accesibles, alertas si la BD se cae o si hay un pico de errores.

### Cómo se difunde
No se hace anuncio formal. La gente la encuentra por:
- Búsqueda orgánica en Google (lentamente).
- Boca a boca de los usuarios beta de Fase 2.
- Posibles menciones en grupos de Facebook de permutas (si los usuarios beta deciden compartirla).

### Entregables
- App pública con etiqueta BETA bien visible.
- Documento `INCIDENCIAS_BETA_PUBLICA.md` con problemas reportados y resueltos.

### Criterios para pasar a Fase 4
- [ ] Al menos 50 anuncios reales publicados (no de personas que tú conoces).
- [ ] Al menos 3 cadenas detectadas que **no involucran** a usuarios de la beta privada.
- [ ] Al menos 2 semanas seguidas sin bugs críticos reportados.
- [ ] Al menos 100 usuarios registrados.
- [ ] Métrica de "tasa de finalización del wizard" > 60% (de los que empiezan a publicar un anuncio, al menos 6 de cada 10 lo terminan).
- [ ] Tiempo medio de carga de las pantallas principales < 2 segundos.
- [ ] Confirmación tuya, en una sesión específica, de que la app está lista para anunciarse.

---

## 6. FASE 4 — Producción / Lanzamiento (3 sesiones)

### Objetivo
Anunciar la app públicamente. Quitar la etiqueta BETA. Convertirla en un producto estable y promovido.

### Qué se añade respecto a Fase 3
1. **Eliminación de la etiqueta BETA** en todas las pantallas.
2. **Mejora del SEO**: páginas de aterrizaje específicas por sector ("Permutas para docentes", "Permutas en sanidad"...) que clasifiquen bien en Google.
3. **Página "Sobre el proyecto"** con tu historia, motivación y forma de contacto.
4. **Plan de comunicación inicial**:
   - Mensaje preparado para grupos de Facebook de permutas existentes.
   - Posible contacto con sindicatos (CSIF, ANPE, CCOO) ofreciéndoles la herramienta como complemento gratuito a sus servicios.
   - Posible artículo o nota de prensa para medios sectoriales (revistas educativas, sanitarias).
5. **Política de copias de seguridad** documentada y verificada (backup automático diario en Supabase, retención 30 días).
6. **Plan de respuesta ante incidentes**: qué haces si la app se cae el sábado por la noche.

### Entregables
- App en producción anunciada en al menos 3 canales (grupos FB + sindicato + artículo).
- Documento `LANZAMIENTO.md` con el plan de comunicación ejecutado y resultados.
- Política de privacidad y aviso legal definitivos, revisados por alguien con criterio jurídico (puede ser una consulta puntual a un abogado, ~150-300€).

### Criterios para pasar a Fase 5 (consolidación)
- [ ] La app lleva al menos 1 mes en producción sin etiqueta BETA.
- [ ] Has decidido si pasas a SL o sigues como autónomo (Decisión D revisada).
- [ ] Tienes claras las prioridades de evolución según feedback acumulado.

---

## 7. FASE 5 y posteriores — Evolución

A partir de aquí no hay un plan cerrado. Las funcionalidades que aparecen como "siguientes" según las Tareas anteriores son:

- **Carga progresiva de catálogos pendientes**: cuerpos autonómicos en CCAA con catálogo no localizado todavía, áreas de salud por servicio.
- **Multilingüismo** (gallego, catalán, euskera, valenciano), tanto en interfaz como en taxonomía.
- **Verificación de usuarios** si los abusos lo requieren (por email corporativo, por documento, etc.).
- **Motivos de permuta** estructurados (con DPIA y DPO si aplica).
- **App móvil nativa** o PWA dedicada.
- **Notificaciones push** dentro del navegador.
- **Newsletter periódica** ("anuncios nuevos en tu zona").
- **Estadísticas públicas** ("X cadenas detectadas este mes").
- **Posible monetización**: anuncios destacados, modelos freemium, patrocinio sindical.
- **Convenios con sindicatos** para integración bidireccional.

Estas se priorizan en sesiones específicas a partir de Fase 5 según lo que el feedback real demande.

---

## 8. Hitos críticos y riesgos

### Hitos críticos (puntos donde el proyecto puede atascarse)

1. **Carga inicial de datos geográficos**. Si el GeoJSON nacional pesa demasiado, hay que simplificar geometrías. Si las coordenadas tienen errores, el atajo "radio de N km" fallará.
2. **Rendimiento del motor de matching con muchos anuncios**. La detección de ciclos de longitud 4 sobre miles de anuncios puede ser lenta. Habrá que probar con datos sintéticos masivos en Fase 1 y, si hace falta, optimizar.
3. **Confirmación de cuentas por email**. Si Resend acaba en spam, los usuarios no se podrán registrar. Hay que configurar SPF/DKIM correctamente desde el principio.
4. **Cumplimiento legal**. Si un anuncio publica datos personales del propio funcionario en las observaciones (su DNI, etc.), tenemos un incidente RGPD. La validación automática debe avisar.

### Riesgos externos

- **Cambio de planes gratuitos** en Vercel, Supabase o Resend. Mitigación: monitorizar y tener plan de migración.
- **Ataque de spam o bots** que inunden la app con anuncios falsos. Mitigación: en Fase 3 añadir captcha al registro.
- **Problemas regulatorios sobrevenidos** (la AEPD podría exigir DPO si crece mucho). Mitigación: Fase 4 incluye revisión jurídica.
- **Competencia que copie la idea**. Mitigación: ejecutar bien y rápido.

---

## 9. Resumen de tiempo y coste

| Fase | Sesiones | Coste mensual de servicios |
|---|---|---|
| Fase 0 | 2 | ~0€ (solo dominio prorrateado, ~1€/mes) |
| Fase 1 | 15 | ~1€/mes |
| Fase 2 | 8 | ~1€/mes |
| Fase 3 | 4 | ~1€/mes (probable que aún seas plan free) |
| Fase 4 | 3 | ~5-15€/mes (puede ser que ya pase a Pro de Supabase si hay tráfico) |
| **Total hasta producción** | **~32 sesiones (~3-4 meses)** | **~10€ acumulados de servicios** |

Coste único añadido en Fase 4: revisión legal (~150-300€) y, si decides, registro de marca o constitución de SL (~300-1.000€).

---

## 10. Decisión que necesito que tomes ahora

Una sola:

| | Decisión | Mi recomendación |
|---|---|---|
| **M** | Sector con el que arrancamos en Fase 1 | **Docencia LOE** (mejor catálogo, sector más predecible, ya tienes dominio sobre el tema por PermutaDoc) |

Si quieres arrancar con otro sector, dímelo. Pero te recomiendo encarecidamente docentes: ahorra al menos 3 sesiones de trabajo respecto a empezar, por ejemplo, con sanidad (donde la carga del catálogo homogéneo del SNS va a llevar más tiempo).

---

## 11. Cierre de la fase de diseño

Cuando me respondas a la decisión M, **cerramos la fase de diseño** del proyecto. La siguiente sesión arranca **Fase 0 (setup técnico)** y empezamos a programar de verdad.

Recapitulando lo cerrado en esta primera sesión:

- 7 sectores cubiertos / 12 excluidos (Tarea 2).
- Modelo de datos en 15 tablas conceptuales (Tarea 3).
- Wizard de 8 pasos + landing + mensajería + reglas de validación (Tarea 4).
- Stack: Next.js + Supabase + Vercel + Resend (Tarea 5).
- Plan de fases en 5 etapas con criterios objetivos de transición (Tarea 6).
- 13 decisiones cerradas (A-M).

Todos los documentos están en el repo. Cuando retomemos sesión, el ritual es:
1. Leer `PROGRESO.md`.
2. Verificar último commit.
3. Continuar.

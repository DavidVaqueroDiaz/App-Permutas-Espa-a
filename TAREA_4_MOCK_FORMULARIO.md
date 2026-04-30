# TAREA 4 — Mock del formulario y flujos de usuario

Documento entregado al cierre de la sesión 1. Recoge las decisiones cerradas en Tareas 2 y 3 (mensajería interna, sin motivos de permuta, lectura limitada anónima, autónomo, año de nacimiento, caducidad 6 meses, solo castellano en MVP, mensajes 1 año).

Sin código todavía. Este documento describe **cómo debería verse y comportarse cada pantalla** y **qué validaciones aplican en cada paso**, para que lo apruebes antes de pasar a la implementación. Los nombres de botones y textos son orientativos — los podemos refinar cuando programemos.

---

## 1. Flujos generales de la aplicación

```
                        ┌───────────────────────┐
                        │   LANDING PÚBLICA      │
                        │   (cualquiera entra)   │
                        └──────────┬─────────────┘
                                   │
                        ┌──────────┴─────────────┐
                        │                        │
                ┌───────┴───────┐       ┌───────┴────────┐
                │  Buscar       │       │  Registrarse   │
                │  anuncios     │       │  / Iniciar     │
                │  (anónimo)    │       │  sesión        │
                └───────┬───────┘       └───────┬────────┘
                        │                       │
                        │                       │
                ┌───────┴───────┐       ┌───────┴────────┐
                │  Ver detalle  │       │   ÁREA          │
                │  → bloqueado  │──────▶│   PRIVADA       │
                │  → "Regístra- │       │                 │
                │   te para     │       │  - Mis anuncios │
                │   ver más"    │       │  - Crear nuevo  │
                └───────────────┘       │  - Cadenas      │
                                        │    detectadas   │
                                        │  - Mensajes     │
                                        │  - Mi cuenta    │
                                        └─────────────────┘
```

Tres tipos de usuario:
- **Anónimo**: ve la landing, puede buscar y ver listados resumidos. Cuando intenta ver detalle completo de un anuncio o publicar uno propio, se le pide registrarse.
- **Registrado**: tiene acceso completo a publicar, ver detalles, recibir notificaciones de cadenas detectadas y mensajearse con otros usuarios.
- **Administrador** (interno, fuera del MVP web): mantiene catálogos, modera contenido, atiende denuncias.

### 1.1 Estructura de la landing pública

La landing es la página de entrada en la URL raíz. Cualquiera puede visitarla sin registrarse. Debe transmitir en pocos segundos qué hace la app y permitir dos cosas: probar el buscador y dar el salto a publicar el propio anuncio.

Secciones de arriba a abajo:

1. **Cabecera fija**
   - Logo de PermutaES (volver a la landing al pulsar).
   - Botón secundario "Iniciar sesión" (lleva al login).
   - Botón principal "Crear cuenta" (lleva al registro).

2. **Hero principal**
   - Frase grande: *"Encuentra tu permuta de plaza en toda España."*
   - Subtítulo de una línea: *"Plataforma nacional para que funcionarios públicos intercambien su destino con otros funcionarios compatibles."*
   - Botón principal grande **"Publicar mi anuncio"** → si no estás logueado, lleva al registro y, tras confirmar email, sigue al wizard de creación de anuncio. Si ya estás logueado, va directo al wizard.

3. **Buscador rápido (sin login, sin anuncio creado)**
   - Tres campos visibles: Sector / Provincia donde estoy / Provincia donde quiero ir.
   - Botón "Buscar".
   - Es plenamente funcional para anónimos: pueden probar el motor antes de registrarse.
   - Los resultados aparecen debajo en formato lista resumida (sector + cuerpo + provincia actual + provincias deseadas, sin alias, sin municipios exactos, sin observaciones).
   - Al pulsar un resultado: pantalla intermedia *"Regístrate gratis para ver el detalle completo y contactar."* con el botón "Crear cuenta".

4. **Bloque "¿Cómo funciona?"** (4 pasos visuales)
   - 1. Crea tu cuenta gratis.
   - 2. Publica tu anuncio en 5 minutos: indica tu plaza actual y a dónde aceptarías irte.
   - 3. Te avisamos cuando detectemos una cadena de permuta posible (directa, a 3 o a 4).
   - 4. Hablas con los otros participantes y, si hay acuerdo, tramitáis la permuta con vuestra administración.

5. **Bloque "Sectores cubiertos"**
   - Lista visual de los 7 sectores: Profesorado, Sanidad, AGE, Comunidades Autónomas, Administración Local, Habilitados nacionales, Policía Local (en CCAA con regulación).

6. **Bloque "Por qué somos distintos"** (breve, 3 puntos)
   - El primer agregador nacional: ya no tienes que rastrear foros sindicales y grupos de Facebook por separado.
   - Detección automática de cadenas a 2, 3 y 4: no solo permutas directas.
   - Solo casamos lo que es legalmente posible: si la ley no admite la permuta, la app no te la propone.

7. **Llamada a la acción final**
   - Botón grande **"Publicar mi anuncio"** repetido al final de la página.

8. **Pie de página**
   - Enlaces: Aviso legal, Política de privacidad, Política de cookies, Condiciones de uso, Contacto.
   - Copyright + año.
   - Mención obligatoria por uso de datos abiertos: *"Datos cartográficos: © Instituto Geográfico Nacional. Datos administrativos: © INE."*

### 1.2 Resumen del comportamiento anónimo vs registrado

| Acción | Anónimo | Registrado |
|---|---|---|
| Visitar la landing | Sí | Sí |
| Usar el buscador rápido | Sí | Sí |
| Ver lista resumida de resultados | Sí | Sí |
| Ver detalle completo de un anuncio (municipios exactos, observaciones, alias) | No → se le pide registrarse | Sí |
| Crear su propio anuncio | No → se le pide registrarse | Sí |
| Ver cadenas detectadas con sus anuncios | No aplica | Sí |
| Iniciar contacto con otro usuario | No | Sí (solo si comparte cadena con él) |

---

## 2. Pantalla de registro

**Objetivo:** crear una cuenta. Mínima fricción.

### Campos del formulario

| Campo | Obligatorio | Validación |
|---|---|---|
| Email | sí | Formato de email válido. Único en la base de datos. |
| Contraseña | sí | Mínimo 8 caracteres. Mostrar indicador de fortaleza. |
| Repetir contraseña | sí | Debe coincidir. |
| Alias público | sí | 3-20 caracteres, letras, números, guiones. Único. La app sugiere uno disponible si el elegido está pillado. |
| Año de nacimiento | sí | Entre 1940 y 2008 (filtra menores y datos absurdos). |
| He leído y acepto la política de privacidad | sí | Casilla obligatoria. Enlace al texto completo. |
| He leído y acepto las condiciones de uso | sí | Casilla obligatoria. Enlace al texto completo. |

No se piden nombre real ni teléfono al registrarse. Se podrán añadir luego desde "Mi cuenta" si el usuario quiere.

### Comportamiento

- Al enviar el formulario válido: la app crea el usuario y le manda un email de confirmación con un enlace.
- Hasta que pinche el enlace, la cuenta está marcada como "no verificada". Puede iniciar sesión, pero no puede publicar anuncios ni mensajearse.
- El email de confirmación caduca en 24 horas. Si caduca, hay un botón "Reenviar email de confirmación".

### Errores típicos

- Email ya registrado: "Ya existe una cuenta con ese email. ¿Has olvidado tu contraseña?" (link).
- Alias ya cogido: la app sugiere alternativas.
- Contraseñas no coinciden: error en línea, sin recargar la página.

---

## 3. Pantalla de inicio de sesión

**Objetivo:** entrar a la cuenta. Tres campos.

| Campo | Obligatorio | Validación |
|---|---|---|
| Email | sí | Formato de email válido. |
| Contraseña | sí | — |
| "Mantener sesión iniciada" | opcional | Si está marcada, la cookie dura 30 días. Si no, dura solo lo que dura el navegador abierto. |

### Enlaces complementarios

- "He olvidado mi contraseña" → flujo estándar de recuperación por email con token de un solo uso.
- "Crear cuenta" → lleva a la pantalla de registro.

### Errores típicos

- Email o contraseña incorrectos: mensaje genérico ("email o contraseña incorrectos") sin distinguir cuál es el fallo, por seguridad.
- Cuenta no verificada: enlace a "reenviar email de confirmación".
- Cuenta eliminada: mensaje neutro de credenciales incorrectas (no se confirma que la cuenta existió).

---

## 4. Wizard de creación de anuncio

**Objetivo:** que el usuario publique un anuncio en 8 pasos guiados. Cada paso es una pantalla con un campo o grupo de campos. Botones "Atrás" y "Siguiente" en cada uno. Indicador de progreso visible (1/8, 2/8, ...).

### 4.1 Paso 1 — Sector

Pregunta: **"¿En qué sector trabajas como funcionario?"**

Opciones (radio buttons o tarjetas):
- Profesorado no universitario (cuerpos LOE)
- Personal estatutario fijo del Sistema Nacional de Salud
- Funcionario de la Administración General del Estado (AGE)
- Funcionario de Comunidad Autónoma
- Funcionario de Administración Local
- Habilitado nacional (Secretaría / Intervención-Tesorería / Secretaría-Intervención)
- Policía Local

Cada opción lleva una breve descripción de una línea para ayudar al usuario a identificarse.

### 4.2 Paso 2 — Cuerpo / escala / categoría

El contenido de este paso depende del sector elegido.

| Sector | Campos en este paso |
|---|---|
| Docente LOE | (1) Cuerpo (desplegable: 597 Maestros, 590 Secundaria, 594 EOI, 595/596 Música y AA.EE., 598 Artes Plásticas y Diseño…) |
| Sanitario SNS | (1) Servicio de Salud (desplegable: SAS, SERGAS, SERMAS, ICS, Osakidetza…) (2) Categoría unitaria (desplegable filtrado por servicio: FEA, Médico de Familia AP, Enfermero/a, etc.) |
| AGE | (1) Cuerpo o escala (desplegable con autocompletado por nombre o código) |
| CCAA | (1) Comunidad Autónoma (desplegable) (2) Cuerpo propio (desplegable filtrado por CCAA — si la app no tiene catálogo cargado para esa CCAA todavía, se muestra un campo de texto libre con aviso) |
| Local | (1) Subgrupo (desplegable: A1, A2, C1, C2, AP) (2) Denominación tipo (desplegable: Técnico de Administración General, Administrativo, Auxiliar, Técnico — Arquitecto, Técnico — Trabajador Social…) |
| Habilitado nacional | (1) Subescala (Secretaría / Intervención-Tesorería / Secretaría-Intervención) (2) Categoría (Superior / Entrada — solo si subescala lo requiere) |
| Policía Local | (1) Comunidad Autónoma — la app valida que sea una de las 5 con regulación; si elige otra, mensaje claro: *"Tu CCAA todavía no admite anuncios de Policía Local en la app porque no tiene regulación específica de permutas. Si esto cambia, te avisaremos."* (2) Escala (3) Categoría |

### 4.3 Paso 3 — Especialidad

Solo aparece si el cuerpo/categoría tiene especialidades.

- **Docente LOE**: desplegable con autocompletado. Por ejemplo, para Cuerpo de Secundaria (590), lista las ~50 especialidades con su código completo (590004 Lengua Castellana y Literatura, 590011 Inglés…).
- **Sanitario SNS**: solo si la categoría unitaria requiere especialidad (Facultativo Especialista de Área → desplegable con las ~50 especialidades médicas).
- **AGE**: opcional según el cuerpo. La mayoría no aplica.
- **Resto de sectores**: no aplica.

Si no aplica, este paso se salta automáticamente y el wizard pasa al 4.

### 4.4 Paso 4 — Plaza actual

Pregunta: **"¿Dónde está tu plaza actualmente?"**

Pantalla con dos formas de elegir:
- **Buscador con autocompletado**: el usuario empieza a escribir el nombre del municipio y aparecen sugerencias.
- **Mapa interactivo**: el usuario hace zoom y clica directamente sobre el municipio.

Cualquiera de las dos formas selecciona UN solo municipio.

Una vez seleccionado, se muestra:
- Nombre del municipio.
- Provincia.
- Comunidad Autónoma.
- Población (informativo).
- Botón "Confirmar".

### 4.5 Paso 5 — Plazas deseadas

**El paso más importante.** Aquí el usuario indica a dónde aceptaría irse. Pueden ser uno o muchos municipios.

#### Pantalla principal: el mapa

- Mapa de España a la izquierda (o arriba en móvil), ocupando la mayor parte de la pantalla.
- Panel lateral con:
  - Lista de municipios actualmente seleccionados, agrupados por provincia.
  - Botón "Quitar todo".
  - Contador "X municipios seleccionados".

#### Formas de añadir municipios al panel

El usuario puede combinar varias formas, todas se acumulan en la misma lista:

1. **Clic individual sobre el mapa.** Cada municipio que clica se marca en color y se añade al panel.
2. **Buscador con autocompletado.** Igual que en el paso 4, añade un municipio cada vez.
3. **Atajos por área administrativa.** Botones flotantes sobre el mapa:
   - "Toda la provincia" (tras hacer clic en una provincia, se añade el conjunto de sus municipios).
   - "Toda la CCAA" (idem).
   - "Toda la comarca" (solo en CCAA con comarcas oficiales — Galicia, Aragón, Cataluña).
4. **Atajo por radio.** Botón "Radio de N km alrededor de un punto":
   - El usuario clica un municipio centro o introduce coordenadas.
   - Se le pide el radio en km (deslizador con valores 5, 10, 20, 30, 50, 100, 200 km).
   - La app calcula y añade todos los municipios cuyos centros caen dentro del radio.

#### Comportamiento clave

- Cualquier atajo se EXPANDE inmediatamente a la lista plana de municipios. El usuario ve los 313 municipios de Galicia añadidos uno por uno en el panel, no "Galicia entera". Esto le permite quitar individualmente alguno si quiere.
- Pero la app guarda también el atajo original en `anuncio_atajos`. Esto le permite, al editar el anuncio, ver "Toda Galicia + 30 km alrededor de Vigo" en lugar de un mar de 313 municipios.
- Botón "Quitar este municipio" en cada elemento del panel.
- Botón "Quitar atajo entero" si el usuario añadió uno y se arrepiente.
- Validación: el municipio actual (paso 4) NO puede estar en plazas deseadas. Si el usuario intenta añadirlo, mensaje: *"No puedes pedir permuta a tu propio municipio actual."*
- Validación mínima: al menos 1 municipio.

### 4.6 Paso 6 — Datos personales legales

Estos datos no se muestran nunca públicamente. Solo se usan para que el motor de matching aplique las reglas legales.

| Campo | Pregunta al usuario | Validación |
|---|---|---|
| Año de nacimiento | "¿En qué año naciste?" (ya lo dio al registrarse, se muestra solo lectura — si quiere cambiarlo, va a Mi cuenta). | Entre 1940 y 2008. |
| Fecha de toma de posesión definitiva | "¿Desde cuándo ocupas tu plaza actual con destino definitivo?" | Fecha. No futura. |
| Años totales de servicio | "¿Cuántos años llevas en total trabajando como funcionario (en cualquier destino)?" | Número entero entre 0 y 50. |
| ¿Has permutado antes? | "¿Has hecho alguna permuta de plaza anterior?" Sí / No. Si Sí, se pide la fecha. | Si Sí: fecha pasada. |

La app calcula y muestra al usuario, en tiempo real:
- Años hasta jubilación forzosa estimada (asumiendo 65 si está en Clases Pasivas, 67 si está en Régimen General — la app pregunta cuál).
- Si faltan menos de 10 años, se le muestra un aviso suave: *"Por la regla legal, faltan menos de 10 años para tu jubilación forzosa. Tu anuncio se publicará pero el sistema no lo podrá emparejar con otros."* Esto evita que se sienta engañado: el anuncio se acepta pero no genera matches.

### 4.7 Paso 7 — Observaciones (opcional)

Campo de texto libre, máximo 500 caracteres. Solo visible al match.

Aviso visible bajo el campo: *"No incluyas datos sensibles (motivos de salud, situaciones familiares delicadas, datos económicos). Estos datos no se usan para emparejar — solo los verá el otro permutante si acepta el contacto."*

### 4.8 Paso 8 — Resumen y confirmación

Pantalla con todo lo que ha rellenado, agrupado:
- Sector + cuerpo + especialidad + categoría.
- Plaza actual.
- Plazas deseadas (con un resumen tipo "313 municipios — toda Galicia + 12 municipios sueltos").
- Datos legales (resumen).
- Observaciones.

Botón "Editar" en cada bloque para volver al paso correspondiente.

Botón final: **"Publicar anuncio"**.

Al publicar:
- Anuncio creado con estado "activo".
- `caduca_el` = hoy + 6 meses.
- El motor de matching se ejecuta inmediatamente buscando cadenas que pasen por este anuncio. Si encuentra alguna, redirige al usuario a la pantalla "Cadenas detectadas". Si no, redirige a "Mis anuncios" con un mensaje: *"Tu anuncio se ha publicado. Te avisaremos en cuanto detectemos una posible cadena."*

---

## 5. Pantalla "Mis anuncios"

Lista de los anuncios del usuario (puede tener varios activos).

Por cada anuncio:
- Resumen en una tarjeta: sector + cuerpo + plaza actual → plazas deseadas (resumen).
- Estado: "Activo" / "Pausado" / "Caducado" / "Permutado" / "Eliminado".
- Fecha de publicación y fecha de caducidad.
- Contador: "Detectadas X cadenas potenciales".
- Botones por anuncio: **Editar / Pausar / Renovar / Marcar como permutado / Eliminar**.

### Editar
Abre el wizard precargado con los datos actuales. Permite cambiar todo excepto el sector (cambiar de sector implica un anuncio nuevo).

### Pausar
El anuncio deja de aparecer en búsquedas y matchings, pero no se borra. El usuario puede reactivarlo cuando quiera.

### Renovar
Cuando el anuncio está cerca de caducar (o ya caducó hace poco), un botón "Renovar 6 meses más" lo pone activo de nuevo. La app envía un email de aviso 7 días antes de la caducidad.

### Marcar como permutado
El usuario indica que ya consiguió permutar (por la app o por otra vía). El anuncio pasa a estado "Permutado", deja de aparecer en matching. Las cadenas que lo incluían se marcan como "rotas".

### Eliminar
Borrado lógico. El anuncio deja de aparecer en cualquier búsqueda. Las cadenas que lo incluían se marcan como rotas.

---

## 6. Pantalla "Cadenas detectadas"

Lista de cadenas posibles que pasan por al menos uno de los anuncios del usuario.

Por cada cadena:
- Visualización gráfica del ciclo: A → B → A (cadena de 2), A → B → C → A (cadena de 3), etc. Cada nodo muestra el alias del usuario, su provincia/CCAA actual y la provincia/CCAA a la que iría.
- Score de calidad (1-5 estrellas).
- Distancia total recorrida por todos los participantes.
- Fecha en que se detectó la cadena.
- Botón "Iniciar contacto con [alias]" por cada otro participante de la cadena.

### Filtros
- Longitud (2 / 3 / 4).
- Score mínimo.
- Mostrar solo cadenas activas / todas.

---

## 7. Vista pública de un anuncio

### Como usuario anónimo (sin login)

Solo ve un resumen muy limitado:
- Sector.
- Cuerpo / categoría general (sin especialidad).
- Provincia actual (no municipio exacto).
- Provincias deseadas (no municipios exactos).
- Botón grande: **"Regístrate para ver el detalle y contactar."**

### Como usuario registrado

Ve el detalle completo:
- Sector + cuerpo + especialidad/categoría.
- Municipio actual exacto.
- Lista completa de municipios deseados.
- Observaciones del autor.
- Alias del autor (no nombre real).
- Antigüedad del anuncio.
- Botón **"Iniciar contacto"** (solo si comparte alguna cadena con el autor; si no, el botón está deshabilitado con un tooltip *"Para contactar tienes que tener una cadena de permuta detectada con esta persona."*).

---

## 8. Mensajería interna

### Bandeja de entrada
Lista de hilos. Cada hilo entre el usuario y otro participante de una cadena. Por hilo:
- Alias del otro.
- Última línea del último mensaje.
- Si hay mensajes sin leer.
- Cadena a la que pertenece (link).

### Hilo de conversación
Pantalla tipo chat. Mensajes en burbujas. Campo de texto abajo. Botón "Enviar".

Reglas:
- Un usuario solo puede iniciar un hilo con otro si comparten al menos una cadena detectada activa.
- El otro recibe una notificación (email + dentro de la app).
- No se aceptan adjuntos en el MVP. Solo texto.
- Aviso permanente en la pantalla del hilo: *"Recuerda que la app no tramita la permuta. Tienes que pedirla formalmente a tu administración. Hablad por aquí, intercambiad lo que necesitéis y luego cada uno presenta su solicitud."*

### Retención
Los mensajes se borran automáticamente 1 año después del último mensaje del hilo.

---

## 9. Reglas de validación por campo (resumen)

| Campo | Regla |
|---|---|
| Email | Formato válido. Único por usuario. |
| Contraseña | Mínimo 8 caracteres. |
| Alias público | 3-20 caracteres, alfanumérico + guiones. Único. |
| Año de nacimiento | Entre 1940 y 2008. |
| Sector | Solo uno de los 7 valores cerrados. |
| Cuerpo | Debe pertenecer al sector elegido. |
| Especialidad | Debe pertenecer al cuerpo elegido. Solo si el cuerpo tiene. |
| Categoría SNS | Debe pertenecer al servicio de salud elegido. |
| Municipio actual | Debe existir en `municipios`. |
| Plazas deseadas | Mínimo 1. Ninguna puede ser igual al municipio actual. |
| Fecha toma de posesión | No futura. |
| Años de servicio | Entero 0-50. |
| Fecha permuta anterior | Si aplica, debe ser pasada. |
| Observaciones | Máximo 500 caracteres. |
| CCAA en Policía Local | Solo Andalucía, Aragón, Illes Balears, Comunitat Valenciana, Galicia. |

---

## 10. Comportamiento ante errores y casos límite

### El usuario abandona el wizard a medias
La app guarda automáticamente lo rellenado como **borrador**. Cuando vuelve, lee desde "Mis anuncios" → "Continuar borrador". Los borradores caducan a los 30 días.

### El usuario edita un anuncio activo
Si cambia datos que afectan al matching (sector, cuerpo, municipios), las cadenas detectadas previas se invalidan automáticamente y el motor recalcula. Aviso al usuario: *"Has cambiado datos importantes. Las cadenas detectadas anteriores se han actualizado."*

### El usuario marca un anuncio como permutado y luego cambia de idea
Tiene 30 días para reactivarlo desde "Mis anuncios" → "Reactivar". Pasados los 30 días, debe crear uno nuevo.

### El motor no encuentra cadenas
Mensaje neutro y útil: *"Tu anuncio está publicado pero por ahora no hemos detectado ninguna cadena de permuta posible. Te avisaremos por email cuando alguien que encaje contigo publique su anuncio."*

### Un usuario denuncia a otro
Hay un botón "Denunciar este anuncio" / "Denunciar este usuario" en la vista de anuncio y en la mensajería. Al pulsar, se le pide motivo (datos falsos / lenguaje ofensivo / propuesta económica / spam / otro). Llega a una bandeja de moderación interna. El MVP puede gestionarlo manualmente con un email; el módulo de moderación completo es posterior.

### Un anuncio incumple alguna regla legal por evolución del usuario
Por ejemplo, el usuario cumple años y ya está a menos de 10 años de la jubilación. El anuncio sigue visible pero el motor deja de generar cadenas con él. La app avisa al usuario por email cuando esto pasa.

---

## 11. Decisiones que dejo abiertas para Tarea 5

Estas no afectan a la Tarea 4 pero te las dejo planteadas porque van a aparecer cuando arranquemos la implementación (Tarea 5 = stack tecnológico).

### Decisión I — Idioma de la interfaz
- **I1 — Solo castellano** en MVP.
- **I2 — Castellano + gallego + catalán + euskera + valenciano** desde el día 1.

(Independiente de la decisión G de la Tarea 3, que era sobre la TAXONOMÍA. Esta es sobre la INTERFAZ.)

**Mi recomendación: I1 (solo castellano).** Ya iremos añadiendo lenguas conforme la app valide.

### Decisión J — Nivel de la landing pública
- **J1 — Landing simple con explicación + buscador** (mínimo viable para que la gente entienda qué es la app).
- **J2 — Landing con SEO optimizado, blog, casos de éxito** (más trabajo, mejor descubrimiento orgánico).

**Mi recomendación: J1 en MVP, J2 después de validar.**

### Decisión K — Notificaciones por email
- **K1 — Solo email transaccional crítico** (confirmación de cuenta, recuperar contraseña, nueva cadena detectada, mensaje recibido, anuncio caduca pronto).
- **K2 — Email transaccional + newsletter periódica** ("anuncios nuevos en tu zona", consejos, etc.).

**Mi recomendación: K1.** Newsletter requiere más cumplimiento RGPD/LSSI y puede esperar.

---

## 12. Próximo paso

Cuando me respondas a las decisiones I, J y K (con OK o alternativa), arranco la **Tarea 5 — Stack tecnológico**. La Tarea 5 incluirá:

- Propuesta óptima: framework frontend, backend, base de datos, autenticación, hosting, mapa, fuente de datos geográficos, email transaccional.
- Propuesta alternativa simple: lo mismo pero con menos piezas y menos coste.
- Ventajas e inconvenientes de cada una.
- Coste estimado de cada opción (tanto en tiempo de desarrollo como en € de servicios).

La decisión final del stack la tomas tú.

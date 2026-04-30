# TAREA 3 — Esquema de datos

Documento entregado al cierre de la sesión 1. Recoge las decisiones cerradas en la Tarea 2 (modelo de contacto: mensajería interna; sin motivos de permuta; visibilidad pública limitada; forma jurídica autónomo).

Este documento describe el esquema CONCEPTUALMENTE — no hay SQL todavía. Cada tabla se presenta con sus columnas, tipo conceptual (texto, número, fecha, etc.), restricciones y para qué sirve. Una vez aprobado este esquema pasaremos a Tarea 4 (formulario) y, en su momento, a la implementación real con un motor de base de datos concreto (decisión de la Tarea 5).

---

## 1. Visión general del modelo

Las tablas se agrupan en cuatro bloques. Cada bloque cubre un aspecto distinto de la aplicación.

```
┌─────────────────────────┐    ┌──────────────────────────┐
│ BLOQUE 1 — IDENTIDAD    │    │ BLOQUE 2 — GEOGRAFÍA     │
│  usuarios               │    │  ccaa                    │
│  sesiones               │    │  provincias              │
│                         │    │  municipios              │
└──────────────┬──────────┘    │  servicios_salud         │
               │               │  areas_salud             │
               │               │  area_salud_municipios   │
               │               └─────────────┬────────────┘
               │                             │
┌──────────────┴─────────────────────────────┴────────────┐
│ BLOQUE 3 — TAXONOMÍA PROFESIONAL                        │
│  sectores                                               │
│  cuerpos                                                │
│  especialidades                                         │
│  categorias_sns_unitarias                               │
│  categorias_sns_autonomicas                             │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────┴──────────────────────────────────────────┐
│ BLOQUE 4 — OPERACIÓN                                    │
│  anuncios                                               │
│  anuncio_plazas_deseadas                                │
│  anuncio_atajos                                         │
│  cadenas_detectadas                                     │
│  cadena_participantes                                   │
│  notificaciones                                         │
│  hilos_mensaje                                          │
│  mensajes                                               │
└─────────────────────────────────────────────────────────┘
```

**Lectura rápida:**
- Un USUARIO crea uno o varios ANUNCIOS.
- Cada ANUNCIO está anclado a un SECTOR + CUERPO + ESPECIALIDAD/CATEGORÍA + plaza actual (un MUNICIPIO).
- Cada ANUNCIO tiene una lista de PLAZAS DESEADAS (varios MUNICIPIOS) y opcionalmente unos ATAJOS que registran cómo el usuario las eligió en el mapa (provincia X, comarca Y, radio Z km).
- El motor de matching detecta CADENAS DETECTADAS (de longitud 2, 3 o 4) y, por cada nueva cadena, crea NOTIFICACIONES a los usuarios participantes.
- Cuando dos usuarios se interesan, abren un HILO DE MENSAJE y se intercambian MENSAJES dentro de la app.

---

## 2. Bloque 1 — Identidad

### 2.1 Tabla `usuarios`

Una fila por persona registrada en la plataforma.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio, único, generado por el sistema | Identificador interno del usuario. |
| `email` | texto (correo electrónico) | obligatorio, único | Email principal. Solo visible para el propio usuario. Sirve para login y para enviar notificaciones del sistema. |
| `password_hash` | texto | obligatorio | Hash de la contraseña. Nunca se almacena la contraseña en claro. |
| `alias_publico` | texto corto | obligatorio, único | Alias mostrado a los demás usuarios cuando navegan anuncios o reciben mensajes. Ejemplo: "Vaquero82". El usuario puede cambiarlo. |
| `nombre_real` | texto | opcional | Nombre y apellidos. Solo visible para el propio usuario. Útil para que él sepa qué cuenta es la suya cuando vuelva, no se expone públicamente. |
| `fecha_nacimiento` | fecha | obligatorio | Necesaria para validar la regla legal "no permuta si faltan menos de 10 años para la jubilación forzosa". Nunca visible públicamente. |
| `telefono` | texto | opcional | Solo visible para el propio usuario. No se usa para nada salvo como dato de contacto que el usuario puede compartir manualmente con otro. |
| `consentimiento_rgpd` | sí/no + fecha | obligatorio | Marca y fecha del consentimiento aceptado al registrarse. |
| `politica_privacidad_aceptada` | versión + fecha | obligatorio | Versión exacta de la política de privacidad que aceptó. Si la política cambia, sabremos quién aceptó qué versión. |
| `creado_el` | fecha y hora | automático | Cuando se creó la cuenta. |
| `actualizado_el` | fecha y hora | automático | Cuando se modificó cualquier campo. |
| `eliminado_el` | fecha y hora | opcional | Si el usuario solicita eliminar su cuenta, no se borra físicamente para preservar trazabilidad pero se marca aquí; sus anuncios quedan invisibles y sus datos se anonimizan. |

### 2.2 Tabla `sesiones`

Cada login activo del usuario.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio, único | Identificador de la sesión. |
| `usuario_id` | referencia a `usuarios.id` | obligatorio | A qué usuario pertenece. |
| `token` | texto largo | obligatorio, único | Token de sesión que el navegador conserva como cookie. |
| `creado_el` | fecha y hora | automático | Cuándo se inició la sesión. |
| `expira_el` | fecha y hora | obligatorio | Cuándo deja de ser válida. |
| `ip_origen` | texto | opcional | IP desde la que se inició. Útil para detectar accesos sospechosos. |

---

## 3. Bloque 2 — Geografía

Estas tablas son de solo lectura para los usuarios; las cargamos al inicio desde el INE y el CNIG.

### 3.1 Tabla `ccaa`

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `codigo_ine` | texto (2 dígitos) | obligatorio, único | Código INE de la comunidad autónoma. Ejemplo: "12" = Galicia. |
| `nombre` | texto | obligatorio | Nombre oficial. Ejemplo: "Galicia". |

### 3.2 Tabla `provincias`

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `codigo_ine` | texto (2 dígitos) | obligatorio, único | Código INE de la provincia. Ejemplo: "36" = Pontevedra. |
| `nombre` | texto | obligatorio | Nombre oficial. |
| `ccaa_codigo` | referencia a `ccaa.codigo_ine` | obligatorio | A qué CCAA pertenece. |

### 3.3 Tabla `municipios`

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `codigo_ine` | texto (5 dígitos) | obligatorio, único | Código INE del municipio. Ejemplo: "36057" = Vigo. Es la CLAVE que usa el algoritmo de matching para comparar plazas deseadas. |
| `nombre` | texto | obligatorio | Nombre oficial. |
| `provincia_codigo` | referencia a `provincias.codigo_ine` | obligatorio | A qué provincia pertenece. |
| `latitud` | número decimal | obligatorio | Coordenada para el mapa y para el atajo "radio de N km". |
| `longitud` | número decimal | obligatorio | Idem. |
| `poblacion` | número entero | opcional | Última cifra oficial del INE. Permite mostrar contexto en la ficha del municipio. |

### 3.4 Tabla `servicios_salud`

Los 17 servicios autonómicos + INGESA. Necesarios para enforzar la regla "permuta sanitaria solo intra-Servicio de Salud".

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `codigo` | texto corto | obligatorio, único | Código interno. Ejemplo: "SERGAS", "SAS", "INGESA". |
| `nombre_oficial` | texto | obligatorio | Nombre completo. Ejemplo: "Servicio Gallego de Salud". |
| `ccaa_codigo` | referencia a `ccaa.codigo_ine` | obligatorio salvo INGESA | A qué CCAA pertenece. INGESA es estatal. |
| `admite_permutas_inter_servicios` | sí/no | obligatorio | Por defecto NO. Cantabria es la única excepción documentada en sesión 1; se marca SÍ allí, NO en el resto. |

### 3.5 Tabla `areas_salud`

Las áreas o gerencias dentro de cada servicio de salud. Algunos sectores (sanitarios) podrían restringir permutas a la misma área de salud, no solo al mismo servicio. Por ahora la app empareja a nivel de servicio de salud, pero dejamos la tabla preparada para refinar si hace falta.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio | |
| `nombre` | texto | obligatorio | Ejemplo: "Área Sanitaria de Vigo". |
| `servicio_salud_codigo` | referencia a `servicios_salud.codigo` | obligatorio | A qué servicio pertenece. |

### 3.6 Tabla `area_salud_municipios`

Tabla puente: qué municipios pertenecen a qué área de salud.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `municipio_codigo` | referencia a `municipios.codigo_ine` | obligatorio | |
| `area_salud_id` | referencia a `areas_salud.id` | obligatorio | |

(Esta tabla se rellena progresivamente, servicio por servicio, conforme tengamos los datos.)

---

## 4. Bloque 3 — Taxonomía profesional

### 4.1 Tabla `sectores`

Los grandes bloques que la app reconoce. Lista cerrada.

| `codigo` | `nombre` | `permite_inter_ccaa` | `regla_matching` (referencia conceptual) |
|---|---|---|---|
| `docente_loe` | Profesorado no universitario (cuerpos LOE) | sí | docencia |
| `sanitario_sns` | Personal estatutario fijo del SNS | no (con excepción Cantabria) | sanidad |
| `funcionario_age` | Funcionarios AGE | sí | age |
| `funcionario_ccaa` | Funcionarios autonómicos (cuerpos propios) | no | ccaa |
| `funcionario_local` | Funcionarios de Administración Local | sí | local |
| `habilitado_nacional` | Habilitados nacionales | sí | habilitado |
| `policia_local` | Policía Local (solo en CCAA con regulación) | no | policia_local |

### 4.2 Tabla `cuerpos`

Una fila por cuerpo, escala o categoría (la denominación cambia según sector). Estructura común.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio | |
| `sector_codigo` | referencia a `sectores.codigo` | obligatorio | A qué sector pertenece. |
| `codigo_oficial` | texto | opcional | Código numérico oficial cuando existe. Ejemplo: "0590" para profesorado de Secundaria, "1135" para Cuerpo General Administrativo AGE. |
| `denominacion` | texto | obligatorio | Nombre oficial. Ejemplo: "Cuerpo de Profesores de Enseñanza Secundaria". |
| `subgrupo` | texto corto | obligatorio | A1, A2, B, C1, C2, "Agrupaciones Profesionales". |
| `ambito` | texto | opcional | Para cuerpos autonómicos, código de la CCAA. Para cuerpos AGE/estatales, "estatal". |
| `norma_reguladora` | texto | opcional | Referencia abreviada a la norma. Ejemplo: "RD 1834/2008", "Art. 62 LFC". |

### 4.3 Tabla `especialidades`

Hijas de los cuerpos. No todos los cuerpos tienen especialidades; cuando no las tienen, el cuerpo se considera la unidad de matching.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio | |
| `cuerpo_id` | referencia a `cuerpos.id` | obligatorio | |
| `codigo_oficial` | texto | opcional | Código completo. Ejemplo: "590004" para Lengua Castellana y Literatura del Cuerpo de Secundaria. |
| `denominacion` | texto | obligatorio | Nombre oficial. |
| `familia_profesional` | texto | opcional | Para FP: familia profesional a la que pertenece. |

### 4.4 Tabla `categorias_sns_unitarias`

El catálogo homogéneo del SNS según RD 184/2015. Es la denominación común que unifica las distintas denominaciones de cada servicio de salud.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio | |
| `denominacion_unitaria` | texto | obligatorio, único | Nombre estandarizado. Ejemplo: "Facultativo Especialista de Área". |
| `subgrupo` | texto corto | obligatorio | A1, A2, etc. |
| `requiere_especialidad` | sí/no | obligatorio | Si SÍ, la app pedirá además una especialidad concreta (p. ej. Cardiología) en el formulario de anuncio. |

### 4.5 Tabla `categorias_sns_autonomicas`

Equivalencias: cómo se llama cada categoría unitaria en cada servicio de salud autonómico.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `categoria_unitaria_id` | referencia a `categorias_sns_unitarias.id` | obligatorio | |
| `servicio_salud_codigo` | referencia a `servicios_salud.codigo` | obligatorio | |
| `denominacion_local` | texto | obligatorio | Nombre que usa ese servicio. Ejemplo: en SERGAS el FEA de Cardiología puede aparecer con otro nombre exacto. |

---

## 5. Bloque 4 — Operación

### 5.1 Tabla `anuncios`

El núcleo. Una fila por anuncio activo o histórico.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio | |
| `usuario_id` | referencia a `usuarios.id` | obligatorio | Quién publicó el anuncio. |
| `sector_codigo` | referencia a `sectores.codigo` | obligatorio | A qué sector pertenece. |
| `cuerpo_id` | referencia a `cuerpos.id` | obligatorio | Cuerpo del funcionario. |
| `especialidad_id` | referencia a `especialidades.id` | opcional | Solo si el cuerpo tiene especialidades. |
| `categoria_sns_unitaria_id` | referencia a `categorias_sns_unitarias.id` | opcional | Solo si el sector es `sanitario_sns`. |
| `municipio_actual_codigo` | referencia a `municipios.codigo_ine` | obligatorio | Municipio donde está la plaza actual. |
| `servicio_salud_codigo` | referencia a `servicios_salud.codigo` | opcional | Solo si el sector es `sanitario_sns`. Determina el ámbito territorial de matching para sanidad. |
| `ccaa_codigo` | referencia a `ccaa.codigo_ine` | obligatorio | CCAA del puesto actual. Necesario para enforzar reglas geográficas de los sectores intra-CCAA (autonómicos, policía local). |
| `fecha_toma_posesion_definitiva` | fecha | obligatorio | Cuándo tomó posesión del destino actual con carácter definitivo. Necesario para la regla "≥2 años en destino" (docencia y otros). |
| `anyos_servicio_totales` | número entero | obligatorio | Años totales de servicio en la administración. Necesario para la regla "diferencia ≤5 años". |
| `permuta_anterior_fecha` | fecha | opcional | Si el usuario ya permutó alguna vez, fecha de la última. Para la regla "10 años de carencia". |
| `observaciones` | texto largo | opcional | Texto libre. Solo visible al match. NO se usa para matching. NO debe contener datos sensibles (la app lo advierte). |
| `estado` | texto | obligatorio | "activo", "pausado", "caducado", "matched", "eliminado". |
| `creado_el` | fecha y hora | automático | |
| `actualizado_el` | fecha y hora | automático | |
| `caduca_el` | fecha y hora | obligatorio | Por defecto 6 meses desde la creación. Renovable manualmente por el usuario. |

### 5.2 Tabla `anuncio_plazas_deseadas`

La lista LIMPIA de municipios donde el usuario aceptaría irse. Es lo que usa el matcher.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `anuncio_id` | referencia a `anuncios.id` | obligatorio | |
| `municipio_codigo` | referencia a `municipios.codigo_ine` | obligatorio | |

(Tabla puente. Cada anuncio tendrá entre 1 y N filas. Una clave compuesta de los dos campos.)

### 5.3 Tabla `anuncio_atajos`

Los atajos que el usuario eligió para construir su lista de plazas deseadas. Es metadato útil para que él pueda editar el anuncio sin re-clicar todo en el mapa, y para mostrar en la tarjeta del anuncio frases como "Toda la provincia de Pontevedra + 30 km alrededor de Lugo capital".

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio | |
| `anuncio_id` | referencia a `anuncios.id` | obligatorio | |
| `tipo` | texto | obligatorio | "ccaa", "provincia", "comarca", "radio", "municipio_individual". |
| `valor` | texto | obligatorio | Código INE del elemento (CCAA, provincia, comarca) o, para "radio", una expresión tipo "36057;30" (municipio centro;km). |

La app mantiene `anuncio_plazas_deseadas` y `anuncio_atajos` consistentes: cuando el usuario añade un atajo, la app expande automáticamente los municipios resultantes a la lista plana.

### 5.4 Tabla `cadenas_detectadas`

Cada vez que el matcher encuentra un ciclo válido, lo guarda aquí. Sirve para no volver a notificar lo mismo y para histórico.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio | |
| `longitud` | número entero | obligatorio | 2, 3 o 4. |
| `huella` | texto | obligatorio, único | Hash o cadena canónica de los IDs de anuncio ordenados. Sirve para detectar duplicados (el mismo ciclo puede aparecer rotado: A→B→C→A == B→C→A→B). |
| `score` | número decimal | obligatorio | Calidad de la cadena (basado en distancias, antigüedad, completitud de datos). Mayor score = mejor cadena. |
| `detectada_el` | fecha y hora | automático | |
| `estado` | texto | obligatorio | "activa" (todos los anuncios siguen activos), "rota" (algún anuncio se eliminó/caducó). |

### 5.5 Tabla `cadena_participantes`

Los anuncios que componen una cadena, en orden.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `cadena_id` | referencia a `cadenas_detectadas.id` | obligatorio | |
| `anuncio_id` | referencia a `anuncios.id` | obligatorio | |
| `posicion` | número entero | obligatorio | 1, 2, 3 o 4. Define el orden del ciclo. |

### 5.6 Tabla `notificaciones`

Cuando se detecta una cadena, se crea una notificación por cada participante.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio | |
| `usuario_id` | referencia a `usuarios.id` | obligatorio | |
| `tipo` | texto | obligatorio | "cadena_nueva", "mensaje_nuevo", "anuncio_caduca_pronto", etc. |
| `cadena_id` | referencia a `cadenas_detectadas.id` | opcional | Si la notificación es por cadena nueva. |
| `creada_el` | fecha y hora | automático | |
| `leida_el` | fecha y hora | opcional | Cuándo el usuario la marcó como leída. |
| `enviada_email_el` | fecha y hora | opcional | Si se envió email, cuándo. |

### 5.7 Tabla `hilos_mensaje`

Cuando dos usuarios deciden hablar por una cadena, se crea un hilo entre ellos. Si la cadena es de 3 ó 4, hay tantos hilos bilaterales como pares haya en la cadena (un hilo por cada par interesado). No se crea automáticamente: el usuario decide a quién contactar.

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio | |
| `cadena_id` | referencia a `cadenas_detectadas.id` | obligatorio | A qué cadena pertenece. |
| `usuario_a_id` | referencia a `usuarios.id` | obligatorio | Uno de los dos. |
| `usuario_b_id` | referencia a `usuarios.id` | obligatorio | El otro. |
| `creado_el` | fecha y hora | automático | |
| `cerrado_el` | fecha y hora | opcional | Si alguno marca el hilo como cerrado. |

### 5.8 Tabla `mensajes`

| Columna | Tipo | Restricción | Descripción |
|---|---|---|---|
| `id` | identificador único | obligatorio | |
| `hilo_id` | referencia a `hilos_mensaje.id` | obligatorio | |
| `autor_id` | referencia a `usuarios.id` | obligatorio | |
| `contenido` | texto largo | obligatorio | Texto del mensaje. |
| `enviado_el` | fecha y hora | automático | |
| `leido_el` | fecha y hora | opcional | Cuándo el destinatario lo leyó. |

---

## 6. Reglas de matching por sector

Pseudocódigo legible. Cada función decide si EXISTE una arista A→B en el grafo dirigido (A aceptaría irse a la plaza actual de B). El motor recorre todos los pares posibles aplicando la función del sector correspondiente.

```
funcion arista_valida(A, B):
    si A.sector != B.sector:
        devolver FALSO         # nunca cruzamos sectores
    si A.usuario == B.usuario:
        devolver FALSO         # un usuario no permuta consigo mismo
    si A.municipio_actual == B.municipio_actual:
        devolver FALSO         # sin sentido permutar dentro de la misma plaza
    si B.municipio_actual NO ESTÁ EN A.plazas_deseadas:
        devolver FALSO         # A no acepta esa plaza
    si NO regla_compatibilidad_profesional(A, B, A.sector):
        devolver FALSO
    si NO regla_geografica(A, B, A.sector):
        devolver FALSO
    si NO regla_personal(A, B, A.sector):
        devolver FALSO
    devolver VERDADERO
```

### 6.1 `regla_compatibilidad_profesional` por sector

```
docente_loe:        A.cuerpo == B.cuerpo Y A.especialidad == B.especialidad

sanitario_sns:      A.categoria_sns_unitaria == B.categoria_sns_unitaria
                    Y (si requiere_especialidad: A.especialidad == B.especialidad)

age:                A.cuerpo == B.cuerpo Y A.subgrupo == B.subgrupo
                    Y A.especialidad == B.especialidad (si la hay)

ccaa:               A.cuerpo == B.cuerpo Y A.subgrupo == B.subgrupo
                    Y A.ccaa_actual == B.ccaa_actual    # las CCAA propias no cruzan CCAA

local:              A.cuerpo == B.cuerpo Y A.subgrupo == B.subgrupo
                    Y "plazas de idéntica clase" (modelado como cuerpo+especialidad)

habilitado:         A.subescala == B.subescala Y A.categoria == B.categoria

policia_local:      A.cuerpo == B.cuerpo Y A.escala == B.escala
                    Y A.categoria == B.categoria
```

### 6.2 `regla_geografica` por sector

```
docente_loe:        siempre VERDADERO   # nacional, incluso inter-CCAA

sanitario_sns:      A.servicio_salud == B.servicio_salud
                    O (A.servicio_salud admite_inter_servicios
                       Y B.servicio_salud admite_inter_servicios)
                    # caso Cantabria

age:                siempre VERDADERO   # nacional sin límite

ccaa:               A.ccaa_actual == B.ccaa_actual

local:              siempre VERDADERO   # intermunicipal sin límite, incluso inter-CCAA

habilitado:         siempre VERDADERO   # intermunicipal e inter-CCAA

policia_local:      A.ccaa_actual == B.ccaa_actual
                    Y A.ccaa_actual EN [andalucia, aragon, baleares, valencia, galicia]
                    # solo CCAA con regulación expresa
```

### 6.3 `regla_personal` (común a casi todos los sectores)

```
edad_a_jubilacion(A) = años hasta que A cumpla la edad de jubilación forzosa
                       (basado en A.fecha_nacimiento y régimen aplicable)

|A.años_servicio - B.años_servicio| <= 5      # diferencia máxima de antigüedad
edad_a_jubilacion(A) >= 10
edad_a_jubilacion(B) >= 10
A.permuta_anterior_fecha == NULL O hace >= 10 años
B.permuta_anterior_fecha == NULL O hace >= 10 años
```

Excepciones por sector:
- `local`: solo se exige <60 años (no hay regla de carencia ni de antigüedad).
- `policia_local` (caso Galicia): además requiere ≥10 años de servicio ininterrumpido y diferencia ≤10 años (no 5).
- `docente_loe`: además requiere ≥2 años en el destino actual con carácter definitivo.

### 6.4 Búsqueda de cadenas

Una vez establecida la matriz de adyacencia (qué pares de anuncios tienen arista), se buscan ciclos de longitud 2, 3 y 4 que pasen por al menos un anuncio del usuario que disparó la búsqueda. Después se deduplican (un mismo ciclo puede aparecer rotado: A→B→C→A es el mismo que B→C→A→B), se les calcula un score y se devuelven ordenados.

Score sugerido (a refinar): `1 / (suma de distancias entre plazas) + bonus por antigüedad de los anuncios + bonus por completitud de datos`. La idea es premiar cadenas geográficamente compactas y con anuncios estables.

---

## 7. Estrategia de ingesta de datos

### 7.1 Ingesta inicial (cargada antes de abrir la app al público)

| Tabla | Fuente | Comentario |
|---|---|---|
| `ccaa`, `provincias`, `municipios` | `diccionario26.xlsx` (INE) + Nomenclátor CNIG (coordenadas) | Procesar el Excel del INE para nombres y códigos; cruzar con CNIG para coordenadas. |
| `servicios_salud` | Hardcodeado a partir de `Ordenacion_sanitaria_2021.pdf` | 17 + INGESA. Lista cerrada. |
| `sectores` | Hardcodeado | Lista cerrada de 7 sectores. |
| `categorias_sns_unitarias` + `categorias_sns_autonomicas` | Anexo de `BOE-A-2015-3717-consolidado.pdf` | Extraer la tabla del anexo del RD 184/2015 a CSV y cargarla. |
| `cuerpos` (docentes LOE) + `especialidades` | RD 1834/2008 + `Códigos de todas las especialidades.pdf` | El PDF de Andalucía es probablemente el más limpio. |
| `cuerpos` (habilitados nacionales) | Hardcodeado a partir de RD 128/2018 | Solo 5 combinaciones (3 subescalas × categorías). |

### 7.2 Ingesta progresiva (carga manual o semi-automática conforme avance el proyecto)

| Tabla | Fuente | Estado |
|---|---|---|
| `cuerpos` (AGE) | INAP (PDF) + rptage.com (HTML) | Pendiente. Hay que parsear o transcribir. |
| `cuerpos` (CCAA propios) | Leyes autonómicas + portales de transparencia | Pendiente. Trabajo manual, CCAA por CCAA. |
| `cuerpos` (Administración Local) | RPT de cada entidad | No hay catálogo unificado. Lo razonable es dejar al usuario elegir entre denominaciones tipo (Técnico A1, Administrativo C1, etc.). |
| `cuerpos` (Policía Local) | Leyes de coordinación de las 5 CCAA con regulación | Pendiente. |
| `areas_salud` + `area_salud_municipios` | Mapas autonómicos de ordenación sanitaria | Pendiente. Servicio por servicio. Por defecto, el matcher trabajará a nivel de servicio de salud completo (sin partir por áreas) hasta que esto esté completo. |

---

## 8. Decisiones técnicas que necesito que me confirmes

Cuatro puntos pequeños pero conviene que los apruebes antes de la Tarea 4.

### Decisión E — Fecha de nacimiento del usuario

Para validar la regla legal "≥10 años hasta jubilación forzosa" la app necesita saber la edad. Las dos opciones:

- **E1 — Pedir fecha de nacimiento.** Dato más fiable. Es lo que la administración pide para la permuta real. NO se muestra públicamente.
- **E2 — Pedir solo el año de nacimiento.** Menos dato personal. Suficientemente preciso para el filtro (margen de error de hasta un año).

**Mi recomendación: E2 (solo año).** Minimiza datos personales sin romper la regla.

### Decisión F — Caducidad automática de anuncios

Para que no se acumulen anuncios fantasma de gente que ya permutó por otra vía:

- **F1 — Caducidad a 6 meses, renovable con un clic.** El usuario recibe un aviso 7 días antes. Si no renueva, el anuncio se marca como "caducado" y deja de mostrarse.
- **F2 — Sin caducidad. Solo eliminación manual.**
- **F3 — Caducidad a 12 meses, renovable.** Más laxo.

**Mi recomendación: F1.** Mantiene la base de anuncios fresca sin agobiar al usuario.

### Decisión G — Multilingüismo de la taxonomía

Las especialidades docentes y categorías sanitarias tienen denominaciones en lenguas cooficiales (gallego, catalán, euskera, valenciano).

- **G1 — Solo castellano en MVP.** Una denominación por concepto. Más simple. Si el usuario prefiere otra lengua, se mostrará en castellano de todas formas.
- **G2 — Castellano + lenguas cooficiales desde el día 1.** Cada concepto tiene varias denominaciones. Más datos a mantener pero mejor experiencia para usuarios que no operan en castellano.

**Mi recomendación: G1 (solo castellano en MVP).** La interfaz puede traducirse después; el contenido oficial siempre tiene versión castellana.

### Decisión H — Política de retención de mensajes

Cuando un hilo se cierra o cuando un usuario elimina su cuenta, ¿qué pasa con los mensajes?

- **H1 — Conservación 1 año desde último mensaje, luego borrado automático.**
- **H2 — Conservación indefinida hasta que el usuario los borre manualmente.**
- **H3 — Borrado al cerrar el hilo.**

**Mi recomendación: H1.** Equilibra utilidad práctica (resolver disputas dentro del año) y minimización de datos (RGPD).

---

## 9. Próximo paso

Cuando me respondas a las decisiones E, F, G y H (con OK o alternativa), arranco la **Tarea 4 — Mock del formulario**. La Tarea 4 incluirá:

- Wizard paso a paso (sector → cuerpo → especialidad → plaza actual → plazas deseadas → confirmación).
- Diseño de la pantalla del mapa con multi-clic y atajos por provincia / CCAA / comarca / radio.
- Validaciones por paso.
- Comportamiento esperado en cada caso de error.

Sin código todavía: descripción visual y funcional para que la apruebes antes de programar nada.

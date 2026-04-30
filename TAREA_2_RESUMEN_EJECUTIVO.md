# TAREA 2 — Resumen ejecutivo de PermutaES

Documento entregado el 2026-04-30 al cierre de la sesión 1.

---

## 1. Qué es PermutaES

PermutaES es una plataforma web nacional para que cualquier funcionario público español que pueda permutar legalmente encuentre coincidencias compatibles con otros funcionarios. Una "permuta" es el intercambio recíproco de plaza entre dos (o más) funcionarios que cumplen los mismos requisitos legales y aceptan irse cada uno al destino del otro.

PermutaES es el sucesor multisectorial de PermutaDoc, un prototipo anterior que cubría únicamente al profesorado de Galicia y leía datos públicos de profesoradogalicia.com. Lo que se conserva es el algoritmo de detección de cadenas (grafo dirigido + búsqueda de ciclos de longitud 2, 3 y 4) y la idea de no usar texto libre para las plazas deseadas. Lo que cambia es la escala (España completa, todos los sectores con permuta legal admitida), la fuente de datos (anuncios creados por usuarios registrados en lugar de scraping), la arquitectura (backend con base de datos y autenticación) y el cumplimiento legal (RGPD aplica plenamente).

El problema que resuelve: hoy no existe en España ningún agregador nacional de permutas funcionariales. Lo que hay son secciones de webs sindicales (CSIF, ANPE, CCOO), foros generalistas (funcionarios.net), grupos de Facebook y módulos internos en intranets sanitarias autonómicas. Todos fragmentados por sector y por comunidad autónoma. Ninguno hace matching algorítmico — funcionan como tablones de anuncios donde cada usuario tiene que leer cientos de mensajes en texto libre para localizar manualmente una pareja compatible.

Decisiones cerradas en sesión 1:

- Alcance: todo el funcionariado español que pueda permutar legalmente, desde el primer día. No hay MVP de un solo sector.
- Solo permutas definitivas. Sin destinos provisionales, sin comisiones de servicio, sin intercambios de interinos.
- Sin verificación de usuarios en MVP. Cualquiera puede registrarse y publicar.
- El motor de matching enforza las reglas legales. Si dos anuncios no pueden permutar legalmente, la app NO los empareja, ni siquiera los muestra como candidatos posibles.
- App gratuita. Monetización en fase posterior si procede.
- Push a GitHub lo hace Vaquero. Claude solo hace commits locales.

---

## 2. Sectores cubiertos desde el día 1

| Sector | Norma reguladora | Ámbito territorial | Volumen aproximado de funcionarios de carrera |
|---|---|---|---|
| **Profesorado no universitario (cuerpos LOE)** | Disposición adicional sexta del RD 1364/2010 + RD 1834/2008 | Nacional, incluido inter-CCAA con doble autorización | ~700.000 (incluye laboral) |
| **Personal estatutario fijo del SNS** | Ley 55/2003 (Estatuto Marco) + RD 184/2015 (catálogo homogéneo) + normas autonómicas | Intra-Servicio de Salud autonómico | ~700.000 |
| **Funcionarios de la AGE (cuerpos generales y especiales)** | Art. 62 Ley de Funcionarios Civiles del Estado (Decreto 315/1964) | Nacional sin límites territoriales | ~417.000 |
| **Funcionarios de Comunidades Autónomas** | Ley autonómica de función pública (varía por CCAA) | Intra-CCAA | ~929.000 |
| **Funcionarios de Administración Local (cuerpos generales)** | Art. 98 Reglamento Funcionarios Administración Local 1952 | Intermunicipal, también entre CCAA | ~211.000 |
| **Habilitados nacionales (Secretaría, Intervención-Tesorería, Secretaría-Intervención)** | RD 128/2018 + procedimiento MTDFP | Intermunicipal e inter-CCAA | ~5.000 |
| **Policía Local** (solo en CCAA con regulación específica) | Leyes autonómicas de coordinación de Policía Local: Andalucía, Aragón, Illes Balears, Comunitat Valenciana, Galicia | Intra-CCAA exclusivamente | (no localizado dato unificado) |

Total potencial: del orden de 2,9 millones de funcionarios pueden, en principio, usar la app si están en destino definitivo y cumplen los requisitos personales (antigüedad, edad, carencia entre permutas, etc.).

---

## 3. Sectores explícitamente excluidos

| Sector | Motivo de exclusión |
|---|---|
| Militares y Fuerzas Armadas | Sin figura de permuta recíproca en la Ley de la carrera militar ni en sus reglamentos. |
| Personal eventual (de confianza) | Nombramiento y cese libre. Fuera de los procedimientos de provisión. |
| Personal interino y temporal en general | La permuta legal está reservada a personal con destino definitivo. Los interinos tienen una figura distinta (intercambios provisionales) que la app no cubre. |
| Profesorado universitario funcionario | Sin regulación estatal específica de permuta. La movilidad va por concursos de acceso entre universidades. |
| Jueces y magistrados | Movilidad por concursos de traslado regulados por el CGPJ. Sin permuta recíproca. |
| Fiscales | Sin permuta regulada. Movilidad por concursos del Ministerio Fiscal. |
| Letrados de la Administración de Justicia (LAJ) | Sin permuta formal localizada. Movilidad por concurso de traslados. |
| Cuerpos generales y especiales de Justicia (Gestión, Tramitación, Auxilio, Médicos Forenses, INTCF) | Sin permuta formal regulada. Movilidad solo por concursos. |
| Cuerpo Nacional de Policía y Guardia Civil | Sin permuta documentada en sus reglamentos públicos. Movilidad por concursos y libre designación. |
| Policías autonómicas (Mossos d'Esquadra, Ertzaintza, Policía Foral, Policía Canaria) | Sus leyes propias regulan movilidad por concursos, no permutas recíprocas. |
| Profesorado de centros concertados | Régimen laboral, no funcionarial. Fuera del alcance. |
| Personal laboral fijo (incluido Correos) | Régimen laboral por convenio colectivo. Fuera del MVP — podría reconsiderarse en fases posteriores. |

---

## 4. Reglas de matching por sector (resumen operativo)

Para que el motor de matching considere a dos anuncios como una permuta posible, deben cumplirse SIMULTÁNEAMENTE las reglas del sector que les corresponde. Son las que la app va a enforzar como filtro duro antes de mostrar cualquier cadena candidata.

| Sector | Regla de identidad de plaza | Regla geográfica | Otros filtros legales |
|---|---|---|---|
| Profesorado no universitario | Mismo cuerpo (590, 591, 594, 595, 596, 597, 598) + misma especialidad (código completo, p. ej. 590004) | Sin límite territorial | 2 años en destino definitivo, dif. antigüedad ≤5 años, ≥10 años hasta jubilación, carencia 10 años |
| Sanidad estatutaria | Misma categoría estatutaria + misma especialidad (catálogo homogéneo RD 184/2015) | Solo intra-Servicio de Salud autonómico (caso especial: Cantabria admite permutas con otros servicios si el de origen también las regula — marcar como excepción) | Variable por CCAA; en defecto, patrón clásico (10 años jubilación + 10 años carencia) |
| AGE | Igual cuerpo/escala + misma forma de provisión + naturaleza del puesto (nivel, complementos) | Sin límite territorial nacional | Dif. antigüedad ≤5 años, ≥10 años hasta jubilación, carencia 10 años, anulación si jubilación voluntaria en 2 años |
| CCAA | Igual cuerpo autonómico + misma escala/categoría | Intra-CCAA (sin cruces entre CCAA) | Donde la CCAA tenga ley propia (Cantabria, Castilla-La Mancha, Comunitat Valenciana, Illes Balears, La Rioja), aplicar sus requisitos. Resto: art. 62 LFC supletorio |
| Administración Local | Mismo grupo y categoría + plazas de idéntica clase | Intermunicipal sin límite territorial (incluso entre CCAA) | <60 años, plazas en propiedad |
| Habilitados nacionales | Misma subescala (Secretaría / Intervención-Tesorería / Secretaría-Intervención) + misma categoría (superior / entrada) | Intermunicipal e inter-CCAA | Patrón clásico (5/10/10/2) |
| Policía Local | Misma escala + misma categoría + dentro de la misma CCAA | Solo intra-CCAA, en las 5 CCAA con regulación expresa | Variable por CCAA; en Galicia, requisitos detallados (10 años, dif. ≤10 años, ≥5 años hasta segunda actividad, sin sanciones, carencia 5 años) |

**Regla transversal crítica:** la app NO empareja anuncios de sectores distintos entre sí. Un funcionario AGE no permuta con uno autonómico, ni un autonómico con uno local. Las únicas permutas interadministrativas reguladas son las de docentes (entre administraciones educativas distintas) y las de habilitados nacionales (entre corporaciones locales de cualquier territorio).

---

## 5. Decisiones críticas pendientes

Estas son las decisiones que necesito que tomes antes de pasar a la **Tarea 3 (esquema de datos)**. Cada una afecta directamente al diseño de la base de datos y del formulario.

### Decisión A — Modelo de contacto entre usuarios

Cuando dos anuncios encajan, ¿cómo se comunican los funcionarios entre sí?

- **Opción A1 — Mensajería interna integrada en la app.** Los usuarios chatean dentro de PermutaES sin compartir email ni teléfono. Implica una tabla de mensajes, moderación y mayor superficie de RGPD. Más trabajo técnico pero mejor experiencia y privacidad.
- **Opción A2 — Revelación de contacto al match.** Cuando hay match, la app muestra el email (o un alias de email) del otro. Las conversaciones siguen fuera de la plataforma. Más simple técnicamente, menos protección de datos.
- **Opción A3 — Mixto.** Por defecto se revela el email (alias), pero el usuario puede elegir activar mensajería interna. Mayor flexibilidad pero más complejidad de diseño.

**Mi recomendación: A1 (mensajería interna).** Razón: protege la identidad real, evita exposición de contactos personales en una plataforma pública sin verificación de usuarios, y es lo estándar en plataformas modernas. El coste de desarrollo es asumible.

### Decisión B — Motivos de permuta

¿Permitimos que el usuario indique por qué quiere permutar (conciliación, salud, violencia de género, acercamiento familiar, etc.)?

- **Opción B1 — No incluir motivo.** El anuncio se limita a datos profesionales y geográficos. Cero datos sensibles. Cumplimiento RGPD trivial.
- **Opción B2 — Casilla genérica "tengo circunstancias especiales".** Sin describir nada en la plataforma. Si dos personas matchean, lo hablan privadamente. Riesgo RGPD bajo.
- **Opción B3 — Texto libre o casillas estructuradas (salud, conciliación, violencia género, etc.).** Información rica para los funcionarios pero entra de lleno en categorías especiales del RGPD: obliga a Análisis de Impacto en Protección de Datos (DPIA), Delegado de Protección de Datos (DPO), cifrado en reposo, registro detallado de accesos. Coste legal y técnico significativo.

**Mi recomendación: B1 (no incluir motivo).** Los motivos no son necesarios para el matching técnico. La administración valorará los motivos cuando los funcionarios tramiten el expediente real, no la app. Quitar este campo simplifica drásticamente el cumplimiento legal.

### Decisión C — Visibilidad pública de los anuncios

¿Quién puede ver los anuncios publicados en la plataforma?

- **Opción C1 — Solo usuarios registrados.** Para ver cualquier anuncio hay que crear cuenta. Más fricción al entrar, mejor protección de datos, mejor capacidad de contar usuarios reales.
- **Opción C2 — Lectura pública anónima, publicación requiere registro.** Cualquiera puede navegar el catálogo de anuncios. Solo se necesita cuenta para publicar uno propio o contactar. Mejor SEO y descubrimiento, mayor exposición de los datos publicados.
- **Opción C3 — Lectura pública con datos limitados; detalle completo solo registrados.** Anónimos ven solo cuerpo + provincia. Detalle de plazas deseadas y observaciones requiere login. Equilibrio entre los dos extremos.

**Mi recomendación: C3 (lectura limitada anónima, detalle solo registrados).** Permite que la gente descubra la plataforma sin barrera de entrada, pero protege la información granular (que es lo que tiene valor para detectar matches manualmente fuera de la app).

### Decisión D — Forma jurídica del responsable de tratamiento

Esto puedes posponerlo hasta antes de poner la app en producción, pero conviene tenerlo claro pronto porque condiciona el aviso legal y los términos de uso.

- **Opción D1 — Persona física (autónomo).** Tú como responsable directo. Lo más simple. Sin separación de patrimonio personal.
- **Opción D2 — Sociedad limitada.** Estándar para proyectos con vocación de crecer. Separación patrimonial. Más coste y obligaciones contables.
- **Opción D3 — Asociación sin ánimo de lucro.** Buena imagen frente a sindicatos y usuarios. Limita la monetización futura.

**Mi recomendación: D1 (autónomo) hasta validar el producto.** Cuando la plataforma tenga tracción, migramos a SL si tiene sentido. Es lo barato y rápido.

---

## 6. Próximo paso

En cuanto me respondas a las decisiones A, B, C y D (con un sí/no a cada recomendación, o con una alternativa), arranco la **Tarea 3 — Esquema de datos**. La Tarea 3 incluirá:

- Modelo conceptual de tablas: usuarios, anuncios, taxonomía cuerpos/escalas/especialidades, municipios INE, áreas de salud por servicio, históricos de cadenas, mensajería (si aplica según decisión A).
- Reglas de matching como funciones lógicas legibles, una por sector.
- Estrategia de ingesta de datos (qué cargamos al inicio, qué cargamos progresivamente).

Las Tareas 4 (formulario), 5 (stack) y 6 (plan de fases) vendrán después, una por una.

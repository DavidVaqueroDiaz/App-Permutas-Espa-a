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

## Bloqueado a la espera de

Respuestas de Perplexity al **prompt de investigación profunda** generado el 2026-04-30 (Bloques A–F):

- A. Catálogo completo de cuerpos / escalas / especialidades por sector (AGE, docencia, sanidad, justicia, local, habilitados nacionales, seguridad estatal, autonómico, etc.).
- B. Reglas de compatibilidad entre anuncios (equivalencia estricta vs afinidad, matriz geográfica por sector, cruces entre sectores).
- C. Requisitos personales y procedimiento administrativo por sector.
- D. Marco legal del producto en sí (RGPD/DPIA, LSSI-CE, licencias INE/CNIG).
- E. Fuentes de datos descargables (URLs concretas).
- F. Benchmarking (plataformas existentes, tamaños de colectivo, comparativa internacional).

Sin esos datos no se puede arrancar la Tarea 2 con rigor — el resumen ejecutivo dependería demasiado de "según el sector, depende".

---

## Tareas pendientes

1. **Tarea 2 — Resumen ejecutivo.** Listado real de sectores que cubre la app, sectores excluidos, decisiones críticas que hay que cerrar antes de seguir.
2. **Tarea 3 — Esquema de datos.** Tablas conceptuales: usuarios, anuncios, taxonomía de cuerpos/escalas/especialidades, municipios INE, compatibilidades intersectoriales, histórico de cadenas detectadas, mensajería entre matchs.
3. **Tarea 4 — Mock del formulario.** Wizard paso a paso (sector → cuerpo → especialidad → plaza actual → plazas deseadas → confirmación), mapa con multi-clic y atajos por provincia/CCAA/comarca/radio, validaciones por paso.
4. **Tarea 5 — Stack candidato.** Frontend, backend, BD, auth, despliegue, fuente de datos geográficos. Propondremos opción óptima y opción simple. Decisión final la toma Vaquero.
5. **Tarea 6 — Plan de fases.** MVP → beta privada → beta pública → producción, con criterios claros de transición entre cada una.

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
- Se redacta un prompt extenso (Bloques A–F) para una segunda ronda de investigación en Perplexity, orientada a obtener catálogos exhaustivos y reglas operativas concretas.
- Se inicializa el repo Git en `C:\Users\Usuario\Desktop\APP permutas`, se conecta al remoto `https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a`, se crean `PROGRESO.md` y `.gitignore`, y se hace el commit inicial.
- El PDF de Perplexity y el `prompt inicial.txt` quedan en `.gitignore` (material de referencia personal — no se suben al repo público).

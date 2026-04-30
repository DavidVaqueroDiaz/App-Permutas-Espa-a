# PermutaES

> Plataforma nacional gratuita de permutas para funcionarios públicos en España. Detecta automáticamente cadenas de permuta directas (entre 2 personas), a 3 y a 4, aplicando las reglas legales específicas de cada sector.

Repo público: https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a

## Estado del proyecto

**Fase 0 — Setup técnico** (2026-04). El esqueleto del proyecto está montado pero la app aún no tiene funcionalidad real. La portada muestra una página provisional "PermutaES, próximamente".

Las 7 tareas de la fase de diseño están entregadas como documentos en este repo (`TAREA_2_*.md` a `TAREA_7_*.md`) y el plan de fases vive en `TAREA_6_PLAN_DE_FASES.md`. El estado vivo del proyecto está siempre en `PROGRESO.md`.

## Stack tecnológico

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Estilos**: Tailwind CSS v4
- **Base de datos y autenticación**: Supabase (Postgres gestionado)
- **Email transaccional**: Resend
- **Hosting**: Vercel (despliegue automático desde `main`)

## Documentación interna

| Documento | Contenido |
|---|---|
| `PROGRESO.md` | Estado vivo del proyecto. Lo primero que se lee al retomar sesión. |
| `TAREA_2_RESUMEN_EJECUTIVO.md` | Definición del producto, sectores cubiertos y excluidos, decisiones críticas A-D. |
| `TAREA_3_ESQUEMA_DATOS.md` | Modelo conceptual de datos (15 tablas) + reglas de matching por sector. Decisiones E-H. |
| `TAREA_4_MOCK_FORMULARIO.md` | Wizard de creación de anuncio, mapa con atajos, mensajería, validaciones. Decisiones I-K. |
| `TAREA_5_STACK_TECNOLOGICO.md` | Justificación del stack. Decisión L. |
| `TAREA_6_PLAN_DE_FASES.md` | Plan de desarrollo en 5 fases. Decisión M. |
| `TAREA_7_SEO_GEO.md` | Estrategia de descubrimiento por buscadores e IAs. Decisiones N-P. |
| `STACK_INSTALADO.md` | Inventario de servicios contratados y cómo configurar el entorno local. |

## Desarrollo local

Requisitos: Node.js 20+ y npm 10+.

```bash
# Instalar dependencias
npm install

# Copiar la plantilla de variables de entorno y rellenarla
cp .env.local.example .env.local
# (editar .env.local con las claves reales de Supabase y Resend)

# Arrancar servidor de desarrollo
npm run dev
```

El servidor estará en http://localhost:3000.

## Despliegue

El despliegue es automático: cualquier push a la rama `main` se publica en Vercel en menos de 2 minutos.

## Licencia

Por definir. Mientras tanto, todos los derechos reservados al autor.

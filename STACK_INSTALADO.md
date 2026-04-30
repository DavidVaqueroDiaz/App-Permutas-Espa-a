# STACK_INSTALADO

Inventario de servicios y configuración técnica del proyecto. Se va actualizando conforme avanzamos.

---

## 1. Servicios externos contratados

| Servicio | Para qué | Plan | Cuenta |
|---|---|---|---|
| **GitHub** | Repositorio de código | Free | DavidVaqueroDiaz |
| **Supabase** | Base de datos PostgreSQL + autenticación + storage | Free (Nano) | Proyecto `permutaes-dev` en región Central EU (Frankfurt) |
| **Resend** | Envío de emails transaccionales | Free (3.000 emails/mes) | DavidVaqueroDiaz |
| **Vercel** | Hosting y despliegue automático | Hobby (gratuito) | Conectado a la cuenta de GitHub |

Costes mensuales: 0 €. Habrá que pagar planes Pro solo cuando la app supere los límites gratuitos (esperable como mínimo varios meses después del lanzamiento).

---

## 2. Estructura del proyecto

```
APP permutas/
├── .git/                           # Repo Git
├── .env.local.example              # Plantilla de variables de entorno
├── .gitignore                      # Archivos no incluidos en Git
├── AGENTS.md                       # Instrucciones para agentes IA (Next.js 16)
├── CLAUDE.md                       # Idem (apunta a AGENTS.md)
├── PROGRESO.md                     # Memoria viva del proyecto
├── README.md                       # Documentación principal
├── STACK_INSTALADO.md              # Este documento
├── TAREA_2_*.md a TAREA_7_*.md     # Documentos de la fase de diseño
├── eslint.config.mjs               # Configuración ESLint
├── next.config.ts                  # Configuración de Next.js
├── next-env.d.ts                   # Tipos de Next.js
├── package.json                    # Dependencias del proyecto
├── package-lock.json               # Lock de versiones
├── postcss.config.mjs              # Configuración de PostCSS (para Tailwind)
├── tsconfig.json                   # Configuración de TypeScript
├── public/                         # Archivos estáticos servidos en /
│   └── llms.txt                    # Resumen para LLMs (estándar GEO)
└── src/
    └── app/                        # App Router de Next.js
        ├── favicon.ico
        ├── globals.css
        ├── layout.tsx              # Layout raíz con metadatos SEO
        ├── page.tsx                # Página de inicio provisional
        ├── robots.ts               # robots.txt dinámico
        └── sitemap.ts              # sitemap.xml dinámico
```

---

## 3. Variables de entorno requeridas

Hay un archivo `.env.local.example` con la plantilla. El archivo real `.env.local` NO se commitea (está en `.gitignore`).

| Variable | Dónde se obtiene | Si es secreta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Dashboard Supabase → Settings → API → Project URL | No (se publica al cliente) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard Supabase → Settings → API → anon public | No (se publica al cliente, pero igualmente NO se commitea) |
| `RESEND_API_KEY` | Dashboard Resend → API Keys | Sí, secreta |
| `RESEND_FROM_EMAIL` | Email "from" desde el que la app envía. En desarrollo: `onboarding@resend.dev`. En producción: dominio verificado. | No |

---

## 4. Cómo arrancar el proyecto en local (paso a paso)

```bash
# 1. Clonar el repo (la primera vez)
git clone https://github.com/DavidVaqueroDiaz/App-Permutas-Espa-a.git
cd "App-Permutas-Espa-a"

# 2. Instalar dependencias
npm install

# 3. Copiar la plantilla de variables de entorno
cp .env.local.example .env.local

# 4. Editar .env.local y poner las claves reales
#    (con cualquier editor — Notepad, VS Code, etc.)

# 5. Arrancar el servidor de desarrollo
npm run dev
```

El servidor escucha en http://localhost:3000.

Cualquier cambio en archivos del proyecto se recarga automáticamente en el navegador.

---

## 5. Cómo se despliega

El despliegue es automático:
1. Cualquier `git push` a la rama `main` dispara un build en Vercel.
2. Vercel construye el proyecto, ejecuta los tests y lo publica.
3. La URL pública (`permutaes.vercel.app` provisional, dominio propio en Fase 3) se actualiza en menos de 2 minutos.

Las variables de entorno de producción se configuran en el dashboard de Vercel (Project Settings → Environment Variables), NO en archivos `.env`.

---

## 6. Configuración SEO/GEO ya activa desde Fase 0

- **`robots.txt` dinámico** en `/robots.txt`. Permite explícitamente bots de IA: GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Google-Extended, GoogleOther, CCBot, Applebot-Extended, Bytespider, Amazonbot, Meta-ExternalAgent.
- **`sitemap.xml` dinámico** en `/sitemap.xml`. Por ahora solo lista la home — se irá expandiendo en Fase 1.
- **`llms.txt`** en `/llms.txt`. Resumen estructurado del proyecto para que los LLMs lo entiendan rápido.
- **Metadatos completos** en `<head>`: title, description, keywords, Open Graph, Twitter Cards, canonical, robots.
- **HTML semántico** en castellano (`lang="es"`).

---

## 7. Comandos útiles

```bash
npm run dev      # Servidor de desarrollo en http://localhost:3000
npm run build    # Compilar para producción (verifica que no hay errores)
npm run start    # Servir el build de producción localmente
npm run lint     # Revisar errores de estilo y código
```

---

## 8. Próximos pasos (sigue el plan de Tarea 6)

Cuando termine Fase 0 (este documento + URL Vercel funcionando + Vaquero registrado de prueba), arrancamos **Fase 1 — Alfa interna** con la implementación del wizard de docencia LOE.

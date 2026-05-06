# Activar Sentry en producción

El código está listo. Sentry **NO se inicializa** mientras
`NEXT_PUBLIC_SENTRY_DSN` esté vacío, así que la app sigue funcionando
en local sin tocar nada. Para activarlo en producción:

## 1. Crear cuenta y proyecto

1. Entra en https://sentry.io/signup/ — plan **Developer (gratis)** es
   suficiente para empezar (5k errores/mes, 10k traces/mes).
2. Crea un proyecto:
   - **Platform**: `Next.js`.
   - **Project name**: `permutaes` (o el que prefieras).
   - **Alert frequency**: "On every new issue" (te recomiendo este
     para alfa — vas a querer enterarte de todo).
3. Copia el **DSN** que te da (tipo `https://xxx@oxxx.ingest.sentry.io/yyy`).
4. Apunta el **org slug** y **project slug** (los ves en la URL del
   panel: `sentry.io/organizations/<ORG>/projects/<PROJECT>/`).

## 2. Generar un Auth Token (para subir sourcemaps)

Sin auth token, los stack traces en Sentry te van a salir con código
minificado y no vas a entender nada. Con auth token, Sentry tiene los
sourcemaps y te muestra la línea original.

1. En Sentry: **Settings → Account → Auth Tokens → Create New Token**.
2. Scopes: marca `project:releases` y `project:read`.
3. Cópialo (solo se muestra una vez).

## 3. Configurar variables en Vercel

En el dashboard de Vercel, **Settings → Environment Variables** del
proyecto, añade estas 4 (Production y Preview):

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN del paso 1 |
| `SENTRY_ORG` | org slug del paso 1 |
| `SENTRY_PROJECT` | project slug del paso 1 |
| `SENTRY_AUTH_TOKEN` | token del paso 2 |

> ⚠️ **No metas `SENTRY_AUTH_TOKEN` en `.env.local` versionado**.
> Solo en Vercel para que esté en el build de producción. En local
> no lo necesitas (Sentry está deshabilitado en `NODE_ENV !== production`
> de todas formas).

## 4. Redeploy

Vercel redeploya solo en cuanto guardas las env vars, o lánzalo manual.
La primera vez verás en los logs algo tipo:

```
[@sentry/nextjs] Successfully uploaded sourcemaps for release ...
```

## 5. Comprobar que funciona

1. En la app desplegada, abre la consola del navegador y pega:
   ```js
   throw new Error("test sentry — borrar este issue luego");
   ```
2. Recarga el panel de Sentry — el error debería aparecer en segundos.
3. Verifica que la línea del stack trace está **desminificada** (ves
   `instrumentation-client.ts` o similar, no `_app-xxx.js:1:23456`).

Si todo OK, marca el issue como resuelto y ya está.

## Coste real esperado

- Plan gratis: 5k errores/mes. Para alfa con 10-50 usuarios reales,
  te sobra muchísimo.
- Si pasas a 1000+ usuarios y se llena el plan, el plan **Team** son
  $26/mes. No es prioridad ahora.

## Qué se reporta y qué no

**Sí se reporta:**
- Excepciones no manejadas en server (server actions, route handlers).
- Excepciones no manejadas en cliente (React renders, event handlers).
- Errores del boundary `global-error.tsx`.
- Replays cortos solo cuando hay error (con texto y media enmascarados
  por defecto — ningún mensaje de chat sale a Sentry).

**No se reporta:**
- Logs de `console.warn` / `console.log` (deliberado: ruidoso).
- Errores capturados con try/catch sin `Sentry.captureException`.
- Errores en local (solo `NODE_ENV === "production"`).
- PII por defecto: cabeceras, IP, user-agent (`sendDefaultPii: false`).

## Si quieres loguear algo a mano

```ts
import * as Sentry from "@sentry/nextjs";

try {
  // ...
} catch (e) {
  Sentry.captureException(e, {
    tags: { feature: "matching" },
    extra: { anuncioId: "..." },
  });
  // sigue tu flujo de error normal (return ok: false, etc.)
}
```

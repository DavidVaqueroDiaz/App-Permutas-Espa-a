# Cumplimiento RGPD en PermutaES

Documento interno: cómo PermutaES cumple los derechos del usuario
descritos en el Reglamento General de Protección de Datos (UE 2016/679)
y la LOPDGDD (LO 3/2018).

> Si un usuario te pide ejercer alguno de estos derechos por email en
> lugar de usar la app, **respondes por escrito en menos de 30 días**.
> Las acciones de la app cubren los 3 derechos automatizables; los
> demás (rectificación, oposición a un tratamiento) los gestionas a
> mano.

---

## Derecho de acceso (art. 15) y portabilidad (art. 20)

**Cómo lo ejerce el usuario:** botón "Descargar mis datos (JSON)" en
`/mi-cuenta` → sección "Privacidad y mis datos".

**Implementación:**
- Server action `exportarMisDatos()` en `src/app/mi-cuenta/rgpd-actions.ts`.
- Lee con la sesión del usuario (RLS aplicado) las tablas:
  - `perfiles_usuario` (perfil)
  - `auth.users` (email, fechas)
  - `anuncios` (todos, incluyendo eliminados/permutados)
  - `anuncio_plazas_deseadas` y `anuncio_atajos` de los anuncios propios
  - `conversaciones` donde participa
  - `mensajes` enviados y recibidos
  - `reportes_anuncios` que ha hecho
  - `cadenas_notificadas` recibidas
- Devuelve un JSON estructurado que el cliente descarga como archivo.
- Filename: `permutaes-mis-datos-YYYY-MM-DD.json`.

**Lo que NO se exporta** (datos no personales del usuario):
- Datos de otros usuarios.
- Cadenas detectadas (es metadata derivada, no aporta info personal).
- Tabla `rate_limit` (no contiene PII identificable).

---

## Derecho al olvido (art. 17)

**Cómo lo ejerce el usuario:** botón "Eliminar mi cuenta" en
`/mi-cuenta` → confirma con su contraseña actual.

**Implementación:**
- Server action `eliminarMiCuenta(passwordActual)` en
  `src/app/mi-cuenta/rgpd-actions.ts`.
- Re-autentica al usuario con su contraseña antes de borrar (defensa
  contra robo de cookie).
- Llama a la RPC SQL `eliminar_mi_cuenta()` (migración 0020) que
  hace `delete from auth.users where id = auth.uid()`.
- `ON DELETE CASCADE` en todas las FKs hace el resto:
  - `perfiles_usuario` (id → auth.users)
  - `anuncios` (usuario_id → auth.users) → en cascada borra plazas,
    atajos, reportes (anuncio_id), cadenas_notificadas (cadena_id).
  - `conversaciones` (usuario_a_id, usuario_b_id → auth.users) →
    en cascada borra mensajes (conversacion_id).
  - `notificaciones` (usuario_id → auth.users).
  - `reportes_anuncios` (reportado_por → auth.users): borra reportes
    que el usuario hizo. Los reportes resueltos por él como admin
    quedan con `resuelto_por = NULL` (intencional, mantiene historial
    de moderación sin identificar al admin).
  - `cadenas_notificadas` (usuario_id → auth.users).

**Por qué via RPC y no via Admin API:**
La alternativa sería usar `supabase.auth.admin.deleteUser` que
requiere la `SUPABASE_SERVICE_ROLE_KEY`. Esa key da acceso total a
Supabase y, si se filtra, el daño es ilimitado. Una RPC SECURITY
DEFINER que solo opera sobre `auth.uid()` es menos peligrosa: aunque
alguien la llame manipulando la sesión, solo puede borrarse a sí
mismo, nunca a otros.

**Acción es irreversible.** El usuario ve un aviso explícito antes
de confirmar.

---

## Derecho de rectificación (art. 16)

**Cómo lo ejerce el usuario:** ya disponible en `/mi-cuenta` →
"Editar perfil" (cambiar alias y año de nacimiento) y "Cambiar
contraseña". Para datos de anuncios, en cada anuncio el botón "Editar".

---

## Derechos sin automatización en la app

Si un usuario los pide por email, los gestionas a mano:

- **Derecho de oposición** (art. 21): a un tratamiento concreto.
  En PermutaES solo hay un tratamiento (matching de anuncios). La
  única forma de oponerse es eliminando la cuenta.

- **Derecho a la limitación** (art. 18): suspender temporalmente.
  Equivale a "desactivar mi anuncio" — actualmente no implementado;
  como workaround, el usuario puede eliminar el anuncio.

- **Reclamación a la AEPD**: el usuario tiene siempre derecho a
  presentar reclamación ante la Agencia Española de Protección de
  Datos. Está mencionado en `/politica-privacidad`.

---

## Cuando un usuario pide algo por email

1. Confirma identidad: comprueba que el email del remitente coincide
   con el de la cuenta. Si no, pide DNI escaneado por seguridad.
2. Documenta la petición: guarda el email original y la fecha.
3. Resuelve dentro de 30 días naturales (art. 12).
4. Responde por escrito incluso si la respuesta es "ya estaba hecho"
   o "no procede".
5. Si superas los 30 días, el usuario puede denunciarte. Multas:
   - Mínimo: 900 €.
   - Casos graves: hasta 20 M€ o 4% facturación.

## Datos retenidos por obligación legal

Aunque el usuario elimine su cuenta:

- **Logs de Vercel y Supabase** pueden mantener IPs y request logs
  unos días. No es PII identificable de forma directa.
- **Mensajes en conversaciones**: borramos los del usuario que se va.
  Los del otro participante siguen viéndose en su lado de la
  conversación, pero el alias del usuario eliminado aparecerá como
  "Usuario eliminado" cuando se cargue.
- **Cadenas detectadas histórico**: las que incluían a este usuario
  se borran en cascada al eliminar sus anuncios.

---

## Versiones

- **v1** (migración 0020): RPC `eliminar_mi_cuenta` + server actions
  `exportarMisDatos` / `eliminarMiCuenta` + UI en `/mi-cuenta`.

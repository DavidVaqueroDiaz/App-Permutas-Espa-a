# Plantillas de email de Supabase Auth

Supabase envía los emails de autenticación (confirmar cuenta, recuperar
contraseña, cambio de email) usando plantillas que se configuran en su panel.
Por defecto Supabase mete un email genérico de "supabase.io" que no inspira
ninguna confianza, sobre todo en una plataforma como PermutaES donde el
usuario está confiando datos personales.

Este documento contiene las plantillas con la identidad visual de PermutaES
listas para copiar/pegar.

## Cómo aplicarlas

1. Entra al panel de Supabase del proyecto.
2. Ve a **Authentication → Email Templates**.
3. Para cada plantilla:
   - Pulsa la pestaña correspondiente (Confirm signup, Reset password, etc.).
   - Cambia el **Subject** por el indicado más abajo.
   - Pega el HTML correspondiente en el campo **Message body** (modo HTML).
   - Guarda con **Save**.
4. Verifica que en **Authentication → URL Configuration**:
   - **Site URL** = `https://permutaes.vercel.app` (o el dominio definitivo).
   - En **Redirect URLs** está añadido `https://permutaes.vercel.app/auth/callback`
     y, si tienes preview deployments, también `https://*.vercel.app/auth/callback`.

## Variables disponibles

Supabase expone estas variables Go (`{{ .Var }}`) dentro de las plantillas:

| Variable | Descripción |
| --- | --- |
| `{{ .ConfirmationURL }}` | URL completa que el usuario debe pulsar (ya incluye el `code` y el `next`). |
| `{{ .Email }}` | Email del usuario. |
| `{{ .SiteURL }}` | El Site URL configurado (sin trailing slash). |
| `{{ .Token }}` | Código OTP de 6 dígitos (no lo usamos, preferimos enlace). |

---

## 1) Confirm signup

> Email que recibe el usuario justo después de registrarse. Crítico:
> es el primer punto de contacto, decide si confía en la plataforma.

**Subject:**

```
Confirma tu cuenta en PermutaES
```

**Body (HTML):**

```html
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f8fafb;font-family:'DM Sans',Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0d4a3a;padding:20px 28px;color:#ffffff;">
                <strong style="font-size:18px;letter-spacing:0.2px;">PermutaES</strong>
                <div style="color:#5dcaa5;font-size:12.5px;margin-top:2px;">Confirma tu email</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.55;color:#1f2937;">
                <p style="margin:0 0 12px 0;font-size:16px;">
                  ¡Bienvenido a <strong style="color:#0d4a3a;">PermutaES</strong>!
                </p>
                <p style="margin:0 0 18px 0;">
                  Has creado una cuenta con el email <strong>{{ .Email }}</strong>.
                  Para terminar el registro y poder publicar tu anuncio, confirma
                  que esta dirección es tuya pulsando el botón:
                </p>
                <p style="margin:0 0 22px 0;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px;">
                    Confirmar mi cuenta →
                  </a>
                </p>
                <p style="margin:0 0 14px 0;color:#64748b;font-size:12.5px;">
                  Si el botón no funciona, copia este enlace en tu navegador:<br>
                  <span style="color:#0f6e56;word-break:break-all;">{{ .ConfirmationURL }}</span>
                </p>
                <p style="margin:0;color:#94a3b8;font-size:12px;">
                  Si no has sido tú, ignora este email — sin confirmación la
                  cuenta no queda activa.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;font-size:11.5px;color:#64748b;background:#f8fafb;border-top:1px solid #e2e8f0;">
                PermutaES · Plataforma para detectar cadenas de permuta entre
                funcionarios públicos en España.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 2) Reset password

> Email para recuperar contraseña. Tiene que dejar muy claro que si el
> usuario no lo pidió, debe ignorarlo.

**Subject:**

```
Recupera tu contraseña de PermutaES
```

**Body (HTML):**

```html
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f8fafb;font-family:'DM Sans',Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0d4a3a;padding:20px 28px;color:#ffffff;">
                <strong style="font-size:18px;letter-spacing:0.2px;">PermutaES</strong>
                <div style="color:#5dcaa5;font-size:12.5px;margin-top:2px;">Recuperar contraseña</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.55;color:#1f2937;">
                <p style="margin:0 0 12px 0;font-size:16px;">
                  <strong style="color:#0d4a3a;">¿Has olvidado tu contraseña?</strong>
                </p>
                <p style="margin:0 0 18px 0;">
                  Hemos recibido una petición de cambio de contraseña para la
                  cuenta <strong>{{ .Email }}</strong>. Pulsa el botón para elegir
                  una nueva. El enlace caduca pronto, así que no tardes:
                </p>
                <p style="margin:0 0 22px 0;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px;">
                    Cambiar mi contraseña →
                  </a>
                </p>
                <p style="margin:0 0 14px 0;color:#64748b;font-size:12.5px;">
                  Si el botón no funciona, copia este enlace en tu navegador:<br>
                  <span style="color:#0f6e56;word-break:break-all;">{{ .ConfirmationURL }}</span>
                </p>
                <div style="margin:18px 0 0 0;padding:12px 16px;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:6px;color:#92400e;font-size:12.5px;">
                  <strong>Si no has sido tú</strong>, ignora este email. Nadie
                  podrá cambiar tu contraseña sin abrir este enlace, así que tu
                  cuenta sigue segura.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;font-size:11.5px;color:#64748b;background:#f8fafb;border-top:1px solid #e2e8f0;">
                PermutaES · Plataforma para detectar cadenas de permuta entre
                funcionarios públicos en España.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 3) Change email address

> Email enviado a la NUEVA dirección cuando un usuario cambia su email.
> Supabase también envía uno a la dirección antigua avisando del cambio.

**Subject:**

```
Confirma tu nuevo email en PermutaES
```

**Body (HTML):**

```html
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f8fafb;font-family:'DM Sans',Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0d4a3a;padding:20px 28px;color:#ffffff;">
                <strong style="font-size:18px;letter-spacing:0.2px;">PermutaES</strong>
                <div style="color:#5dcaa5;font-size:12.5px;margin-top:2px;">Cambio de email</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.55;color:#1f2937;">
                <p style="margin:0 0 12px 0;font-size:16px;">
                  <strong style="color:#0d4a3a;">Confirma tu nuevo email</strong>
                </p>
                <p style="margin:0 0 18px 0;">
                  Has solicitado cambiar el email de tu cuenta de PermutaES a
                  <strong>{{ .Email }}</strong>. Pulsa el botón para
                  confirmar que esta dirección es tuya:
                </p>
                <p style="margin:0 0 22px 0;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px;">
                    Confirmar nuevo email →
                  </a>
                </p>
                <p style="margin:0 0 14px 0;color:#64748b;font-size:12.5px;">
                  Si el botón no funciona, copia este enlace en tu navegador:<br>
                  <span style="color:#0f6e56;word-break:break-all;">{{ .ConfirmationURL }}</span>
                </p>
                <p style="margin:0;color:#94a3b8;font-size:12px;">
                  Si no has sido tú quien ha pedido este cambio, ignora este
                  email y revisa la seguridad de tu cuenta cuanto antes.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;font-size:11.5px;color:#64748b;background:#f8fafb;border-top:1px solid #e2e8f0;">
                PermutaES · Plataforma para detectar cadenas de permuta entre
                funcionarios públicos en España.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 4) Magic link (no se usa, pero por si acaso)

PermutaES no usa magic links — el login es siempre con email + contraseña.
Si en algún momento se activa, esta plantilla funciona:

**Subject:**

```
Tu enlace de acceso a PermutaES
```

**Body (HTML):**

```html
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f8fafb;font-family:'DM Sans',Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:#0d4a3a;padding:20px 28px;color:#ffffff;">
                <strong style="font-size:18px;letter-spacing:0.2px;">PermutaES</strong>
                <div style="color:#5dcaa5;font-size:12.5px;margin-top:2px;">Enlace de acceso</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:14px;line-height:1.55;color:#1f2937;">
                <p style="margin:0 0 18px 0;">
                  Pulsa el botón para entrar en tu cuenta sin contraseña:
                </p>
                <p style="margin:0 0 22px 0;">
                  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0d4a3a;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px;font-size:14px;">
                    Entrar en PermutaES →
                  </a>
                </p>
                <p style="margin:0 0 14px 0;color:#64748b;font-size:12.5px;">
                  Si el botón no funciona, copia este enlace en tu navegador:<br>
                  <span style="color:#0f6e56;word-break:break-all;">{{ .ConfirmationURL }}</span>
                </p>
                <p style="margin:0;color:#94a3b8;font-size:12px;">
                  Si no has pedido este enlace, ignora este email.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;font-size:11.5px;color:#64748b;background:#f8fafb;border-top:1px solid #e2e8f0;">
                PermutaES · Plataforma para detectar cadenas de permuta entre
                funcionarios públicos en España.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## Configuración SMTP

Por defecto Supabase usa su propio remitente (`noreply@mail.app.supabase.io`).
Eso es aceptable para empezar pero tiene **límite de 4 emails por hora** y un
remitente que no inspira confianza.

Para producción real conviene configurar SMTP propio en
**Authentication → SMTP Settings**:

- **Sender email**: `noreply@permutaes.es` (o el dominio que se acabe usando).
- **Sender name**: `PermutaES`.
- **Host/Port/User/Pass**: las credenciales de Resend, SendGrid, Postmark, etc.

Si se usa **Resend** (que ya está integrado para los emails transaccionales):

| Campo | Valor |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| User | `resend` |
| Password | la `RESEND_API_KEY` |
| Sender email | `noreply@<dominio-verificado>` |
| Sender name | `PermutaES` |

> ⚠️ El dominio del remitente tiene que estar **verificado** en Resend antes
> de poder enviar desde él. Mientras no esté verificado, deja la SMTP por
> defecto de Supabase.

---

## Comprobación

Después de aplicar las plantillas:

1. Crea una cuenta de prueba con un email real al que tengas acceso.
2. Verifica que el email de confirmación llega y que el botón te lleva a
   `/mi-cuenta?bienvenido=1` con el banner de bienvenida.
3. Pide recuperar contraseña desde `/recuperar-contrasena` y comprueba que
   ese email también llega con el branding correcto.

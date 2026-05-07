-- =========================================================================
-- 0023_email_bienvenida.sql
--
-- Email de bienvenida propio cuando el usuario confirma su cuenta y
-- entra por primera vez.
--
-- Hasta ahora solo recibe el email tecnico de Supabase ("Confirma tu
-- email"). El de bienvenida lo enviamos nosotros desde el callback de
-- auth la primera vez que `exchangeCodeForSession` tiene exito.
--
-- Este flag permite no repetir el envio si el usuario hace login varias
-- veces (el callback se ejecuta en cada login con magic link, recuperar
-- contrasena, etc.).
-- =========================================================================

alter table public.perfiles_usuario
  add column if not exists bienvenida_enviada_el timestamptz;

comment on column public.perfiles_usuario.bienvenida_enviada_el is
  'Timestamp del envio del email de bienvenida propio (no el tecnico de Supabase). Null = aun no se le ha enviado.';

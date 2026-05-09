-- 0029_rls_cadenas_notificadas.sql
--
-- BUGFIX de seguridad: la tabla `cadenas_notificadas` no tenia RLS
-- habilitado. Cualquier cliente con la anon key podia consultarla via
-- PostgREST y descubrir que usuarios habian sido notificados de
-- cadenas. Aunque la tabla esta vacia ahora, se llenaria conforme la
-- app envie notificaciones a alfa-testers.
--
-- Fix:
-- 1. Habilitar RLS.
-- 2. Politica SELECT: el usuario solo ve sus propias notificaciones.
-- 3. INSERT/UPDATE/DELETE: solo via funciones SECURITY DEFINER (no
--    politicas explicitas, asi nadie puede tocar la tabla
--    directamente desde el cliente).

alter table public.cadenas_notificadas enable row level security;

create policy "cadenas_notif_select_own"
  on public.cadenas_notificadas for select to authenticated
  using (auth.uid() = usuario_id);

-- INSERT/UPDATE/DELETE quedan bloqueados para todos los usuarios
-- (anon y authenticated). Las funciones SECURITY DEFINER (notificar
-- cadenas, marcar enviada, etc.) bypass RLS y siguen funcionando.

comment on table public.cadenas_notificadas is
  'Tracking de notificaciones por email enviadas a usuarios cuando se detecta una cadena que les incluye. RLS: cada usuario solo ve sus filas; modificacion solo via SECURITY DEFINER.';

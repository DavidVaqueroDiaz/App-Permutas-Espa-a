-- =========================================================================
-- 0011_retencion_mensajes.sql
-- Política de retención de mensajería interna.
--
-- Decisión H del proyecto (actualizada el 2026-05-04): las
-- conversaciones se conservan 2 años desde el último mensaje. Pasado
-- ese plazo se borran automáticamente, junto con todos sus mensajes
-- y notificaciones (cascade desde la FK).
--
-- La retención se ejecuta como un job programado en pg_cron (extensión
-- de Postgres disponible en Supabase). El job corre diariamente a las
-- 03:00 UTC (≈ 04:00–05:00 hora peninsular dependiendo del DST), una
-- ventana baja de tráfico.
--
-- Si pg_cron no está habilitado en el proyecto, el `cron.schedule(...)`
-- final fallará. En ese caso, hay que activar la extensión desde el
-- dashboard de Supabase: Database → Extensions → pg_cron → Enable, y
-- luego volver a ejecutar este script.
-- =========================================================================

create or replace function public.borrar_conversaciones_caducadas()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  borradas integer;
begin
  -- 2 años desde el último mensaje. Borra en cascada los mensajes y
  -- las notificaciones asociadas (gracias al ON DELETE CASCADE de las
  -- FKs definidas en migración 0008).
  delete from public.conversaciones
   where ultimo_mensaje_el < now() - interval '2 years';
  get diagnostics borradas = row_count;

  -- Logueamos la ejecución en NOTICE para que aparezca en los logs de
  -- pg_cron y podamos auditar a posteriori.
  raise notice '[retencion] borradas % conversaciones caducadas (>2 años inactivas)', borradas;

  return borradas;
end;
$$;

-- No grants: solo el owner de la función (postgres / superuser) puede
-- ejecutarla. pg_cron corre como superuser por defecto, así que tiene
-- acceso. Nadie autenticado vía API puede llamarla (lo que es lo que
-- queremos: borrado masivo).


-- ----- Programación del job en pg_cron -----
-- Si pg_cron no está habilitado, esta línea fallará. Ver nota de
-- arriba para activarlo desde el dashboard.

create extension if not exists pg_cron;

-- Si ya existía un job con el mismo nombre, lo desprogramamos primero
-- para que la migración sea idempotente.
do $$
begin
  perform cron.unschedule('borrar-conversaciones-caducadas');
exception when others then
  -- El job no existía o pg_cron no está habilitado: ignoramos el error.
  null;
end;
$$;

select cron.schedule(
  'borrar-conversaciones-caducadas',
  '0 3 * * *', -- diariamente a las 03:00 UTC
  $$select public.borrar_conversaciones_caducadas()$$
);

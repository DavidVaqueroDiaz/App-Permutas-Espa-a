-- 0031_cron_limpiar_demos_sinteticos.sql
--
-- Anade un cron diario que borra los demos sinteticos creados al
-- vuelo por el sintetizador del modo demo (alias `demosyn_*`) que
-- tengan mas de 24 horas. Sin esto, cada busqueda en modo demo de
-- un perfil sin matches reales crea ~6 demos en BD que se acumulan
-- indefinidamente.
--
-- Existia ya el script scripts/limpiar-demos-sinteticos.ts que se
-- ejecutaba manualmente; este cron lo automatiza.

create or replace function public.limpiar_demos_sinteticos()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_borrados int;
begin
  -- Borrar anuncios de los usuarios sinteticos de mas de 24h.
  with usuarios_sinteticos_viejos as (
    select id from auth.users
     where email like 'demosyn_%@permutaes.invalid'
       and created_at < now() - interval '24 hours'
  )
  delete from auth.users
   where id in (select id from usuarios_sinteticos_viejos);

  get diagnostics v_borrados = row_count;
  return v_borrados;
end;
$$;

-- Programar el cron diario (3:30 AM UTC, despues de borrar
-- conversaciones caducadas que va a las 3:00).
do $$
begin
  perform cron.unschedule('limpiar-demos-sinteticos');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'limpiar-demos-sinteticos',
  '30 3 * * *',
  $$select public.limpiar_demos_sinteticos()$$
);

comment on function public.limpiar_demos_sinteticos is
  'Borra demos sinteticos (alias demosyn_*) con mas de 24h. Cron diario.';

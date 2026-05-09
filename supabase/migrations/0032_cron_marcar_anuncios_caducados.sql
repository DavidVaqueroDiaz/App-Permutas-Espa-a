-- 0032_cron_marcar_anuncios_caducados.sql
--
-- Anade un cron diario que marca como 'caducado' los anuncios cuya
-- fecha caduca_el ya paso pero que siguen con estado='activo'.
--
-- Sin esto, los anuncios caducados seguirian apareciendo en
-- /anuncios y /auto-permutas porque las queries filtran solo por
-- estado='activo'. El usuario duenno tendria que editar manualmente
-- el anuncio para renovarlo.

create or replace function public.marcar_anuncios_caducados()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actualizados int;
begin
  update public.anuncios
     set estado = 'caducado'
   where estado = 'activo'
     and caduca_el < now();

  get diagnostics v_actualizados = row_count;
  return v_actualizados;
end;
$$;

do $$
begin
  perform cron.unschedule('marcar-anuncios-caducados');
exception when others then
  null;
end;
$$;

-- Diario a las 2:00 AM UTC (antes que el cron de borrar conversaciones,
-- por si alguna conversacion estuviese ligada a un anuncio que acaba
-- de caducar — todo coherente).
select cron.schedule(
  'marcar-anuncios-caducados',
  '0 2 * * *',
  $$select public.marcar_anuncios_caducados()$$
);

comment on function public.marcar_anuncios_caducados is
  'Cambia estado=activo→caducado para anuncios con caduca_el < now(). Cron diario.';

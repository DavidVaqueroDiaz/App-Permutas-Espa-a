-- =========================================================================
-- 0040_panel_recordatorios_atrasados.sql
--
-- Aditiva. Rehace admin_metricas() (0039) anadiendo
-- `recordatorios_atrasados`: anuncios que llevan mas de un dia dentro de
-- los 30 dias previos a caducar y siguen sin recordatorio. Si sale mas
-- de 0, el cron diario de Vercel (/api/cron/recordatorios-caducidad) no
-- esta funcionando, algo que desde la base de datos no se ve de otro modo.
-- =========================================================================

create or replace function public.admin_metricas()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with reales as (
    select u.id, u.created_at, u.email_confirmed_at, u.last_sign_in_at
      from auth.users u
      join public.perfiles_usuario p on p.id = u.id
     where p.eliminado_el is null
       and u.email not like '%@permutaes.test'
       and u.email not like '%@permutaes.invalid'
  ),
  an as (
    select * from public.anuncios where not es_demo
  ),
  conv as (
    select c.id,
           (select count(distinct m.remitente_id)
              from public.mensajes m
             where m.conversacion_id = c.id and not m.es_sistema) as hablantes
      from public.conversaciones c
     where not c.es_demo
  )
  select jsonb_build_object(
    'usuarios', (
      select jsonb_build_object(
        'total',              count(*),
        'confirmados',        count(*) filter (where email_confirmed_at is not null),
        'nuevos_7d',          count(*) filter (where created_at > now() - interval '7 days'),
        'nuevos_30d',         count(*) filter (where created_at > now() - interval '30 days'),
        'entraron_30d',       count(*) filter (where last_sign_in_at > now() - interval '30 days'),
        'con_anuncio_activo', count(*) filter (where exists (
                                select 1 from an where an.usuario_id = reales.id and an.estado = 'activo'))
      )
      from reales
    ),
    'anuncios', (
      select jsonb_build_object(
        'activos',             count(*) filter (where estado = 'activo'),
        'caducados',           count(*) filter (where estado = 'caducado'),
        'permutados',          count(*) filter (where estado = 'permutado'),
        'eliminados',          count(*) filter (where estado = 'eliminado'),
        'nuevos_7d',           count(*) filter (where creado_el > now() - interval '7 days'),
        'nuevos_30d',          count(*) filter (where creado_el > now() - interval '30 days'),
        'caducan_30d',         count(*) filter (where estado = 'activo' and caduca_el <= now() + interval '30 days'),
        'vencidos_sin_marcar', count(*) filter (where estado = 'activo' and caduca_el < now()),
        'renovados',           count(*) filter (where caduca_el > creado_el + interval '6 months 1 day'),
        'ultima_permuta',      max(permutado_el)
      )
      from an
    ),
    'conversaciones', (
      select jsonb_build_object(
        'total',         count(*),
        'sin_mensajes',  count(*) filter (where hablantes = 0),
        'solo_uno',      count(*) filter (where hablantes = 1),
        'con_respuesta', count(*) filter (where hablantes >= 2)
      )
      from conv
    ),
    'mensajes', (
      select jsonb_build_object(
        'total',       count(*),
        'ultimos_7d',  count(*) filter (where m.creado_el > now() - interval '7 days'),
        'ultimos_30d', count(*) filter (where m.creado_el > now() - interval '30 days')
      )
      from public.mensajes m
      join public.conversaciones c on c.id = m.conversacion_id
     where not c.es_demo
       and not m.es_sistema
    ),
    'avisos_cadena', (
      select jsonb_build_object(
        'total',       count(*),
        'ultimos_30d', count(*) filter (where notificada_el > now() - interval '30 days'),
        'ultimo',      max(notificada_el)
      )
      from public.cadenas_notificadas
    ),
    'recordatorios_caducidad', (
      select jsonb_build_object('total', count(*), 'ultimo', max(enviado_el))
      from public.recordatorios_caducidad
    ),
    'recordatorios_atrasados', (
      select count(*)
        from public.anuncios a
        join auth.users u on u.id = a.usuario_id
       where a.estado = 'activo'
         and not a.es_demo
         and a.caduca_el > now()
         and a.caduca_el <= now() + interval '29 days'
         and u.email_confirmed_at is not null
         and u.email not like '%@permutaes.test'
         and u.email not like '%@permutaes.invalid'
         and not exists (
           select 1 from public.recordatorios_caducidad r where r.anuncio_id = a.id
         )
    ),
    'correos_30d', (
      select coalesce(jsonb_agg(x order by x.tipo), '[]'::jsonb)
      from (
        select tipo,
               count(*) filter (where ok)     as enviados,
               count(*) filter (where not ok) as fallidos,
               max(creado_el)                 as ultimo
          from public.envios_email
         where creado_el > now() - interval '30 days'
         group by tipo
      ) x
    ),
    'ultimo_fallo_correo', (
      select jsonb_build_object('tipo', tipo, 'error', error, 'fecha', creado_el)
        from public.envios_email
       where not ok
       order by creado_el desc
       limit 1
    ),
    'demos_sinteticos_activos', (
      select count(*) from public.anuncios where es_demo and estado = 'activo'
    ),
    'reportes_pendientes', (
      select count(*) from public.reportes_anuncios where estado = 'pendiente'
    ),
    'anuncios_plazas_incompletas', (
      select count(*) from public.admin_anuncios_plazas_incompletas()
    ),
    'tareas', (
      select coalesce(jsonb_agg(x order by x.nombre), '[]'::jsonb)
      from (
        select j.jobname as nombre,
               j.schedule as programacion,
               j.active as activa,
               (select max(d.start_time) from cron.job_run_details d
                 where d.jobid = j.jobid) as ultima,
               (select d.status from cron.job_run_details d
                 where d.jobid = j.jobid order by d.start_time desc limit 1) as ultimo_estado,
               (select count(*) from cron.job_run_details d
                 where d.jobid = j.jobid and d.status <> 'succeeded'
                   and d.start_time > now() - interval '7 days') as fallos_7d
          from cron.job j
      ) x
    )
  );
$$;

revoke all on function public.admin_metricas() from public, anon, authenticated;
grant execute on function public.admin_metricas() to service_role;

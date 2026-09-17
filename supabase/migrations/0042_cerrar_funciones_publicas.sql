-- =========================================================================
-- 0042_cerrar_funciones_publicas.sql
--
-- RESTRICTIVA: aplicar SOLO cuando el codigo que usa las funciones de la
-- 0039 con service_role ya este publicado.
--
-- Cierra funciones SECURITY DEFINER que cualquiera podia llamar por la API:
--
--   - tomar_email_para_notificar_cadena, emails_otros_participantes_post_cierre
--     y datos_email_destinatario_mensaje: devolvian el email de otros
--     usuarios (bastaba con estar registrado). Sustituidas por las
--     funciones solo-servidor de la 0039; se borran.
--   - chequear_rate_limit: cualquiera podia gastar el cupo de otra persona
--     (la clave lleva su id, que es publico) y dejarla un dia sin poder
--     publicar anuncios. Ahora la llama el servidor.
--   - marcar_notificacion_email_enviada: permitia marcar avisos ajenos
--     como enviados.
--   - Tareas de mantenimiento (las ejecuta pg_cron como propietario, que
--     conserva el permiso): no tienen por que estar abiertas.
--
-- Ademas, las cifras del panel (admin_metricas) dejan de contar las
-- conversaciones de los administradores (pruebas y soporte).
-- =========================================================================

drop function if exists public.tomar_email_para_notificar_cadena(uuid, text);
drop function if exists public.emails_otros_participantes_post_cierre(uuid, uuid[]);
drop function if exists public.datos_email_destinatario_mensaje(uuid);

revoke all on function public.marcar_notificacion_email_enviada(uuid) from public, anon, authenticated;
revoke all on function public.chequear_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.limpiar_rate_limit() from public, anon, authenticated;
revoke all on function public.borrar_conversaciones_caducadas() from public, anon, authenticated;
revoke all on function public.marcar_anuncios_caducados() from public, anon, authenticated;
revoke all on function public.limpiar_demos_sinteticos() from public, anon, authenticated;

grant execute on function public.marcar_notificacion_email_enviada(uuid) to service_role;
grant execute on function public.chequear_rate_limit(text, integer, integer) to service_role;
grant execute on function public.limpiar_rate_limit() to service_role;
grant execute on function public.borrar_conversaciones_caducadas() to service_role;
grant execute on function public.marcar_anuncios_caducados() to service_role;
grant execute on function public.limpiar_demos_sinteticos() to service_role;


-- -------------------------------------------------------------------------
-- admin_metricas sin las conversaciones de administradores
-- -------------------------------------------------------------------------
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
  admins as (
    select id from public.perfiles_usuario where es_admin
  ),
  conv_reales as (
    select c.id
      from public.conversaciones c
     where not c.es_demo
       and c.usuario_a_id not in (select id from admins)
       and c.usuario_b_id not in (select id from admins)
  ),
  conv as (
    select cr.id,
           (select count(distinct m.remitente_id)
              from public.mensajes m
             where m.conversacion_id = cr.id and not m.es_sistema) as hablantes
      from conv_reales cr
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
      join conv_reales cr on cr.id = m.conversacion_id
     where not m.es_sistema
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

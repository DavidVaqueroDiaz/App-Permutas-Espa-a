-- =========================================================================
-- 0039_avisos_servidor_renovar_y_panel.sql
--
-- Migracion ADITIVA (no rompe el codigo desplegado antes de ella):
--
--   1. Funciones de aviso por email que SOLO puede llamar el servidor
--      (service_role). Sustituyen a tomar_email_para_notificar_cadena,
--      emails_otros_participantes_post_cierre y
--      datos_email_destinatario_mensaje, que se retiran en la 0042 cuando
--      el codigo nuevo ya este publicado.
--   2. renovar_anuncio(): renueva 6 meses y reactiva un anuncio caducado.
--      Hasta ahora "guardar para renovar" no cambiaba la fecha.
--   3. reemplazar_plazas_deseadas(): cambia la lista de municipios de un
--      anuncio en UNA transaccion (antes: borrar + insertar sueltos, y la
--      pagina de edicion solo cargaba 1000 municipios, asi que guardar
--      recortaba las listas grandes).
--   4. envios_email: registro de cada correo enviado o fallido (sin
--      direcciones) para ver en el panel si los avisos salen.
--   5. Funciones del panel de administracion (solo service_role).
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1. Avisos por email (solo servidor)
-- -------------------------------------------------------------------------

-- Registra que a `p_destinatario` se le avisa de la cadena `p_huella` y
-- devuelve su email SOLO la primera vez. Si el correo luego falla, el
-- servidor llama a aviso_cadena_liberar para que un cambio posterior lo
-- reintente. Nunca devuelve direcciones de cuentas sinteticas.
create or replace function public.aviso_cadena_tomar_email(
  p_destinatario uuid,
  p_huella       text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
begin
  begin
    insert into public.cadenas_notificadas (usuario_id, cadena_huella)
    values (p_destinatario, p_huella);
  exception when unique_violation then
    return null;
  end;

  select u.email::text into v_email
    from auth.users u
   where u.id = p_destinatario
     and u.email_confirmed_at is not null
     and u.email not like '%@permutaes.test'
     and u.email not like '%@permutaes.invalid';

  return v_email;
end;
$$;

create or replace function public.aviso_cadena_liberar(
  p_destinatario uuid,
  p_huella       text
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.cadenas_notificadas
   where usuario_id = p_destinatario
     and cadena_huella = p_huella;
$$;

-- Emails de los otros participantes cuando un anuncio se cierra como
-- permutado. El servidor calcula los destinatarios con el motor de
-- cadenas; aqui solo se comprueba que el anuncio esta de verdad cerrado.
create or replace function public.emails_aviso_cierre(
  p_anuncio_cerrado uuid,
  p_destinatarios   uuid[]
)
returns table(usuario_id uuid, email text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_dueno  uuid;
  v_estado text;
begin
  select a.usuario_id, a.estado
    into v_dueno, v_estado
    from public.anuncios a
   where a.id = p_anuncio_cerrado;

  if v_dueno is null or v_estado <> 'permutado' then
    return;
  end if;

  return query
    select u.id, u.email::text
      from auth.users u
     where u.id = any(p_destinatarios)
       and u.id <> v_dueno
       and u.email_confirmed_at is not null
       and u.email not like '%@permutaes.test'
       and u.email not like '%@permutaes.invalid';
end;
$$;

-- Datos para el correo de "mensaje nuevo". El remitente lo pasa el
-- servidor (es el usuario autenticado de la server action).
create or replace function public.datos_aviso_mensaje(
  p_conv_id   uuid,
  p_remitente uuid
)
returns table(
  email              text,
  alias_destinatario text,
  alias_remitente    text,
  notificacion_id    uuid,
  es_demo            boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    u.email::text,
    pd.alias_publico::text,
    pr.alias_publico::text,
    (
      select n.id
        from public.notificaciones n
       where n.conversacion_id = c.id
         and n.tipo = 'mensaje_nuevo'
         and n.usuario_id = u.id
         and n.enviada_email_el is null
       order by n.creada_el desc
       limit 1
    ),
    c.es_demo
    from public.conversaciones c
    join auth.users u
      on u.id = case
                  when p_remitente = c.usuario_a_id then c.usuario_b_id
                  else c.usuario_a_id
                end
    join public.perfiles_publicos pd on pd.id = u.id
    left join public.perfiles_publicos pr on pr.id = p_remitente
   where c.id = p_conv_id
     and p_remitente in (c.usuario_a_id, c.usuario_b_id);
$$;

revoke all on function public.aviso_cadena_tomar_email(uuid, text) from public, anon, authenticated;
revoke all on function public.aviso_cadena_liberar(uuid, text) from public, anon, authenticated;
revoke all on function public.emails_aviso_cierre(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.datos_aviso_mensaje(uuid, uuid) from public, anon, authenticated;
grant execute on function public.aviso_cadena_tomar_email(uuid, text) to service_role;
grant execute on function public.aviso_cadena_liberar(uuid, text) to service_role;
grant execute on function public.emails_aviso_cierre(uuid, uuid[]) to service_role;
grant execute on function public.datos_aviso_mensaje(uuid, uuid) to service_role;

-- El codigo nuevo llama a estas dos con service_role. Las cerramos al
-- publico en la 0042 (el codigo viejo aun las usa con la sesion).
grant execute on function public.marcar_notificacion_email_enviada(uuid) to service_role;
grant execute on function public.chequear_rate_limit(text, integer, integer) to service_role;


-- -------------------------------------------------------------------------
-- 2. Renovar un anuncio (lo llama su dueno)
-- -------------------------------------------------------------------------
-- SECURITY INVOKER: se aplican las politicas RLS de anuncios, asi que
-- solo el dueno puede renovar. Reactiva los caducados; los permutados y
-- eliminados no se tocan.
create or replace function public.renovar_anuncio(p_anuncio_id uuid)
returns timestamptz
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_caduca timestamptz;
begin
  update public.anuncios
     set caduca_el = now() + interval '6 months',
         estado    = 'activo'
   where id = p_anuncio_id
     and usuario_id = auth.uid()
     and estado in ('activo', 'caducado')
  returning caduca_el into v_caduca;

  if v_caduca is null then
    raise exception 'Este anuncio no se puede renovar' using errcode = '22023';
  end if;
  return v_caduca;
end;
$$;

revoke all on function public.renovar_anuncio(uuid) from public, anon;
grant execute on function public.renovar_anuncio(uuid) to authenticated;

-- Al renovar, el trigger de la 0022 borra el "recordatorio ya enviado"
-- para que el siguiente ciclo vuelva a avisar. Corria con los permisos
-- del dueno, y recordatorios_caducidad no tiene politicas RLS, asi que
-- no borraba nada: tras renovar, el siguiente aviso nunca saldria.
alter function public.tg_limpiar_recordatorio_si_se_renueva() security definer;
alter function public.tg_limpiar_recordatorio_si_se_renueva() set search_path = public, pg_temp;


-- -------------------------------------------------------------------------
-- 3. Reemplazar la lista de municipios deseados en una sola transaccion
-- -------------------------------------------------------------------------
-- SECURITY INVOKER: las politicas RLS de anuncio_plazas_deseadas ya
-- exigen ser el dueno. El array viaja en el cuerpo de la peticion, asi
-- que no hay limite practico (Espana entera son 8.131 codigos). Si algun
-- codigo no existe, falla todo y no se pierde la lista anterior.
create or replace function public.reemplazar_plazas_deseadas(
  p_anuncio_id uuid,
  p_codigos    text[]
)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actual char(5);
  v_total  integer;
begin
  select a.municipio_actual_codigo into v_actual
    from public.anuncios a
   where a.id = p_anuncio_id
     and a.usuario_id = auth.uid();

  if v_actual is null then
    raise exception 'Anuncio no encontrado' using errcode = '42501';
  end if;

  delete from public.anuncio_plazas_deseadas where anuncio_id = p_anuncio_id;

  insert into public.anuncio_plazas_deseadas (anuncio_id, municipio_codigo)
  select distinct p_anuncio_id, c::char(5)
    from unnest(p_codigos) as c
   where c is not null
     and c::char(5) <> v_actual;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.reemplazar_plazas_deseadas(uuid, text[]) from public, anon;
grant execute on function public.reemplazar_plazas_deseadas(uuid, text[]) to authenticated;


-- -------------------------------------------------------------------------
-- 4. Registro de correos enviados (sin direcciones)
-- -------------------------------------------------------------------------
create table if not exists public.envios_email (
  id          bigint generated always as identity primary key,
  tipo        text        not null,
  ok          boolean     not null,
  error       text,
  -- huella de cadena, id de anuncio o de conversacion. Nunca un email.
  referencia  text,
  creado_el   timestamptz not null default now()
);

create index if not exists envios_email_creado_idx
  on public.envios_email(creado_el desc);

alter table public.envios_email enable row level security;
-- Sin politicas: solo service_role (que salta RLS) lee y escribe.
revoke all on table public.envios_email from anon, authenticated;

create or replace function public.limpiar_envios_email()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.envios_email where creado_el < now() - interval '180 days';
$$;

revoke all on function public.limpiar_envios_email() from public, anon, authenticated;
grant execute on function public.limpiar_envios_email() to service_role;

do $$
begin
  perform cron.unschedule('limpiar-envios-email');
exception when others then
  null;
end;
$$;

select cron.schedule(
  'limpiar-envios-email',
  '15 4 * * *',
  $$select public.limpiar_envios_email()$$
);


-- -------------------------------------------------------------------------
-- 5. Panel de administracion (solo service_role; la pagina /admin
--    comprueba antes que quien entra es administrador)
-- -------------------------------------------------------------------------

-- Anuncios activos reales que tienen menos municipios de los que marcan
-- sus atajos ("toda la CCAA", "toda la provincia", municipios sueltos).
create or replace function public.admin_anuncios_plazas_incompletas()
returns table(anuncio_id uuid, faltan integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with activos as (
    select a.id, a.municipio_actual_codigo
      from public.anuncios a
     where a.estado = 'activo'
       and not a.es_demo
  ),
  esperadas as (
    select act.id as anuncio_id, m.codigo_ine as codigo
      from activos act
      join public.anuncio_atajos t on t.anuncio_id = act.id and t.tipo = 'ccaa'
      join public.provincias pr on pr.ccaa_codigo = t.valor
      join public.municipios m on m.provincia_codigo = pr.codigo_ine
     where m.codigo_ine <> act.municipio_actual_codigo
    union
    select act.id, m.codigo_ine
      from activos act
      join public.anuncio_atajos t on t.anuncio_id = act.id and t.tipo = 'provincia'
      join public.municipios m on m.provincia_codigo = t.valor
     where m.codigo_ine <> act.municipio_actual_codigo
    union
    select act.id, t.valor::char(5)
      from activos act
      join public.anuncio_atajos t on t.anuncio_id = act.id and t.tipo = 'municipio_individual'
     where t.valor::char(5) <> act.municipio_actual_codigo
  )
  select e.anuncio_id, count(*)::int
    from esperadas e
   where not exists (
     select 1
       from public.anuncio_plazas_deseadas p
      where p.anuncio_id = e.anuncio_id
        and p.municipio_codigo = e.codigo
   )
   group by e.anuncio_id;
$$;

-- Cifras de salud de la plataforma en un solo JSON. Excluye cuentas
-- sinteticas y anuncios/conversaciones de demostracion.
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
        'total',      count(*),
        'ultimos_7d', count(*) filter (where m.creado_el > now() - interval '7 days'),
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

revoke all on function public.admin_anuncios_plazas_incompletas() from public, anon, authenticated;
revoke all on function public.admin_metricas() from public, anon, authenticated;
grant execute on function public.admin_anuncios_plazas_incompletas() to service_role;
grant execute on function public.admin_metricas() to service_role;

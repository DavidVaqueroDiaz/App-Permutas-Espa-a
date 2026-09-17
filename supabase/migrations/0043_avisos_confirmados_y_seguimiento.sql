-- =========================================================================
-- 0043_avisos_confirmados_y_seguimiento.sql
--
-- Migracion ADITIVA (el codigo publicado antes de ella sigue funcionando):
--
--   1. Avisos de cadena confirmados. Hasta ahora el aviso se apuntaba
--      ANTES de enviar el correo: si el envio se cortaba a medias (la
--      funcion de Vercel se para por tiempo, por ejemplo), la persona
--      quedaba como avisada sin haber recibido nada. Ahora se reserva,
--      se envia y solo entonces se confirma (enviado_el). Una reserva sin
--      confirmar con mas de 30 minutos se vuelve a intentar. sin_correo
--      marca las cuentas sin correo utilizable; si mas adelante lo
--      confirman, la revision diaria les avisa.
--   2. Seguimiento de permutas: registro de los correos «¿Conseguisteis
--      la permuta?» (a los 30 dias de que dos personas de una cadena se
--      hayan escrito) y de su unico recordatorio (a los 90).
--   3. admin_metricas: avisos a medias, seguimientos enviados y permutas
--      marcadas despues de un seguimiento.
--
-- aviso_cadena_tomar_email y aviso_cadena_liberar (0039) se mantienen
-- para el codigo anterior; con el nuevo dejan de usarse.
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1. Avisos de cadena confirmados
-- -------------------------------------------------------------------------

alter table public.cadenas_notificadas add column if not exists enviado_el timestamptz;
alter table public.cadenas_notificadas add column if not exists sin_correo boolean not null default false;

-- Los avisos apuntados hasta hoy se dieron por enviados al apuntarse.
update public.cadenas_notificadas
   set enviado_el = notificada_el
 where enviado_el is null;

update public.cadenas_notificadas cn
   set sin_correo = true
  from auth.users u
 where u.id = cn.usuario_id
   and not cn.sin_correo
   and (u.email_confirmed_at is null
        or u.email like '%@permutaes.test'
        or u.email like '%@permutaes.invalid');

-- El codigo anterior inserta sin esta columna: para el, apuntar equivale
-- a enviado (si el correo falla, borra la fila).
alter table public.cadenas_notificadas alter column enviado_el set default now();

-- Reserva el aviso de `p_huella` para `p_destinatario` y dice que hacer:
--   'enviar'     -> enviar el correo a `correo` y luego confirmar o soltar
--   'sin_correo' -> la cuenta no tiene correo utilizable (queda apuntado)
--   'nada'       -> ya estaba avisado, o otro proceso lo esta enviando
create or replace function public.aviso_cadena_reservar(
  p_destinatario uuid,
  p_huella       text
)
returns table(accion text, correo text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_correo text;
  v_id     uuid;
begin
  select u.email::text into v_correo
    from auth.users u
   where u.id = p_destinatario
     and u.email_confirmed_at is not null
     and u.email not like '%@permutaes.test'
     and u.email not like '%@permutaes.invalid';

  insert into public.cadenas_notificadas as cn
         (usuario_id, cadena_huella, notificada_el, enviado_el, sin_correo)
  values (p_destinatario, p_huella, now(), null, false)
  on conflict (usuario_id, cadena_huella) do update
     set notificada_el = now(),
         enviado_el    = null,
         sin_correo    = false
   where (cn.enviado_el is null and cn.notificada_el < now() - interval '30 minutes')
      or (cn.sin_correo and v_correo is not null)
  returning cn.id into v_id;

  if v_id is null then
    return query select 'nada'::text, null::text;
    return;
  end if;

  if v_correo is null then
    update public.cadenas_notificadas
       set enviado_el = now(), sin_correo = true
     where id = v_id;
    return query select 'sin_correo'::text, null::text;
    return;
  end if;

  return query select 'enviar'::text, v_correo;
end;
$$;

-- El correo salio: confirma las reservas de esas cadenas.
create or replace function public.aviso_cadena_confirmar(
  p_destinatario uuid,
  p_huellas      text[]
)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  with confirmados as (
    update public.cadenas_notificadas
       set enviado_el = now()
     where usuario_id = p_destinatario
       and cadena_huella = any(p_huellas)
       and enviado_el is null
    returning 1
  )
  select count(*)::int from confirmados;
$$;

-- El correo fallo: suelta las reservas para que se reintenten. Nunca toca
-- un aviso ya confirmado.
create or replace function public.aviso_cadena_soltar(
  p_destinatario uuid,
  p_huellas      text[]
)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  with soltados as (
    delete from public.cadenas_notificadas
     where usuario_id = p_destinatario
       and cadena_huella = any(p_huellas)
       and enviado_el is null
    returning 1
  )
  select count(*)::int from soltados;
$$;

revoke all on function public.aviso_cadena_reservar(uuid, text) from public, anon, authenticated;
revoke all on function public.aviso_cadena_confirmar(uuid, text[]) from public, anon, authenticated;
revoke all on function public.aviso_cadena_soltar(uuid, text[]) from public, anon, authenticated;
grant execute on function public.aviso_cadena_reservar(uuid, text) to service_role;
grant execute on function public.aviso_cadena_confirmar(uuid, text[]) to service_role;
grant execute on function public.aviso_cadena_soltar(uuid, text[]) to service_role;


-- -------------------------------------------------------------------------
-- 2. Seguimiento de permutas
-- -------------------------------------------------------------------------

create table if not exists public.seguimientos_permuta (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  cadena_huella text not null,
  -- 1: «¿Conseguisteis la permuta?» (30 dias); 2: recordatorio (90 dias)
  numero        smallint not null check (numero in (1, 2)),
  reservado_el  timestamptz not null default now(),
  enviado_el    timestamptz,
  sin_correo    boolean not null default false,
  unique (usuario_id, cadena_huella, numero)
);

create index if not exists seguimientos_permuta_huella_idx
  on public.seguimientos_permuta(cadena_huella);

comment on table public.seguimientos_permuta is
  'Correos de seguimiento enviados a personas de una cadena que se escribieron. Solo el servidor escribe; cada usuario puede leer sus filas (exportacion RGPD).';

alter table public.seguimientos_permuta enable row level security;
revoke all on table public.seguimientos_permuta from anon, authenticated;
grant select on table public.seguimientos_permuta to authenticated;
grant select, insert, update, delete on table public.seguimientos_permuta to service_role;

drop policy if exists "seguimientos_select_own" on public.seguimientos_permuta;
create policy "seguimientos_select_own"
  on public.seguimientos_permuta for select to authenticated
  using (auth.uid() = usuario_id);

-- Igual que aviso_cadena_reservar, para el seguimiento numero `p_numero`.
create or replace function public.seguimiento_reservar(
  p_destinatario uuid,
  p_huella       text,
  p_numero       integer
)
returns table(accion text, correo text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_correo text;
  v_id     uuid;
begin
  if p_numero not in (1, 2) then
    raise exception 'Seguimiento % no valido', p_numero using errcode = '22023';
  end if;

  select u.email::text into v_correo
    from auth.users u
   where u.id = p_destinatario
     and u.email_confirmed_at is not null
     and u.email not like '%@permutaes.test'
     and u.email not like '%@permutaes.invalid';

  insert into public.seguimientos_permuta as sp
         (usuario_id, cadena_huella, numero, reservado_el, enviado_el, sin_correo)
  values (p_destinatario, p_huella, p_numero::smallint, now(), null, false)
  on conflict (usuario_id, cadena_huella, numero) do update
     set reservado_el = now()
   where sp.enviado_el is null
     and sp.reservado_el < now() - interval '30 minutes'
  returning sp.id into v_id;

  if v_id is null then
    return query select 'nada'::text, null::text;
    return;
  end if;

  if v_correo is null then
    update public.seguimientos_permuta
       set enviado_el = now(), sin_correo = true
     where id = v_id;
    return query select 'sin_correo'::text, null::text;
    return;
  end if;

  return query select 'enviar'::text, v_correo;
end;
$$;

create or replace function public.seguimiento_confirmar(
  p_destinatario uuid,
  p_huellas      text[],
  p_numeros      integer[]
)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  with confirmados as (
    update public.seguimientos_permuta sp
       set enviado_el = now()
      from unnest(p_huellas, p_numeros) as x(huella, numero)
     where sp.usuario_id = p_destinatario
       and sp.cadena_huella = x.huella
       and sp.numero = x.numero
       and sp.enviado_el is null
    returning 1
  )
  select count(*)::int from confirmados;
$$;

create or replace function public.seguimiento_soltar(
  p_destinatario uuid,
  p_huellas      text[],
  p_numeros      integer[]
)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  with soltados as (
    delete from public.seguimientos_permuta sp
     using unnest(p_huellas, p_numeros) as x(huella, numero)
     where sp.usuario_id = p_destinatario
       and sp.cadena_huella = x.huella
       and sp.numero = x.numero
       and sp.enviado_el is null
    returning 1
  )
  select count(*)::int from soltados;
$$;

revoke all on function public.seguimiento_reservar(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.seguimiento_confirmar(uuid, text[], integer[]) from public, anon, authenticated;
revoke all on function public.seguimiento_soltar(uuid, text[], integer[]) from public, anon, authenticated;
grant execute on function public.seguimiento_reservar(uuid, text, integer) to service_role;
grant execute on function public.seguimiento_confirmar(uuid, text[], integer[]) to service_role;
grant execute on function public.seguimiento_soltar(uuid, text[], integer[]) to service_role;


-- -------------------------------------------------------------------------
-- 3. admin_metricas (misma estructura que la 0042, con mas datos)
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
    'permutas', (
      select jsonb_build_object(
        'total',            count(*),
        'ultimos_30d',      count(*) filter (where a.permutado_el > now() - interval '30 days'),
        'tras_seguimiento', count(*) filter (where s.id is not null)
      )
      from an a
      left join lateral (
        select sp.id
          from public.seguimientos_permuta sp
         where sp.usuario_id = a.usuario_id
           and sp.enviado_el is not null
           and not sp.sin_correo
           and sp.enviado_el <= a.permutado_el
           and position(a.id::text in sp.cadena_huella) > 0
         limit 1
      ) s on true
      where a.estado = 'permutado'
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
        'total',         count(*) filter (where enviado_el is not null and not sin_correo),
        'ultimos_30d',   count(*) filter (where enviado_el > now() - interval '30 days' and not sin_correo),
        'ultimo',        max(enviado_el) filter (where not sin_correo),
        'sin_confirmar', count(*) filter (where enviado_el is null and notificada_el < now() - interval '1 hour'),
        'sin_correo',    count(*) filter (where sin_correo)
      )
      from public.cadenas_notificadas
    ),
    'seguimientos', (
      select jsonb_build_object(
        'primeros',      count(*) filter (where numero = 1 and enviado_el is not null and not sin_correo),
        'recordatorios', count(*) filter (where numero = 2 and enviado_el is not null and not sin_correo),
        'ultimo',        max(enviado_el) filter (where not sin_correo),
        'sin_confirmar', count(*) filter (where enviado_el is null and reservado_el < now() - interval '1 hour')
      )
      from public.seguimientos_permuta
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

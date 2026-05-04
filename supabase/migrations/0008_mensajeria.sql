-- =========================================================================
-- 0008_mensajeria.sql
-- Mensajería interna 1-on-1 entre usuarios de PermutaES.
--
-- Modelo:
--   - `conversaciones`: una fila por par de usuarios. Para deduplicar el
--     orden, se almacena siempre con `usuario_a_id < usuario_b_id`.
--     Guarda los anuncios que les unieron originalmente y un timestamp
--     `ultimo_visto_*_el` por lado para calcular mensajes no leídos.
--   - `mensajes`: cada mensaje pertenece a una conversación, tiene un
--     remitente y un texto (máx. 2000 caracteres).
--
-- Permisos:
--   - El SELECT/UPDATE de conversaciones y el SELECT de mensajes están
--     gobernados por RLS (solo los dos participantes pueden ver).
--   - INSERT en conversaciones se hace SOLO via la función
--     `iniciar_conversacion(otro_usuario, mi_anuncio, su_anuncio)`, que
--     valida pre-requisitos antes de crear (mismos sector+cuerpo+
--     especialidad, ambos con anuncios activos).
--   - INSERT en mensajes se permite vía RLS si el usuario es remitente
--     y participa en la conversación.
--
-- Retención: 2 años desde el último mensaje (decisión H del proyecto,
-- actualizada el 2026-05-04). El cron de borrado se añadirá en una
-- migración posterior.
-- =========================================================================


-- ----- Tabla conversaciones -----

create table public.conversaciones (
  id            uuid primary key default gen_random_uuid(),

  -- Siempre usuario_a_id < usuario_b_id para deduplicar pares.
  usuario_a_id  uuid not null references auth.users(id) on delete cascade,
  usuario_b_id  uuid not null references auth.users(id) on delete cascade,

  -- Anuncios que estaban activos cuando se inició la conversación
  -- (informativo: para mostrar "esta permuta vino de estos anuncios").
  anuncio_a_id  uuid references public.anuncios(id) on delete set null,
  anuncio_b_id  uuid references public.anuncios(id) on delete set null,

  creado_el         timestamptz not null default now(),
  ultimo_mensaje_el timestamptz not null default now(),

  -- Última vez que cada parte abrió la conversación. Sirve para
  -- calcular "tienes X mensajes nuevos" sin necesidad de tocar las
  -- filas de la tabla `mensajes`.
  ultimo_visto_a_el timestamptz not null default now(),
  ultimo_visto_b_el timestamptz not null default now(),

  check (usuario_a_id < usuario_b_id),
  unique (usuario_a_id, usuario_b_id)
);

create index conversaciones_usuario_a_idx
  on public.conversaciones(usuario_a_id, ultimo_mensaje_el desc);
create index conversaciones_usuario_b_idx
  on public.conversaciones(usuario_b_id, ultimo_mensaje_el desc);


-- ----- Tabla mensajes -----

create table public.mensajes (
  id              uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  remitente_id    uuid not null references auth.users(id) on delete cascade,
  contenido       text not null check (length(contenido) between 1 and 2000),
  creado_el       timestamptz not null default now()
);

create index mensajes_conversacion_idx on public.mensajes(conversacion_id, creado_el desc);


-- Trigger: cada mensaje nuevo actualiza `ultimo_mensaje_el` de su
-- conversación, para mantener ordenadas las bandejas por actividad
-- reciente.
create or replace function public.tg_actualizar_ultimo_mensaje()
returns trigger
language plpgsql
as $$
begin
  update public.conversaciones
     set ultimo_mensaje_el = new.creado_el
   where id = new.conversacion_id;
  return new;
end;
$$;

create trigger mensajes_actualizar_ultimo_mensaje
after insert on public.mensajes
for each row execute function public.tg_actualizar_ultimo_mensaje();


-- =========================================================================
-- Notificaciones de mensaje nuevo
-- =========================================================================
--
-- La tabla `notificaciones` ya existía (creada en 0006). Le añadimos
-- una columna opcional `conversacion_id` para poder navegar desde la
-- notificación al chat correspondiente.

alter table public.notificaciones
  add column conversacion_id uuid references public.conversaciones(id) on delete cascade;

-- Trigger: al insertar un mensaje, se crea una notificación para el
-- destinatario (el que NO es el remitente).
create or replace function public.tg_notificar_mensaje_nuevo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  destinatario uuid;
begin
  select case
           when new.remitente_id = c.usuario_a_id then c.usuario_b_id
           else c.usuario_a_id
         end
    into destinatario
    from public.conversaciones c
   where c.id = new.conversacion_id;

  if destinatario is not null then
    insert into public.notificaciones (usuario_id, tipo, conversacion_id)
    values (destinatario, 'mensaje_nuevo', new.conversacion_id);
  end if;

  return new;
end;
$$;

create trigger mensajes_notificar_destinatario
after insert on public.mensajes
for each row execute function public.tg_notificar_mensaje_nuevo();


-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.conversaciones enable row level security;
alter table public.mensajes        enable row level security;

-- ----- conversaciones -----

create policy "conversaciones_select_si_participa"
  on public.conversaciones for select to authenticated
  using (auth.uid() in (usuario_a_id, usuario_b_id));

create policy "conversaciones_update_si_participa"
  on public.conversaciones for update to authenticated
  using (auth.uid() in (usuario_a_id, usuario_b_id))
  with check (auth.uid() in (usuario_a_id, usuario_b_id));

-- INSERT: NO se permite directamente; se hace solo a través de
-- la función `iniciar_conversacion`. Sin política de INSERT, RLS lo
-- bloquea para usuarios autenticados.

-- ----- mensajes -----

create policy "mensajes_select_si_en_conversacion"
  on public.mensajes for select to authenticated
  using (
    exists (
      select 1 from public.conversaciones c
       where c.id = mensajes.conversacion_id
         and auth.uid() in (c.usuario_a_id, c.usuario_b_id)
    )
  );

create policy "mensajes_insert_si_remitente_y_participa"
  on public.mensajes for insert to authenticated
  with check (
    auth.uid() = remitente_id
    and exists (
      select 1 from public.conversaciones c
       where c.id = mensajes.conversacion_id
         and auth.uid() in (c.usuario_a_id, c.usuario_b_id)
    )
  );


-- =========================================================================
-- Función para iniciar conversación (RPC)
-- =========================================================================

create or replace function public.iniciar_conversacion(
  otro_usuario  uuid,
  mi_anuncio_id uuid default null,
  su_anuncio_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  yo                  uuid := auth.uid();
  a                   uuid;
  b                   uuid;
  comparten_taxonomia boolean;
  conv_id             uuid;
begin
  if yo is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if yo = otro_usuario then
    raise exception 'No puedes iniciar una conversación contigo mismo' using errcode = '22023';
  end if;

  -- Pre-requisito mínimo: ambos tienen al menos un anuncio activo
  -- con la misma taxonomía profesional (sector + cuerpo +
  -- especialidad). Es condición necesaria para que pudieran aparecer
  -- en una cadena juntos. La verificación más estricta (compartir un
  -- ciclo concreto detectado) se delegará a futuras versiones cuando
  -- las cadenas se persistan en `cadenas_detectadas`.
  select exists (
    select 1
      from public.anuncios mi
      join public.anuncios su
        on su.usuario_id = otro_usuario
       and su.estado = 'activo'
       and su.sector_codigo = mi.sector_codigo
       and su.cuerpo_id = mi.cuerpo_id
       and (su.especialidad_id is not distinct from mi.especialidad_id)
     where mi.usuario_id = yo
       and mi.estado = 'activo'
  ) into comparten_taxonomia;

  if not comparten_taxonomia then
    raise exception 'No tenéis anuncios activos con la misma taxonomía profesional' using errcode = '22023';
  end if;

  -- Orden lexicográfico para garantizar unicidad del par.
  if yo < otro_usuario then
    a := yo; b := otro_usuario;
  else
    a := otro_usuario; b := yo;
  end if;

  insert into public.conversaciones (
    usuario_a_id, usuario_b_id, anuncio_a_id, anuncio_b_id
  )
  values (
    a,
    b,
    case when a = yo then mi_anuncio_id else su_anuncio_id end,
    case when b = yo then mi_anuncio_id else su_anuncio_id end
  )
  on conflict (usuario_a_id, usuario_b_id) do update
    set ultimo_mensaje_el = conversaciones.ultimo_mensaje_el
  returning id into conv_id;

  return conv_id;
end;
$$;

grant execute on function public.iniciar_conversacion(uuid, uuid, uuid) to authenticated;


-- =========================================================================
-- Función para marcar una conversación como vista
-- =========================================================================
--
-- Actualiza el `ultimo_visto_*_el` correspondiente al usuario actual.
-- Devuelve el número de mensajes que había sin leer hasta el momento
-- de marcarlos.

create or replace function public.marcar_conversacion_vista(conv_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  yo            uuid := auth.uid();
  no_leidos     integer := 0;
  visto_actual  timestamptz;
  es_a          boolean;
begin
  if yo is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  select
    yo = usuario_a_id,
    case when yo = usuario_a_id then ultimo_visto_a_el else ultimo_visto_b_el end
    into es_a, visto_actual
    from public.conversaciones
   where id = conv_id
     and yo in (usuario_a_id, usuario_b_id);

  if visto_actual is null then
    raise exception 'Conversación no encontrada o sin acceso' using errcode = '22023';
  end if;

  select count(*)
    into no_leidos
    from public.mensajes
   where conversacion_id = conv_id
     and remitente_id <> yo
     and creado_el > visto_actual;

  if es_a then
    update public.conversaciones
       set ultimo_visto_a_el = now()
     where id = conv_id;
  else
    update public.conversaciones
       set ultimo_visto_b_el = now()
     where id = conv_id;
  end if;

  return no_leidos;
end;
$$;

grant execute on function public.marcar_conversacion_vista(uuid) to authenticated;

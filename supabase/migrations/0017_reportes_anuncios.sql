-- =========================================================================
-- 0017_reportes_anuncios.sql
--
-- Sistema basico de moderacion: cualquier usuario autenticado puede
-- reportar un anuncio (spam, datos falsos, suplantacion, etc.) y los
-- administradores los revisan en /admin. Una vez resuelto, queda
-- registro de quien lo cerro y como.
--
-- Decisiones:
--   - Un mismo usuario solo puede tener UN reporte activo (pendiente)
--     por anuncio, para evitar abuso. Si quiere insistir, edita el
--     comentario del reporte existente, no crea uno nuevo.
--   - Los admins ven todos los reportes (pendientes y resueltos) via
--     RPC `listar_reportes_pendientes()`. Los usuarios normales no
--     pueden leer reportes ajenos.
--   - Resolver = "ignorar" (deja el anuncio activo) o "eliminar"
--     (cambia el anuncio a estado='eliminado'). Las dos opciones
--     marcan el reporte como resuelto.
-- =========================================================================

create table public.reportes_anuncios (
  id              uuid primary key default gen_random_uuid(),
  anuncio_id      uuid not null references public.anuncios(id) on delete cascade,
  reportado_por   uuid not null references auth.users(id) on delete cascade,
  motivo          text not null check (motivo in (
                    'spam',
                    'datos_falsos',
                    'suplantacion',
                    'lenguaje_inapropiado',
                    'duplicado',
                    'otro'
                  )),
  comentario      text check (comentario is null or length(comentario) <= 500),
  estado          text not null default 'pendiente'
                  check (estado in ('pendiente', 'resuelto_eliminado', 'resuelto_ignorado')),
  creado_el       timestamptz not null default now(),
  resuelto_por    uuid references auth.users(id) on delete set null,
  resuelto_el     timestamptz
);

-- Un usuario, un anuncio: solo un reporte PENDIENTE a la vez.
create unique index reportes_anuncios_unico_pendiente_idx
  on public.reportes_anuncios(anuncio_id, reportado_por)
  where estado = 'pendiente';

create index reportes_anuncios_anuncio_idx     on public.reportes_anuncios(anuncio_id);
create index reportes_anuncios_estado_idx      on public.reportes_anuncios(estado);
create index reportes_anuncios_creado_el_idx   on public.reportes_anuncios(creado_el desc);


-- =========================================================================
-- RLS
-- =========================================================================

alter table public.reportes_anuncios enable row level security;

-- Insert: cualquier authenticated puede reportar, pero solo a nombre
-- propio (el campo reportado_por debe coincidir con auth.uid()).
create policy "reportes_insert_own"
  on public.reportes_anuncios for insert to authenticated
  with check (reportado_por = auth.uid());

-- Select: el reportador ve sus propios reportes (util para el futuro
-- "mis reportes"). Los admins ven todos. Los demas no ven nada.
create policy "reportes_select_own_or_admin"
  on public.reportes_anuncios for select to authenticated
  using (
    reportado_por = auth.uid()
    or coalesce(
      (select es_admin from public.perfiles_usuario where id = auth.uid()),
      false
    )
  );

-- Update: solo admins (resolver). Los reportadores no pueden editar.
create policy "reportes_update_admin"
  on public.reportes_anuncios for update to authenticated
  using (
    coalesce(
      (select es_admin from public.perfiles_usuario where id = auth.uid()),
      false
    )
  )
  with check (
    coalesce(
      (select es_admin from public.perfiles_usuario where id = auth.uid()),
      false
    )
  );


-- =========================================================================
-- RPCs admin
-- =========================================================================

-- Lista los reportes pendientes con datos del anuncio y del reportador
-- enriquecidos para la UI. Solo admins.
create or replace function public.listar_reportes_pendientes()
returns table(
  reporte_id          uuid,
  motivo              text,
  comentario          text,
  creado_el           timestamptz,
  reportador_alias    text,
  anuncio_id          uuid,
  anuncio_estado      text,
  anuncio_observaciones text,
  anuncio_alias       text,
  anuncio_municipio   text,
  anuncio_cuerpo      text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.id                               as reporte_id,
    r.motivo                           as motivo,
    r.comentario                       as comentario,
    r.creado_el                        as creado_el,
    pr.alias_publico                   as reportador_alias,
    a.id                               as anuncio_id,
    a.estado                           as anuncio_estado,
    a.observaciones                    as anuncio_observaciones,
    pa.alias_publico                   as anuncio_alias,
    m.nombre                           as anuncio_municipio,
    coalesce(c.codigo_oficial || ' — ' || c.denominacion, c.denominacion)
                                       as anuncio_cuerpo
    from public.reportes_anuncios r
    join public.anuncios a            on a.id  = r.anuncio_id
    join public.perfiles_usuario pr   on pr.id = r.reportado_por
    join public.perfiles_usuario pa   on pa.id = a.usuario_id
    left join public.municipios m     on m.codigo_ine = a.municipio_actual_codigo
    left join public.cuerpos c        on c.id = a.cuerpo_id
   where r.estado = 'pendiente'
     and coalesce(
           (select es_admin from public.perfiles_usuario where id = auth.uid()),
           false
         )
   order by r.creado_el desc;
$$;

grant execute on function public.listar_reportes_pendientes() to authenticated;


-- Resuelve un reporte. accion = 'eliminar' marca el anuncio como
-- eliminado y cierra el reporte (resuelto_eliminado). accion = 'ignorar'
-- solo cierra el reporte (resuelto_ignorado). Ambas registran al admin
-- y la fecha. Si hay otros reportes pendientes para el mismo anuncio,
-- al eliminar tambien se cierran todos como 'resuelto_eliminado'.
create or replace function public.resolver_reporte(
  reporte_id uuid,
  accion     text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_anuncio_id uuid;
  v_es_admin   boolean;
begin
  if not public.es_admin_actual() then
    raise exception 'Solo administradores' using errcode = '42501';
  end if;
  if accion not in ('eliminar', 'ignorar') then
    raise exception 'Accion invalida: %', accion using errcode = '22023';
  end if;

  select anuncio_id into v_anuncio_id
    from public.reportes_anuncios
   where id = reporte_id and estado = 'pendiente'
   for update;
  if v_anuncio_id is null then
    return false;
  end if;

  if accion = 'eliminar' then
    update public.anuncios set estado = 'eliminado' where id = v_anuncio_id;
    -- Cerramos TODOS los reportes pendientes de ese anuncio.
    update public.reportes_anuncios
       set estado       = 'resuelto_eliminado',
           resuelto_por = auth.uid(),
           resuelto_el  = now()
     where anuncio_id = v_anuncio_id
       and estado = 'pendiente';
  else
    update public.reportes_anuncios
       set estado       = 'resuelto_ignorado',
           resuelto_por = auth.uid(),
           resuelto_el  = now()
     where id = reporte_id;
  end if;

  return true;
end;
$$;

grant execute on function public.resolver_reporte(uuid, text) to authenticated;

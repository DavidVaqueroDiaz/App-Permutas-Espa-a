-- 0034_iniciar_conversacion_admin.sql
--
-- RPC SECURITY DEFINER que permite a un admin iniciar conversacion
-- con cualquier anuncio sin necesidad de tener un anuncio propio
-- con la misma taxonomia profesional. La RPC normal
-- `iniciar_conversacion` exige que ambos lados tengan un anuncio
-- activo con el mismo sector/cuerpo/especialidad. Para soporte y
-- moderacion, el admin debe poder contactar a cualquier usuario.
--
-- Validacion interna: si el caller no es admin, la RPC lanza error
-- 42501. Asi no se puede abusar desde el cliente.

create or replace function public.iniciar_conversacion_admin(
  otro_usuario  uuid,
  su_anuncio_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  yo       uuid := auth.uid();
  a        uuid;
  b        uuid;
  conv_id  uuid;
begin
  if yo is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if not public.es_admin_actual() then
    raise exception 'Solo administradores' using errcode = '42501';
  end if;

  if yo = otro_usuario then
    raise exception 'No puedes iniciar una conversación contigo mismo'
      using errcode = '22023';
  end if;

  -- Validacion ligera: el anuncio debe existir y pertenecer al
  -- otro usuario.
  if not exists (
    select 1
      from public.anuncios
     where id = su_anuncio_id
       and usuario_id = otro_usuario
  ) then
    raise exception 'El anuncio no pertenece a ese usuario'
      using errcode = '22023';
  end if;

  -- Orden lexicografico para garantizar unicidad del par.
  if yo < otro_usuario then
    a := yo; b := otro_usuario;
  else
    a := otro_usuario; b := yo;
  end if;

  -- Insertamos la conversacion. Si ya existia (constraint unique
  -- sobre usuario_a_id, usuario_b_id), recuperamos su id.
  insert into public.conversaciones (
    usuario_a_id, usuario_b_id, anuncio_a_id, anuncio_b_id
  )
  values (
    a, b,
    case when a = yo then null else su_anuncio_id end,
    case when a = yo then su_anuncio_id else null end
  )
  on conflict (usuario_a_id, usuario_b_id) do nothing
  returning id into conv_id;

  if conv_id is null then
    select id into conv_id
      from public.conversaciones
     where usuario_a_id = a and usuario_b_id = b;
  end if;

  return conv_id;
end;
$$;

comment on function public.iniciar_conversacion_admin is
  'Permite al admin abrir una conversacion contra cualquier anuncio sin la restriccion de taxonomia compartida. Validacion interna requiere es_admin_actual()=true.';

-- 0033_rpc_admin_listar_usuarios.sql
--
-- RPC SECURITY DEFINER para que el panel /admin pueda listar todos
-- los usuarios recientes con sus campos completos (creado_el,
-- es_admin) que la vista publica `perfiles_publicos` no expone.
--
-- Por que: la tabla `perfiles_usuario` tiene policy RLS
-- "perfiles_usuario_select_own" que filtra a auth.uid()=id, asi que
-- el admin solo ve su propio perfil al consultarla directamente.
-- La vista `perfiles_publicos` existe sin RLS pero solo expone
-- (id, alias_publico, ano_nacimiento). Para el panel necesitamos
-- ademas creado_el y es_admin.
--
-- Esta RPC valida admin internamente; un usuario no-admin que la
-- llame recibe excepcion (no datos vacios).

create or replace function public.listar_usuarios_recientes_admin()
returns table (
  id              uuid,
  alias_publico   text,
  ano_nacimiento  int,
  creado_el       timestamptz,
  es_admin        boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.es_admin_actual() then
    raise exception 'Solo administradores' using errcode = '42501';
  end if;
  return query
    select pu.id,
           pu.alias_publico,
           pu.ano_nacimiento,
           pu.creado_el,
           coalesce(pu.es_admin, false)
      from public.perfiles_usuario pu
     where pu.eliminado_el is null
     order by pu.creado_el desc
     limit 20;
end;
$$;

comment on function public.listar_usuarios_recientes_admin is
  'Lista los 20 usuarios mas recientes con su alias, ano nacimiento, fecha de registro y flag de admin. Validacion interna: requiere es_admin_actual()=true. Usada por /admin.';

-- =========================================================================
-- 0013_admins.sql
-- Flag de administrador en perfiles_usuario.
--
-- Para activar a un usuario como admin, después de aplicar esta
-- migración hay que ejecutar manualmente desde el SQL editor de
-- Supabase (sustituyendo el uuid por el del usuario):
--
--   update public.perfiles_usuario set es_admin = true
--    where id = '<uuid-del-usuario>';
--
-- O bien por alias_publico (más cómodo si lo recuerdas):
--
--   update public.perfiles_usuario set es_admin = true
--    where alias_publico = '<tu-alias>';
-- =========================================================================

alter table public.perfiles_usuario
  add column if not exists es_admin boolean not null default false;

-- Función auxiliar para chequear desde server actions y route handlers
-- si el usuario actual es administrador. Es SECURITY DEFINER para que
-- pueda leer perfiles_usuario incluso si la RLS no permitiera al
-- usuario hacer SELECT sobre el campo (aquí sí permite, pero por
-- consistencia con el patrón ya usado en otras RPCs).
create or replace function public.es_admin_actual()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select es_admin from public.perfiles_usuario where id = auth.uid()),
    false
  );
$$;

grant execute on function public.es_admin_actual() to authenticated;


-- Función para borrar un anuncio como admin. Igual que el delete del
-- propio dueño, pero verificando que el llamante es admin.
create or replace function public.borrar_anuncio_admin(anuncio_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  borrado integer := 0;
begin
  if not public.es_admin_actual() then
    raise exception 'Solo administradores pueden borrar anuncios ajenos' using errcode = '42501';
  end if;
  delete from public.anuncios where id = anuncio_id;
  get diagnostics borrado = row_count;
  return borrado > 0;
end;
$$;

grant execute on function public.borrar_anuncio_admin(uuid) to authenticated;

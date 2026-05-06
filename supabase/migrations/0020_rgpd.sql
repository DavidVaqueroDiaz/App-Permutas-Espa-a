-- =========================================================================
-- 0020_rgpd.sql
--
-- Cumplimiento RGPD: derecho al olvido (art. 17).
--
-- El derecho de acceso (art. 15) y portabilidad (art. 20) los implementamos
-- en TS via server action que lee directamente las tablas con RLS y
-- devuelve un JSON descargable. Aqui solo nos hace falta la pieza SQL
-- de eliminacion.
--
-- Por que via RPC y no via supabase.auth.admin.deleteUser():
--   - El admin API requiere SUPABASE_SERVICE_ROLE_KEY, una credencial
--     extra que habria que distribuir entre Vercel + .env.local. Si se
--     filtra, el atacante puede hacer cualquier cosa contra Supabase.
--   - Una RPC SECURITY DEFINER que SOLO borra al `auth.uid()` actual
--     es estrictamente menos peligrosa: aunque alguien la llame
--     manipulando la sesion, solo puede borrarse a si mismo.
--
-- Las FK con ON DELETE CASCADE en todas las tablas que dependen de
-- auth.users(id) (anuncios, conversaciones, mensajes, notificaciones,
-- reportes, cadenas_notificadas, perfil) hacen el resto del trabajo
-- automaticamente: se eliminan en cascada sin codigo extra.
-- =========================================================================

create or replace function public.eliminar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  -- ON DELETE CASCADE en las FKs hace el resto:
  --   - public.perfiles_usuario
  --   - public.anuncios -> anuncio_plazas_deseadas, anuncio_atajos,
  --     cadenas_detectadas (vista), reportes_anuncios (anuncio_id)
  --   - public.conversaciones -> public.mensajes
  --   - public.notificaciones
  --   - public.reportes_anuncios (reportado_por)
  --   - public.cadenas_notificadas
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.eliminar_mi_cuenta() from public;
grant  execute on function public.eliminar_mi_cuenta() to authenticated;

comment on function public.eliminar_mi_cuenta() is
  'Borra la cuenta del usuario llamante (auth.uid()). En cascada se eliminan todos sus datos asociados.';

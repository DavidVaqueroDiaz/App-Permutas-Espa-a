-- =========================================================================
-- 0004_trigger_perfil_usuario.sql
-- Trigger automático: cuando se crea un usuario en auth.users (vía
-- supabase.auth.signUp), se inserta automáticamente la fila correspondiente
-- en public.perfiles_usuario, leyendo los datos extra desde el metadata
-- pasado en options.data del signUp.
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles_usuario (
    id,
    alias_publico,
    ano_nacimiento,
    politica_privacidad_aceptada_version
  )
  values (
    new.id,
    -- alias_publico: si no viene en metadata, generamos uno provisional
    -- a partir del UUID. El usuario lo cambiará desde "Mi cuenta".
    coalesce(
      new.raw_user_meta_data ->> 'alias_publico',
      'usuario_' || substr(new.id::text, 1, 8)
    ),
    -- ano_nacimiento: si no viene, fallback a 1990 (no debería pasar nunca
    -- en flujo normal porque el formulario de registro lo pide obligatorio).
    coalesce(
      (new.raw_user_meta_data ->> 'ano_nacimiento')::integer,
      1990
    ),
    -- versión de la política de privacidad aceptada al registrarse.
    coalesce(
      new.raw_user_meta_data ->> 'politica_privacidad_version',
      'v1'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

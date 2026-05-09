-- 0027_demo_sinteticos.sql
--
-- Soporte para "demos sinteticos" que se generan al vuelo cuando el
-- usuario busca en modo demo y no hay suficientes anuncios reales para
-- formar las 3 cadenas tipo (directa, a 3, a 4) con su perfil.
--
-- Estos demos se distinguen de los demos "base" (los 591 importados)
-- por su alias, que empieza por `demosyn_`. Asi un cron diario puede
-- limpiarlos sin tocar los demos base.
--
-- La funcion `crear_demo_sintetico` corre con SECURITY DEFINER porque
-- necesita escribir en `auth.users` (que normalmente requiere service
-- role). Devuelve el `anuncio_id` creado para que el llamante pueda
-- usarlo para abrir conversaciones, etc.

-- Borramos la version anterior para que el cambio de tipos
-- (char(5) -> text) no genere ambiguedad de overloading.
drop function if exists public.crear_demo_sintetico(text, uuid, uuid, text, text, character, character[], int, int);
drop function if exists public.crear_demo_sintetico(text, uuid, uuid, text, text, char, char[], int, int);

create or replace function public.crear_demo_sintetico(
  p_sector_codigo text,
  p_cuerpo_id uuid,
  p_especialidad_id uuid,
  p_servicio_salud_codigo text,
  p_ccaa_codigo text,
  p_municipio_actual_codigo text,
  p_municipios_deseados text[],
  p_anyos_servicio int,
  p_ano_toma_posesion int
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := gen_random_uuid();
  v_anuncio_id uuid;
  v_alias text;
  v_email text;
  v_ano_nacimiento int;
begin
  -- Alias unico tipo `demosyn_<12 chars hex>`. 12 chars hex = 16^12,
  -- colision practicamente imposible.
  v_alias := 'demosyn_' || substring(md5(random()::text || clock_timestamp()::text || v_user_id::text), 1, 12);
  v_email := v_alias || '@permutaes.invalid';
  v_ano_nacimiento := 1980 - (p_anyos_servicio - 5);
  if v_ano_nacimiento < 1955 then v_ano_nacimiento := 1955; end if;
  if v_ano_nacimiento > 1995 then v_ano_nacimiento := 1995; end if;

  -- 1) Crear usuario sintetico en auth.users
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_user_meta_data, raw_app_meta_data,
    created_at, updated_at, is_anonymous, is_sso_user
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated', 'authenticated', v_email,
    crypt('disabled', gen_salt('bf')), now(),
    jsonb_build_object(
      'alias_publico', v_alias,
      'ano_nacimiento', v_ano_nacimiento,
      'es_demo', true,
      'es_sintetico', true,
      'politica_privacidad_version', 'v1'
    ),
    jsonb_build_object('provider', 'demo-sintetico'),
    now(), now(), false, false
  );

  -- 2) Perfil
  insert into public.perfiles_usuario (
    id, alias_publico, ano_nacimiento, politica_privacidad_aceptada_version
  ) values (
    v_user_id, v_alias, v_ano_nacimiento, 'v1'
  )
  on conflict (id) do nothing;

  -- 3) Anuncio
  insert into public.anuncios (
    usuario_id, sector_codigo, cuerpo_id, especialidad_id,
    servicio_salud_codigo,
    municipio_actual_codigo, ccaa_codigo,
    fecha_toma_posesion_definitiva, anyos_servicio_totales,
    estado, es_demo, observaciones
  )
  values (
    v_user_id, p_sector_codigo, p_cuerpo_id, p_especialidad_id,
    p_servicio_salud_codigo,
    p_municipio_actual_codigo, p_ccaa_codigo,
    make_date(p_ano_toma_posesion, 1, 1), p_anyos_servicio,
    'activo', true,
    'Anuncio de demostración generado para tu búsqueda. Este perfil es sintético: cuando contactes, el sistema responderá automáticamente para mostrarte cómo funciona el chat.'
  )
  returning id into v_anuncio_id;

  -- 4) Plazas deseadas
  if array_length(p_municipios_deseados, 1) > 0 then
    insert into public.anuncio_plazas_deseadas (anuncio_id, municipio_codigo)
    select v_anuncio_id, m
    from unnest(p_municipios_deseados) as m
    on conflict do nothing;
  end if;

  return v_anuncio_id;
end;
$$;

-- ----------------------------------------------------------------
-- iniciar_conversacion_con_demo: variante de iniciar_conversacion sin
-- el requisito de "ambos tienen anuncios con misma taxonomia". Solo
-- se acepta si el otro usuario tiene un anuncio demo activo. Asi
-- visitantes en modo demo (sin anuncio propio) pueden abrir el chat
-- contra un demo y ver como funciona la conversacion.
-- ----------------------------------------------------------------
create or replace function public.iniciar_conversacion_con_demo(
  otro_usuario  uuid,
  su_anuncio_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  yo                 uuid := auth.uid();
  a                  uuid;
  b                  uuid;
  es_anuncio_demo    boolean;
  conv_id            uuid;
begin
  if yo is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;
  if yo = otro_usuario then
    raise exception 'No puedes iniciar una conversación contigo mismo' using errcode = '22023';
  end if;

  -- El su_anuncio debe pertenecer a otro_usuario, estar activo y ser DEMO
  select exists (
    select 1
      from public.anuncios
     where id = su_anuncio_id
       and usuario_id = otro_usuario
       and estado = 'activo'
       and es_demo = true
  ) into es_anuncio_demo;

  if not es_anuncio_demo then
    raise exception 'Esta variante solo permite contactar con anuncios demo' using errcode = '22023';
  end if;

  -- Orden lexicografico para unicidad del par
  if yo < otro_usuario then
    a := yo; b := otro_usuario;
  else
    a := otro_usuario; b := yo;
  end if;

  insert into public.conversaciones (
    usuario_a_id, usuario_b_id, anuncio_a_id, anuncio_b_id, es_demo
  )
  values (
    a, b,
    case when a = yo then null else su_anuncio_id end,
    case when a = yo then su_anuncio_id else null end,
    true
  )
  on conflict (usuario_a_id, usuario_b_id) do update
    set es_demo = true
  returning id into conv_id;

  return conv_id;
end;
$$;

comment on function public.iniciar_conversacion_con_demo is
  'Abre o recupera una conversacion contra un anuncio demo, sin exigir taxonomia compartida. Marca la conversacion como demo.';

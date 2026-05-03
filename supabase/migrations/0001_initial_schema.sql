-- =========================================================================
-- 0001_initial_schema.sql
-- Esquema inicial de PermutaES (Bloque 1 de Fase 1).
--
-- Crea el núcleo mínimo necesario para arrancar el desarrollo:
--   - Geografía: ccaa, provincias, municipios.
--   - Taxonomía profesional: sectores, cuerpos, especialidades.
--   - Identidad: perfiles_usuario (extiende auth.users de Supabase).
--
-- Las tablas restantes del esquema (anuncios, plazas deseadas, atajos,
-- cadenas detectadas, mensajes, áreas de salud, etc.) se irán añadiendo
-- en migraciones posteriores conforme las pantallas de la app las
-- requieran.
-- =========================================================================


-- -----------------------------------------------------------------------
-- Geografía
-- -----------------------------------------------------------------------

create table public.ccaa (
  codigo_ine char(2) primary key,
  nombre     text   not null unique
);

create table public.provincias (
  codigo_ine    char(2) primary key,
  nombre        text    not null,
  ccaa_codigo   char(2) not null references public.ccaa(codigo_ine)
);

create index provincias_ccaa_codigo_idx on public.provincias(ccaa_codigo);

create table public.municipios (
  codigo_ine        char(5)        primary key,
  nombre            text           not null,
  provincia_codigo  char(2)        not null references public.provincias(codigo_ine),
  latitud           numeric(9, 6)  not null,
  longitud          numeric(9, 6)  not null,
  poblacion         integer
);

create index municipios_provincia_codigo_idx on public.municipios(provincia_codigo);
create index municipios_nombre_busqueda_idx
  on public.municipios using gin (to_tsvector('spanish', nombre));


-- -----------------------------------------------------------------------
-- Taxonomía profesional
-- -----------------------------------------------------------------------

create table public.sectores (
  codigo               text    primary key,
  nombre               text    not null,
  descripcion          text,
  permite_inter_ccaa   boolean not null default false,
  regla_matching       text    not null
);

create table public.cuerpos (
  id                uuid primary key default gen_random_uuid(),
  sector_codigo     text not null references public.sectores(codigo),
  codigo_oficial    text,
  denominacion      text not null,
  subgrupo          text,
  ambito            text,
  norma_reguladora  text,
  unique (sector_codigo, codigo_oficial, denominacion)
);

create index cuerpos_sector_codigo_idx on public.cuerpos(sector_codigo);

create table public.especialidades (
  id                  uuid primary key default gen_random_uuid(),
  cuerpo_id           uuid not null references public.cuerpos(id) on delete cascade,
  codigo_oficial      text,
  denominacion        text not null,
  familia_profesional text,
  unique (cuerpo_id, codigo_oficial, denominacion)
);

create index especialidades_cuerpo_id_idx on public.especialidades(cuerpo_id);


-- -----------------------------------------------------------------------
-- Identidad: perfil de usuario que extiende auth.users
-- -----------------------------------------------------------------------

create table public.perfiles_usuario (
  id                                       uuid        primary key
                                                       references auth.users(id) on delete cascade,
  alias_publico                            text        not null unique
                                                       check (length(alias_publico) between 3 and 20),
  nombre_real                              text,
  telefono                                 text,
  ano_nacimiento                           integer     not null
                                                       check (ano_nacimiento between 1940 and 2008),
  consentimiento_rgpd_el                   timestamptz not null default now(),
  politica_privacidad_aceptada_version     text        not null,
  politica_privacidad_aceptada_el          timestamptz not null default now(),
  creado_el                                timestamptz not null default now(),
  actualizado_el                           timestamptz not null default now(),
  eliminado_el                             timestamptz
);

create index perfiles_usuario_alias_publico_idx
  on public.perfiles_usuario(alias_publico);

-- Trigger para refrescar `actualizado_el` en cada update.
create or replace function public.tg_set_actualizado_el()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_el = now();
  return new;
end;
$$;

create trigger perfiles_usuario_actualizado_el
before update on public.perfiles_usuario
for each row execute function public.tg_set_actualizado_el();


-- =========================================================================
-- Row Level Security (RLS)
-- =========================================================================

-- Geografía y taxonomía: lectura pública (anon + authenticated).
-- La modificación queda restringida al service_role (administrador interno).

alter table public.ccaa            enable row level security;
alter table public.provincias      enable row level security;
alter table public.municipios      enable row level security;
alter table public.sectores        enable row level security;
alter table public.cuerpos         enable row level security;
alter table public.especialidades  enable row level security;

create policy "ccaa_select_public"           on public.ccaa
  for select to anon, authenticated using (true);

create policy "provincias_select_public"     on public.provincias
  for select to anon, authenticated using (true);

create policy "municipios_select_public"     on public.municipios
  for select to anon, authenticated using (true);

create policy "sectores_select_public"       on public.sectores
  for select to anon, authenticated using (true);

create policy "cuerpos_select_public"        on public.cuerpos
  for select to anon, authenticated using (true);

create policy "especialidades_select_public" on public.especialidades
  for select to anon, authenticated using (true);


-- Perfiles de usuario: cada autenticado gestiona solo el suyo.
-- (El alias público se podrá consultar por todos cuando construyamos
--  los anuncios — añadiremos política específica entonces.)

alter table public.perfiles_usuario enable row level security;

create policy "perfiles_usuario_select_own"
  on public.perfiles_usuario for select to authenticated
  using (auth.uid() = id);

create policy "perfiles_usuario_insert_own"
  on public.perfiles_usuario for insert to authenticated
  with check (auth.uid() = id);

create policy "perfiles_usuario_update_own"
  on public.perfiles_usuario for update to authenticated
  using (auth.uid() = id);

create policy "perfiles_usuario_delete_own"
  on public.perfiles_usuario for delete to authenticated
  using (auth.uid() = id);


-- =========================================================================
-- Datos semilla: los 7 sectores cubiertos por la app
-- (lista cerrada según TAREA_2_RESUMEN_EJECUTIVO.md).
-- =========================================================================

insert into public.sectores (codigo, nombre, descripcion, permite_inter_ccaa, regla_matching) values
  ('docente_loe',
   'Profesorado no universitario (cuerpos LOE)',
   'Maestros, Secundaria, FP, EOI, Música y AAEE, Artes Plásticas y Diseño. Permuta regulada por RD 1364/2010 disp. adic. 6ª.',
   true,
   'docencia'),

  ('sanitario_sns',
   'Personal estatutario fijo del SNS',
   'Personal estatutario del Sistema Nacional de Salud. Permuta regulada por leyes autonómicas según el Estatuto Marco (Ley 55/2003).',
   false,
   'sanidad'),

  ('funcionario_age',
   'Funcionarios de la AGE',
   'Cuerpos generales y especiales de la Administración General del Estado. Permuta por art. 62 Decreto 315/1964.',
   true,
   'age'),

  ('funcionario_ccaa',
   'Funcionarios autonómicos',
   'Cuerpos propios de cada Comunidad Autónoma. Permuta intra-CCAA según ley autonómica.',
   false,
   'ccaa'),

  ('funcionario_local',
   'Funcionarios de Administración Local',
   'Cuerpos generales locales. Permuta por art. 98 Reglamento Funcionarios Locales 1952.',
   true,
   'local'),

  ('habilitado_nacional',
   'Habilitados nacionales',
   'Secretaría, Intervención-Tesorería, Secretaría-Intervención. Permuta por RD 128/2018.',
   true,
   'habilitado'),

  ('policia_local',
   'Policía Local',
   'Solo en CCAA con regulación expresa: Andalucía, Aragón, Illes Balears, Comunitat Valenciana, Galicia.',
   false,
   'policia_local');

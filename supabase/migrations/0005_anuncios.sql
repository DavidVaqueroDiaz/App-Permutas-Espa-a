-- =========================================================================
-- 0005_anuncios.sql
-- Tablas de anuncios, plazas deseadas y atajos.
--
-- En esta migración solo se incluyen FKs hacia tablas que YA existen
-- (sectores, cuerpos, especialidades, municipios, ccaa). Las FKs hacia
-- categorias_sns_unitarias y servicios_salud se añadirán en futuras
-- migraciones cuando esas tablas se creen — por ahora dejamos las
-- columnas pero sin REFERENCES.
-- =========================================================================

-- ----- Tabla anuncios -----

create table public.anuncios (
  id                                uuid primary key default gen_random_uuid(),
  usuario_id                        uuid not null references auth.users(id) on delete cascade,

  -- Taxonomía profesional
  sector_codigo                     text not null references public.sectores(codigo),
  cuerpo_id                         uuid not null references public.cuerpos(id),
  especialidad_id                   uuid references public.especialidades(id),

  -- Categorías SNS (para sanidad, FK pendiente hasta migración futura)
  categoria_sns_unitaria_id         uuid,
  servicio_salud_codigo             text,

  -- Localización actual
  municipio_actual_codigo           char(5)  not null references public.municipios(codigo_ine),
  ccaa_codigo                       char(2)  not null references public.ccaa(codigo_ine),

  -- Datos personales legales
  fecha_toma_posesion_definitiva    date     not null,
  anyos_servicio_totales            integer  not null check (anyos_servicio_totales between 0 and 50),
  permuta_anterior_fecha            date,

  -- Texto libre
  observaciones                     text     check (observaciones is null or length(observaciones) <= 500),

  -- Estado
  estado                            text     not null default 'activo'
                                             check (estado in ('activo', 'pausado', 'caducado', 'matched', 'permutado', 'eliminado')),

  -- Timestamps
  creado_el                         timestamptz not null default now(),
  actualizado_el                    timestamptz not null default now(),
  caduca_el                         timestamptz not null default (now() + interval '6 months')
);

create index anuncios_usuario_idx           on public.anuncios(usuario_id);
create index anuncios_sector_activo_idx     on public.anuncios(sector_codigo) where estado = 'activo';
create index anuncios_cuerpo_activo_idx     on public.anuncios(cuerpo_id)     where estado = 'activo';
create index anuncios_municipio_activo_idx  on public.anuncios(municipio_actual_codigo) where estado = 'activo';
create index anuncios_ccaa_activo_idx       on public.anuncios(ccaa_codigo)   where estado = 'activo';

-- Trigger de actualizado_el (función ya creada en migración 0001)
create trigger anuncios_actualizado_el
before update on public.anuncios
for each row execute function public.tg_set_actualizado_el();


-- ----- Plazas deseadas (lista plana de municipios) -----

create table public.anuncio_plazas_deseadas (
  anuncio_id        uuid    not null references public.anuncios(id) on delete cascade,
  municipio_codigo  char(5) not null references public.municipios(codigo_ine),
  primary key (anuncio_id, municipio_codigo)
);

create index anuncio_plazas_deseadas_municipio_idx on public.anuncio_plazas_deseadas(municipio_codigo);


-- ----- Atajos del usuario (cómo construyó la lista de plazas deseadas) -----

create table public.anuncio_atajos (
  id          uuid primary key default gen_random_uuid(),
  anuncio_id  uuid not null references public.anuncios(id) on delete cascade,
  tipo        text not null check (tipo in ('ccaa', 'provincia', 'comarca', 'radio', 'municipio_individual')),
  valor       text not null,
  -- Para tipo='ccaa', valor = código INE de la CCAA.
  -- Para tipo='provincia', valor = código INE de la provincia.
  -- Para tipo='comarca', valor = identificador de la comarca.
  -- Para tipo='radio', valor = "codigo_ine_municipio_centro;km" (ej. "36057;30").
  -- Para tipo='municipio_individual', valor = código INE del municipio.
  creado_el   timestamptz not null default now()
);

create index anuncio_atajos_anuncio_idx on public.anuncio_atajos(anuncio_id);


-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.anuncios                enable row level security;
alter table public.anuncio_plazas_deseadas enable row level security;
alter table public.anuncio_atajos          enable row level security;

-- ----- anuncios -----

-- El dueño tiene CRUD completo sobre sus anuncios.
create policy "anuncios_select_own"
  on public.anuncios for select to authenticated
  using (auth.uid() = usuario_id);

create policy "anuncios_insert_own"
  on public.anuncios for insert to authenticated
  with check (auth.uid() = usuario_id);

create policy "anuncios_update_own"
  on public.anuncios for update to authenticated
  using (auth.uid() = usuario_id);

create policy "anuncios_delete_own"
  on public.anuncios for delete to authenticated
  using (auth.uid() = usuario_id);

-- Anuncios activos visibles para todo el mundo (anónimo + autenticado).
-- Esto soporta el buscador público de la landing.
create policy "anuncios_select_publicos_activos"
  on public.anuncios for select to anon, authenticated
  using (estado = 'activo');

-- ----- anuncio_plazas_deseadas -----

-- Cualquiera puede leer las plazas deseadas asociadas a un anuncio activo
-- (el JOIN al anuncio + RLS de anuncios filtra ya por estado='activo').
create policy "anuncio_plazas_select_public"
  on public.anuncio_plazas_deseadas for select to anon, authenticated
  using (true);

-- Solo el dueño del anuncio asociado puede modificar.
create policy "anuncio_plazas_insert_own"
  on public.anuncio_plazas_deseadas for insert to authenticated
  with check (
    exists (select 1 from public.anuncios a where a.id = anuncio_id and a.usuario_id = auth.uid())
  );

create policy "anuncio_plazas_delete_own"
  on public.anuncio_plazas_deseadas for delete to authenticated
  using (
    exists (select 1 from public.anuncios a where a.id = anuncio_id and a.usuario_id = auth.uid())
  );

-- ----- anuncio_atajos -----

-- Los atajos solo se ven y se modifican por el dueño del anuncio.
create policy "anuncio_atajos_modify_own"
  on public.anuncio_atajos for all to authenticated
  using (
    exists (select 1 from public.anuncios a where a.id = anuncio_id and a.usuario_id = auth.uid())
  )
  with check (
    exists (select 1 from public.anuncios a where a.id = anuncio_id and a.usuario_id = auth.uid())
  );

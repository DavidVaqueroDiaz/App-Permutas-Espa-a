-- =========================================================================
-- 0006_cadenas_detectadas.sql
-- Tablas para persistir cadenas de permuta detectadas y notificaciones.
-- En esta migración solo se crea la estructura. La lógica de detección
-- se ejecuta de momento desde el código TypeScript en cada carga de la
-- página /auto-permutas. En migraciones posteriores se añadirá un trigger
-- que recalcule cadenas al insertar/actualizar anuncios.
-- =========================================================================

create table public.cadenas_detectadas (
  id           uuid primary key default gen_random_uuid(),
  longitud     integer not null check (longitud between 2 and 4),
  -- Cadena canónica: IDs de anuncio ordenados (rotación que empieza por
  -- el menor) separados por '-'. Se usa para deduplicar ciclos rotados.
  huella       text    not null unique,
  score        numeric(6, 3) not null default 0,
  estado       text    not null default 'activa'
                check (estado in ('activa', 'rota')),
  detectada_el timestamptz not null default now()
);

create index cadenas_estado_idx on public.cadenas_detectadas(estado);

create table public.cadena_participantes (
  cadena_id  uuid    not null references public.cadenas_detectadas(id) on delete cascade,
  anuncio_id uuid    not null references public.anuncios(id) on delete cascade,
  posicion   integer not null check (posicion between 1 and 4),
  primary key (cadena_id, anuncio_id),
  unique (cadena_id, posicion)
);

create index cadena_participantes_anuncio_idx on public.cadena_participantes(anuncio_id);

-- Notificaciones: una por usuario y cadena.
create table public.notificaciones (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  tipo        text not null check (tipo in ('cadena_nueva', 'mensaje_nuevo', 'anuncio_caduca')),
  cadena_id   uuid references public.cadenas_detectadas(id) on delete cascade,
  creada_el   timestamptz not null default now(),
  leida_el    timestamptz,
  enviada_email_el timestamptz
);

create index notificaciones_usuario_idx on public.notificaciones(usuario_id) where leida_el is null;


-- =========================================================================
-- RLS
-- =========================================================================

alter table public.cadenas_detectadas    enable row level security;
alter table public.cadena_participantes  enable row level security;
alter table public.notificaciones        enable row level security;

-- Cadenas: el usuario puede ver una cadena si alguno de los anuncios de
-- la cadena es suyo.
create policy "cadenas_select_si_participa"
  on public.cadenas_detectadas for select to authenticated
  using (
    exists (
      select 1
      from public.cadena_participantes cp
      join public.anuncios a on a.id = cp.anuncio_id
      where cp.cadena_id = cadenas_detectadas.id
        and a.usuario_id = auth.uid()
    )
  );

create policy "cadena_participantes_select_si_participa"
  on public.cadena_participantes for select to authenticated
  using (
    exists (
      select 1 from public.cadena_participantes cp2
      join public.anuncios a on a.id = cp2.anuncio_id
      where cp2.cadena_id = cadena_participantes.cadena_id
        and a.usuario_id = auth.uid()
    )
  );

create policy "notificaciones_select_own"
  on public.notificaciones for select to authenticated
  using (auth.uid() = usuario_id);

create policy "notificaciones_update_own"
  on public.notificaciones for update to authenticated
  using (auth.uid() = usuario_id);

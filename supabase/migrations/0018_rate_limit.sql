-- =========================================================================
-- 0018_rate_limit.sql
--
-- Rate limiting basado en Postgres (sin Redis ni dependencias externas).
--
-- Disenio: ventanas FIJAS, no deslizantes. La clave se compone fuera
-- (`registro:<ip>`, `mensaje:<user>`, `reporte:<user>`, etc.). La
-- ventana_inicio se trunca al minuto/hora segun convenga al caller.
--
-- La RPC `chequear_rate_limit` hace UPSERT atomico:
--   1. Inserta (clave, ventana_inicio) con contador=1, o
--   2. Si ya existe, incrementa contador en 1.
-- Devuelve {permitido, contador, max} -- el caller decide si bloquea.
--
-- Por que ventanas fijas y no deslizantes: para volumen alto necesitamos
-- la operacion en O(1). Las ventanas deslizantes piden contar eventos
-- en una ventana movil, lo que requiere una tabla de eventos enorme.
-- Con ventanas fijas el peor caso del usuario malicioso es 2x el
-- limite (justo al cambio de ventana), que es aceptable.
--
-- Limpieza: cron diario borra todo lo de hace mas de 1 dia.
-- =========================================================================

create table public.rate_limit (
  clave            text        not null,
  ventana_inicio   timestamptz not null,
  contador         integer     not null default 0,
  primary key (clave, ventana_inicio)
);

-- Indice para la limpieza por fecha.
create index rate_limit_ventana_idx on public.rate_limit(ventana_inicio);

-- RLS: nadie puede leerla ni escribir directamente. Solo via RPC.
alter table public.rate_limit enable row level security;
-- Ninguna policy = ningun acceso desde client.


-- =========================================================================
-- RPC: chequear y registrar
-- =========================================================================

create or replace function public.chequear_rate_limit(
  clave             text,
  ventana_segundos  integer,
  max_eventos       integer
)
returns table(permitido boolean, contador integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inicio  timestamptz;
  v_total   integer;
begin
  if ventana_segundos <= 0 then
    raise exception 'ventana_segundos debe ser > 0';
  end if;
  if max_eventos <= 0 then
    raise exception 'max_eventos debe ser > 0';
  end if;

  -- Trunca la ventana a un multiplo de `ventana_segundos` desde epoch.
  -- Asi todos los callers con la misma ventana caen en el mismo bucket.
  v_inicio := to_timestamp(
    floor(extract(epoch from now()) / ventana_segundos) * ventana_segundos
  );

  insert into public.rate_limit (clave, ventana_inicio, contador)
       values (clave, v_inicio, 1)
  on conflict (clave, ventana_inicio)
    do update set contador = public.rate_limit.contador + 1
    returning public.rate_limit.contador into v_total;

  return query select (v_total <= max_eventos), v_total;
end;
$$;

revoke all on function public.chequear_rate_limit(text, integer, integer) from public;
grant  execute on function public.chequear_rate_limit(text, integer, integer)
  to authenticated, anon;

comment on function public.chequear_rate_limit(text, integer, integer) is
  'Rate limit con ventana fija. Devuelve {permitido, contador} tras incrementar el evento.';


-- =========================================================================
-- Limpieza periodica: borra ventanas de hace > 1 dia
-- =========================================================================

create or replace function public.limpiar_rate_limit()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.rate_limit
   where ventana_inicio < now() - interval '1 day';
$$;

-- pg_cron: si la extension esta disponible (Supabase ya la tiene), schedule.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'limpiar-rate-limit-diario',
      '0 4 * * *',
      $j$select public.limpiar_rate_limit();$j$
    );
  end if;
exception when others then
  -- Si pg_cron no permite schedule (sin permisos en el rol), lo
  -- ignoramos. Lo importante es que la tabla y la RPC existan.
  null;
end $$;

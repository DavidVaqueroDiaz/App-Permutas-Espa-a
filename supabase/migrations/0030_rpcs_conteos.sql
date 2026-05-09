-- 0030_rpcs_conteos.sql
--
-- BUGFIX: las funciones obtenerConteosPorCcaa y
-- obtenerSectoresConAnuncios cargaban TODOS los anuncios y contaban
-- en JS. Con el limite por defecto de PostgREST de 1000 filas, los
-- conteos se truncan en cuanto la app pasa de 1000 anuncios — los
-- numeros del mapa de la home y del filtro por sector serian
-- incorrectos sin que el usuario lo notara.
--
-- Fix: dos RPCs que agregan en SQL. SQL aggregates no estan sujetos
-- al limite de filas (devuelven solo las filas ya agrupadas) y son
-- mucho mas rapidos.

create or replace function public.conteos_anuncios_por_ccaa(
  p_incluir_demos boolean default false,
  p_sector_codigo text default null
)
returns table(ccaa_codigo text, total int)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select a.ccaa_codigo::text, count(*)::int as total
    from public.anuncios a
   where a.estado = 'activo'
     and (p_incluir_demos or not a.es_demo)
     and (p_sector_codigo is null or a.sector_codigo = p_sector_codigo)
   group by a.ccaa_codigo;
$$;

create or replace function public.conteos_anuncios_por_sector(
  p_incluir_demos boolean default false
)
returns table(sector_codigo text, total int)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select a.sector_codigo::text, count(*)::int as total
    from public.anuncios a
   where a.estado = 'activo'
     and (p_incluir_demos or not a.es_demo)
   group by a.sector_codigo;
$$;

comment on function public.conteos_anuncios_por_ccaa is
  'Devuelve total de anuncios activos por CCAA. Agregacion SQL — no sujeta al limite de 1000 filas de PostgREST.';

comment on function public.conteos_anuncios_por_sector is
  'Devuelve total de anuncios activos por sector. Agregacion SQL — no sujeta al limite de 1000 filas de PostgREST.';

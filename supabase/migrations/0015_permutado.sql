-- =========================================================================
-- 0015_permutado.sql
--
-- Soporte para que un usuario marque su anuncio como "permuta conseguida".
--
-- El estado 'permutado' ya esta contemplado en el CHECK constraint de
-- anuncios desde la migracion 0005. Aqui:
--
--   1. Anadimos la columna `permutado_el` para saber CUANDO se cerro,
--      util para estadisticas y para la pagina de confirmacion.
--
--   2. Anadimos un indice parcial sobre `permutado_el` para acelerar
--      el conteo de "permutas conseguidas en X dias / total".
--
--   3. Anadimos una funcion publica `contar_permutas_conseguidas()`
--      que devuelve {total, ultimos_30_dias} sin exponer datos
--      personales. Sirve como prueba social en la home.
-- =========================================================================

alter table public.anuncios
  add column if not exists permutado_el timestamptz;

create index if not exists anuncios_permutado_el_idx
  on public.anuncios(permutado_el)
  where permutado_el is not null;


-- ----- Funcion publica de conteo -----

create or replace function public.contar_permutas_conseguidas()
returns table(total bigint, ultimos_30_dias bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(*) filter (where estado = 'permutado')                                       as total,
    count(*) filter (where estado = 'permutado' and permutado_el > now() - interval '30 days') as ultimos_30_dias
  from public.anuncios;
$$;

revoke all on function public.contar_permutas_conseguidas() from public;
grant  execute on function public.contar_permutas_conseguidas() to anon, authenticated;

comment on function public.contar_permutas_conseguidas() is
  'Devuelve {total, ultimos_30_dias} de anuncios en estado permutado. Publica.';

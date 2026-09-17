-- =========================================================================
-- 0041_arreglar_rate_limit.sql
--
-- chequear_rate_limit (0018) NUNCA ha funcionado: el parametro `clave`
-- se llama igual que la columna y PL/pgSQL corta con
--   column reference "clave" is ambiguous
-- en cada llamada. Como el codigo deja pasar la accion si el limitador
-- falla, ningun limite (intentos de login, registros, anuncios al dia,
-- mensajes por minuto...) se ha aplicado nunca. La tabla rate_limit esta
-- vacia en produccion.
--
-- Se mantiene la misma firma y los mismos nombres de parametros (los usa
-- el codigo), pero sin referencias ambiguas.
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

  v_inicio := to_timestamp(
    floor(extract(epoch from now()) / ventana_segundos) * ventana_segundos
  );

  insert into public.rate_limit as rl (clave, ventana_inicio, contador)
       values (chequear_rate_limit.clave, v_inicio, 1)
  on conflict on constraint rate_limit_pkey
    do update set contador = rl.contador + 1
  returning rl.contador into v_total;

  return query select (v_total <= max_eventos), v_total;
end;
$$;

-- =========================================================================
-- 0014_aviso_cadena_nueva.sql
-- Soporte para enviar email transaccional cuando se detecta una
-- cadena nueva que incluye al usuario.
--
-- Idea: cuando alguien publica/edita un anuncio, el server action
-- corre el matcher con ese anuncio como origen. Para cada cadena
-- detectada, llama por cada OTRO participante a la función
-- `tomar_email_para_notificar_cadena(destinatario, huella)`. La
-- función:
--   1. Intenta insertar (destinatario, huella) en cadenas_notificadas.
--   2. Si funciona (primera vez), devuelve el email del destinatario.
--   3. Si la inserción choca con la constraint unique, devuelve null
--      → no se notifica de nuevo.
--
-- Esa atomicidad garantiza que ningún usuario reciba dos emails de la
-- misma cadena, aunque haya carreras (dos anuncios publicados a la vez
-- que descubren la misma cadena).
-- =========================================================================


create table public.cadenas_notificadas (
  id              uuid primary key default gen_random_uuid(),
  usuario_id      uuid not null references auth.users(id) on delete cascade,
  -- Huella canónica de la cadena (rotación que empieza por el ID
  -- menor). Misma que usa el matcher para deduplicar ciclos rotados.
  cadena_huella   text not null,
  notificada_el   timestamptz not null default now(),
  unique (usuario_id, cadena_huella)
);

create index cadenas_notificadas_usuario_idx
  on public.cadenas_notificadas(usuario_id);


-- ----- Función atómica: registrar y devolver email -----
--
-- Devuelve el email del destinatario SOLO la primera vez que se
-- llama con esa (usuario, huella). En llamadas posteriores devuelve
-- null para evitar reenvíos.
--
-- Solo permitimos llamarla desde server actions del propio usuario
-- AUTOR del anuncio que ha disparado la detección. La función no
-- comprueba quién llama porque es SECURITY DEFINER y se invoca solo
-- desde código de servidor; los usuarios anónimos no tienen GRANT.

create or replace function public.tomar_email_para_notificar_cadena(
  destinatario  uuid,
  cadena_huella text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  email_destino text;
begin
  if auth.uid() is null then
    return null; -- llamadas anónimas, ignoradas
  end if;
  if destinatario = auth.uid() then
    return null; -- nunca enviamos email a uno mismo
  end if;

  begin
    insert into public.cadenas_notificadas (usuario_id, cadena_huella)
    values (destinatario, cadena_huella);
  exception when unique_violation then
    -- Ya notificado antes
    return null;
  end;

  -- Cuentas sintéticas de PermutaDoc: nunca queremos enviar a
  -- @permutaes.test (no entrega). Devolvemos null pero la fila ya
  -- está registrada (así el matcher no se queda intentándolo eternamente).
  select u.email into email_destino
    from auth.users u
   where u.id = destinatario
     and u.email not like '%@permutaes.test'
     and u.email_confirmed_at is not null;

  return email_destino; -- puede ser null si test/no confirmado
end;
$$;

grant execute on function public.tomar_email_para_notificar_cadena(uuid, text)
  to authenticated;

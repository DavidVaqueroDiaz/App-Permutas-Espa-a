-- 0028_demo_trigger_security_definer.sql
--
-- BUGFIX: el trigger `tg_demo_respuesta_sistema` (creado en 0026)
-- inserta un mensaje del sistema en nombre del usuario demo cuando un
-- visitante humano envia el primer mensaje en una conversacion demo.
-- El INSERT del trigger se ejecutaba con la auth del usuario humano
-- (auth.uid() = humano), pero ponia `remitente_id = usuario_demo`. La
-- politica RLS de mensajes exige `auth.uid() = remitente_id` para
-- INSERT, asi que el trigger fallaba con:
--
--   ERROR: new row violates row-level security policy for table "mensajes"
--
-- Fix: marcar la funcion como SECURITY DEFINER para que corra con
-- privilegios del owner y bypass RLS. El trigger sigue protegido
-- internamente: solo responde si la conversacion es es_demo=true y
-- es el primer mensaje humano (sin loops).

create or replace function public.tg_demo_respuesta_sistema()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_es_demo boolean;
  v_mensajes_sistema int;
  v_otro_usuario_id uuid;
begin
  if new.es_sistema then
    return new;
  end if;

  select c.es_demo into v_es_demo
    from public.conversaciones c
   where c.id = new.conversacion_id;

  if not coalesce(v_es_demo, false) then
    return new;
  end if;

  select count(*) into v_mensajes_sistema
    from public.mensajes
   where conversacion_id = new.conversacion_id
     and es_sistema = true;

  if v_mensajes_sistema > 0 then
    return new;
  end if;

  select case
    when c.usuario_a_id = new.remitente_id then c.usuario_b_id
    else c.usuario_a_id
  end
  into v_otro_usuario_id
  from public.conversaciones c
  where c.id = new.conversacion_id;

  insert into public.mensajes (
    conversacion_id, remitente_id, contenido, es_sistema
  ) values (
    new.conversacion_id,
    v_otro_usuario_id,
    'Hola. Esta es una conversación de demostración: la persona detrás de este anuncio no es real, así que no recibirás una respuesta humana.' || E'\n\n' ||
    'Si has llegado hasta aquí estabas viendo cómo funcionaría PermutaES con la plataforma llena. Cuando se registre alguien con un perfil compatible al tuyo, te avisaremos por email — esta misma notificación que acabas de recibir es la que te llegará cuando ocurra (pero con una respuesta humana).' || E'\n\n' ||
    'Para asegurarte de que las notificaciones reales no caen en spam, marca este correo como "no es spam" y/o añade noreply@permutaes.es a tus contactos.' || E'\n\n' ||
    '¿Listo para ser de los primeros en tu sector? Publica tu anuncio en https://permutaes.es/anuncios/nuevo y te avisaremos en cuanto aparezca una cadena compatible.',
    true
  );

  return new;
end;
$$;

-- El trigger ya existe (creado en 0026), no hay que recrearlo —
-- apunta a la nueva version SECURITY DEFINER de la funcion.

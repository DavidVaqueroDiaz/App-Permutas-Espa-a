-- 0026_modo_demo.sql
--
-- Soporte para "modo demo": flag en anuncios, conversaciones y
-- mensajes. Permite que la web se vea poblada con anuncios sinteticos
-- claramente marcados, mientras llegan los primeros usuarios reales.
--
-- Implicaciones:
-- - anuncios.es_demo: cuando true, el anuncio solo se muestra si el
--   visitante activa el modo demo (toggle global).
-- - conversaciones.es_demo: marca conversaciones iniciadas con un
--   anuncio demo. Sirve para suprimir emails reales y disparar la
--   respuesta automatica del sistema.
-- - mensajes.es_sistema: marca los mensajes generados por la app
--   (no por un usuario humano), para renderizarlos con estilo
--   diferenciado en el chat ("PermutaES asistente").

alter table public.anuncios
  add column if not exists es_demo boolean not null default false;

create index if not exists anuncios_es_demo_idx
  on public.anuncios(es_demo)
  where es_demo = true;

alter table public.conversaciones
  add column if not exists es_demo boolean not null default false;

alter table public.mensajes
  add column if not exists es_sistema boolean not null default false;

-- ---------------------------------------------------------------
-- Trigger: cuando un usuario humano envia el primer mensaje en una
-- conversacion demo, el sistema responde automaticamente con un
-- mensaje educativo. Esto permite al visitante ver el flujo del chat
-- y validar que las notificaciones por email le llegan correctamente.
-- ---------------------------------------------------------------
create or replace function public.tg_demo_respuesta_sistema()
returns trigger
language plpgsql
as $$
declare
  v_es_demo boolean;
  v_mensajes_sistema int;
  v_otro_usuario_id uuid;
begin
  -- Solo respondemos si el mensaje recien insertado es de un humano
  -- (no del propio sistema, evita bucles infinitos).
  if new.es_sistema then
    return new;
  end if;

  -- Solo si la conversacion esta marcada como demo.
  select c.es_demo into v_es_demo
    from public.conversaciones c
   where c.id = new.conversacion_id;

  if not coalesce(v_es_demo, false) then
    return new;
  end if;

  -- Solo respondemos al PRIMER mensaje del humano. Si ya hay un
  -- mensaje de sistema en la conversacion, no volvemos a responder
  -- (el usuario ya recibio la explicacion).
  select count(*) into v_mensajes_sistema
    from public.mensajes
   where conversacion_id = new.conversacion_id
     and es_sistema = true;

  if v_mensajes_sistema > 0 then
    return new;
  end if;

  -- Identificamos al "otro" usuario de la conversacion (el dueño del
  -- anuncio demo) para que el mensaje aparezca como suyo en la UI.
  -- Si la convo es par a/b y el remitente es a, el otro es b; y al
  -- reves. (Puede haber sido cualquiera de los dos quien enviase.)
  select case
    when c.usuario_a_id = new.remitente_id then c.usuario_b_id
    else c.usuario_a_id
  end
  into v_otro_usuario_id
  from public.conversaciones c
  where c.id = new.conversacion_id;

  -- Insertamos la respuesta automatica con el flag es_sistema=true.
  -- El remitente_id es el "otro" usuario (el dueño del demo) para
  -- satisfacer la FK, pero la UI lo renderiza como mensaje del
  -- sistema gracias al flag.
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

drop trigger if exists mensajes_demo_respuesta on public.mensajes;
create trigger mensajes_demo_respuesta
after insert on public.mensajes
for each row execute function public.tg_demo_respuesta_sistema();

-- ---------------------------------------------------------------
-- Vista: anuncios visibles segun modo demo. NO se usa por ahora
-- (la app filtra desde codigo), pero queda lista para futuras
-- consultas SQL ad-hoc o reportes.
-- ---------------------------------------------------------------
comment on column public.anuncios.es_demo is
  'TRUE si el anuncio es de demostracion (no contactable como real).';
comment on column public.conversaciones.es_demo is
  'TRUE si la conversacion fue iniciada con un anuncio demo.';
comment on column public.mensajes.es_sistema is
  'TRUE si el mensaje fue generado automaticamente por la app (no por un usuario humano).';

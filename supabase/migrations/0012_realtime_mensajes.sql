-- =========================================================================
-- 0012_realtime_mensajes.sql
-- Habilita Supabase Realtime sobre la tabla `mensajes`.
--
-- Esto permite que el cliente (ChatCliente.tsx) se suscriba a los
-- INSERTs de la tabla y reciba en directo los mensajes que el otro
-- participante envía, sin necesidad de recargar la página.
--
-- Importante: Realtime respeta RLS. Como ya tenemos política
-- "mensajes_select_si_en_conversacion", el cliente sólo recibirá
-- eventos de mensajes que tenga permiso de leer (o sea, los de las
-- conversaciones en las que participa). Aun así filtramos por
-- conversacion_id en el código del cliente para no procesar eventos
-- de OTRAS conversaciones del propio usuario.
-- =========================================================================

-- Asegurar que la publicación supabase_realtime existe (Supabase la
-- crea por defecto, pero lo verificamos por si acaso).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;

-- Añadir mensajes a la publicación. Si ya estaba, no falla.
do $$
begin
  alter publication supabase_realtime add table public.mensajes;
exception when duplicate_object then
  null;
end;
$$;

-- =========================================================================
-- 0009_contar_no_leidos.sql
-- Función auxiliar para mostrar el indicador de mensajes sin leer en el
-- Header global. La consulta se hace en cada render de página (Server
-- Component), así que conviene que sea barata: usamos los timestamps
-- `ultimo_visto_*_el` ya guardados en la fila de cada conversación
-- (no escaneamos toda la tabla de mensajes).
-- =========================================================================

create or replace function public.contar_conversaciones_con_no_leidos()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
    from public.conversaciones c
   where auth.uid() in (c.usuario_a_id, c.usuario_b_id)
     and exists (
       select 1
         from public.mensajes m
        where m.conversacion_id = c.id
          and m.remitente_id <> auth.uid()
          and m.creado_el > case
                              when auth.uid() = c.usuario_a_id then c.ultimo_visto_a_el
                              else c.ultimo_visto_b_el
                            end
     );
$$;

grant execute on function public.contar_conversaciones_con_no_leidos() to authenticated;

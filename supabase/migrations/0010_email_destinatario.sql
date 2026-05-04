-- =========================================================================
-- 0010_email_destinatario.sql
-- Función auxiliar para que las server actions puedan resolver el email
-- de la persona destinataria de un mensaje y disparar la notificación
-- por correo (Resend).
--
-- Es SECURITY DEFINER y restringe el acceso: solo devuelve el email
-- del OTRO participante de una conversación en la que el llamante ya
-- participa. La email nunca se expone al cliente del navegador (la
-- llamada se hace en una server action).
-- =========================================================================

create or replace function public.datos_email_destinatario_mensaje(
  conv_id uuid
)
returns table(
  email                text,
  alias_destinatario   text,
  alias_remitente      text,
  notificacion_id      uuid
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    u.email::text,
    pd.alias_publico::text  as alias_destinatario,
    pr.alias_publico::text  as alias_remitente,
    -- La notificación más reciente tipo 'mensaje_nuevo' que aún no
    -- tiene marca de email enviado, para que el caller la actualice.
    (
      select n.id
        from public.notificaciones n
       where n.conversacion_id = c.id
         and n.tipo = 'mensaje_nuevo'
         and n.usuario_id = case
                              when auth.uid() = c.usuario_a_id then c.usuario_b_id
                              else c.usuario_a_id
                            end
         and n.enviada_email_el is null
       order by n.creada_el desc
       limit 1
    ) as notificacion_id
    from public.conversaciones c
    join auth.users u
      on u.id = case
                  when auth.uid() = c.usuario_a_id then c.usuario_b_id
                  else c.usuario_a_id
                end
    join public.perfiles_publicos pd on pd.id = u.id
    left join public.perfiles_publicos pr on pr.id = auth.uid()
   where c.id = conv_id
     and auth.uid() in (c.usuario_a_id, c.usuario_b_id);
$$;

grant execute on function public.datos_email_destinatario_mensaje(uuid) to authenticated;


-- Función para marcar la notificación como enviada por email después
-- de un envío correcto. Solo afecta a notificaciones del propio usuario
-- (el destinatario), pero ya tenemos política de UPDATE para el dueño.
create or replace function public.marcar_notificacion_email_enviada(
  notif_id uuid
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.notificaciones
     set enviada_email_el = now()
   where id = notif_id
     and enviada_email_el is null;
$$;

grant execute on function public.marcar_notificacion_email_enviada(uuid) to authenticated;

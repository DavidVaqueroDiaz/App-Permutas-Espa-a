-- =========================================================================
-- 0016_emails_post_cierre.sql
--
-- RPC para resolver los emails de los otros participantes de una cadena
-- cuando UN anuncio se acaba de cerrar (estado='permutado'). Necesario
-- porque, a diferencia de "cadena nueva detectada" (que tiene su propio
-- RPC con dedupe via cadenas_notificadas), aqui es un evento puntual
-- que no necesita dedupe entre sesiones.
--
-- Restricciones de seguridad:
--   - Solo el DUENO del anuncio cerrado puede pedir los emails.
--   - El anuncio debe estar realmente en estado='permutado'.
--   - Excluye al propio llamante.
--   - Excluye cuentas sinteticas @permutaes.test y emails sin confirmar.
-- =========================================================================

create or replace function public.emails_otros_participantes_post_cierre(
  anuncio_origen_id uuid,
  destinatarios     uuid[]
)
returns table(usuario_id uuid, email text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  origen_user   uuid;
  origen_estado text;
begin
  if auth.uid() is null then
    return;
  end if;

  select a.usuario_id, a.estado
    into origen_user, origen_estado
    from public.anuncios a
   where a.id = anuncio_origen_id;

  if origen_user is null or origen_user <> auth.uid() then
    return;
  end if;
  if origen_estado <> 'permutado' then
    return;
  end if;

  return query
    select u.id, u.email::text
      from auth.users u
     where u.id = any(destinatarios)
       and u.id <> auth.uid()
       and u.email not like '%@permutaes.test'
       and u.email_confirmed_at is not null;
end;
$$;

revoke all on function public.emails_otros_participantes_post_cierre(uuid, uuid[]) from public;
grant  execute on function public.emails_otros_participantes_post_cierre(uuid, uuid[]) to authenticated;

comment on function public.emails_otros_participantes_post_cierre(uuid, uuid[]) is
  'Devuelve {usuario_id, email} de los destinatarios indicados, solo si el llamante es el dueno del anuncio_origen_id y dicho anuncio esta en estado permutado.';

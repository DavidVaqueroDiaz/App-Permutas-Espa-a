-- =========================================================================
-- 0038_revoke_funciones_internas.sql
--
-- Cierra el acceso de anon/authenticated a tres funciones SECURITY
-- DEFINER que solo deberian invocarse desde el servidor con la secret
-- key (rol service_role). Hasta ahora estaban abiertas y eran
-- explotables directamente via PostgREST:
--
--   - candidatos_recordatorio_caducidad(): devuelve los EMAILS de todos
--     los usuarios con anuncios que caducan en 30 dias. Estaba concedida
--     a authenticated -> cualquier usuario registrado podia cosechar los
--     correos de los demas (fuga de datos personales / RGPD). Solo la usa
--     el cron de recordatorios.
--
--   - marcar_recordatorio_enviado(uuid): permitia a cualquiera marcar
--     recordatorios de anuncios ajenos como "ya enviados", de modo que
--     sus duenos nunca recibirian el aviso de caducidad (sabotaje
--     silencioso). Solo la usa el cron.
--
--   - crear_demo_sintetico(...): crea usuarios + anuncios sinteticos y
--     estaba abierta a PUBLIC (incluido anon, sin registro) -> creacion
--     ilimitada de datos basura en auth.users y anuncios. Solo la usa el
--     generador de demos.
--
-- ORDEN DE DESPLIEGUE (importante): el cron
-- (api/cron/recordatorios-caducidad) y el generador de demos
-- (auto-permutas -> sintetizar-demo) YA se han cambiado para invocar
-- estas funciones con el cliente service_role (commit previo, ya
-- desplegado en produccion). Por eso este revoke no rompe ningun flujo
-- legitimo: service_role conserva el permiso.
-- =========================================================================

revoke all on function public.candidatos_recordatorio_caducidad()
  from public, anon, authenticated;
grant execute on function public.candidatos_recordatorio_caducidad()
  to service_role;

revoke all on function public.marcar_recordatorio_enviado(uuid)
  from public, anon, authenticated;
grant execute on function public.marcar_recordatorio_enviado(uuid)
  to service_role;

revoke all on function public.crear_demo_sintetico(
  text, uuid, uuid, text, text, text, text[], integer, integer
) from public, anon, authenticated;
grant execute on function public.crear_demo_sintetico(
  text, uuid, uuid, text, text, text, text[], integer, integer
) to service_role;

-- =========================================================================
-- 0007_vista_perfiles_matching.sql
-- Vista pública con los datos mínimos de cada perfil que el motor de
-- matching necesita para validar reglas legales (ano_nacimiento) y
-- mostrar al otro usuario (alias_publico).
--
-- La VIEW se crea con security_invoker = false (default), de modo que
-- la lectura ignora las RLS de perfiles_usuario y devuelve los datos
-- como si fuera el owner. Es seguro porque:
--   - Solo expone tres columnas no sensibles (id, alias_publico, ano_nacimiento).
--   - El email, telefono y nombre_real NO se exponen.
--   - Filtramos perfiles eliminados (eliminado_el is null).
-- =========================================================================

create or replace view public.perfiles_publicos as
select
  id,
  alias_publico,
  ano_nacimiento
from public.perfiles_usuario
where eliminado_el is null;

-- Permitir lectura desde anon y authenticated. Sin esto, la VIEW seguiría
-- las políticas (vacías) que apliquen para cada rol al SELECT.
grant select on public.perfiles_publicos to anon, authenticated;

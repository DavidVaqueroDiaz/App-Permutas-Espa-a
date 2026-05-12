-- =========================================================================
-- 0037_seed_age_informatica.sql
--
-- Añade los 3 cuerpos especiales de informática de la AGE que faltaban.
--
-- Detectado por un usuario real que escribió pidiendo TAI, GSI y "el A1
-- que no me sé las siglas" (TIC).
--
-- Carrera completa de informática en la AGE:
--   - TAI (Técnicos Auxiliares de Informática)         — C1
--   - GSI (Gestión de Sistemas e Informática)          — A2
--   - TIC (Superior de Sistemas y Tecnologías de la Información) — A1
--
-- Son cuerpos generales del Estado con oposición específica (acceso por
-- conocimientos de informática), regulados por la Ley 30/1984 y normas
-- de creación posteriores (RD 1373/1997 para TAI/GSI, Orden APU/450/2008
-- para TIC reformado).
--
-- Sin especialidades sembradas, igual que el resto de cuerpos AGE.
-- =========================================================================

insert into public.cuerpos (sector_codigo, codigo_oficial, denominacion, subgrupo, norma_reguladora) values
  ('funcionario_age', 'AGE-A1-TIC', 'Cuerpo Superior de Sistemas y Tecnologías de la Información del Estado', 'A1', 'Ley 30/1984 + Orden APU/450/2008'),
  ('funcionario_age', 'AGE-A2-GSI', 'Cuerpo de Gestión de Sistemas e Informática de la Administración del Estado', 'A2', 'Ley 30/1984 + RD 1373/1997'),
  ('funcionario_age', 'AGE-C1-TAI', 'Cuerpo de Técnicos Auxiliares de Informática de la Administración del Estado', 'C1', 'Ley 30/1984 + RD 1373/1997')
on conflict (sector_codigo, codigo_oficial, denominacion) do nothing;

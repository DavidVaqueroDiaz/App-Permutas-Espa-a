-- =========================================================================
-- 0021_seed_cuerpos_resto_sectores.sql
--
-- Apertura de los 5 sectores que faltaban: AGE, funcionarios autonomicos,
-- locales, habilitados nacionales y policia local.
--
-- Las reglas de matching geografico de cada sector ya estaban en
-- src/lib/matching.ts desde el inicio (RD 364/1995, leyes autonomicas,
-- art. 98 RFL 1952, RD 128/2018). Aqui solo necesitamos sembrar los
-- cuerpos.
--
-- Decisiones de modelado:
--   - AGE: 12 cuerpos generales y especiales mas comunes.
--   - Funcionarios CCAA: cuerpos GENERICOS por subgrupo. Cada CCAA tiene
--     sus propios nombres; modelar cada uno seria explosion combinatoria.
--     Simplificamos: el matcher ya filtra intra-CCAA, asi que un "Cuerpo
--     Superior A1" en Galicia solo cruza con otro A1 dentro de Galicia.
--     Si dos cuerpos A1 distintos coinciden, el usuario aclara en
--     observaciones.
--   - Funcionarios locales: igual, generico por subgrupo + escala.
--   - Habilitados nacionales: 5 cuerpos concretos del RD 128/2018.
--   - Policia Local: 6 escalas estandar (con variaciones por CCAA, pero
--     la cabeza es comun).
-- =========================================================================


-- ----- AGE (Funcionarios de la Administracion General del Estado) -----

insert into public.cuerpos (sector_codigo, codigo_oficial, denominacion, subgrupo, norma_reguladora) values
  ('funcionario_age', 'AGE-A1-CSACE', 'Cuerpo Superior de Administradores Civiles del Estado', 'A1', 'Ley 30/1984 + RD 364/1995'),
  ('funcionario_age', 'AGE-A1-TS',    'Cuerpo Superior de Tecnicos Superiores',                'A1', 'Ley 30/1984 + RD 364/1995'),
  ('funcionario_age', 'AGE-A1-IH',    'Cuerpo Superior de Inspectores de Hacienda',            'A1', 'Ley 30/1984'),
  ('funcionario_age', 'AGE-A1-IT',    'Cuerpo Superior de Inspectores de Trabajo y SS',        'A1', 'Ley 30/1984'),
  ('funcionario_age', 'AGE-A2-GAC',   'Cuerpo de Gestion de la Administracion Civil',          'A2', 'Ley 30/1984'),
  ('funcionario_age', 'AGE-A2-TH',    'Cuerpo Tecnico de Hacienda',                            'A2', 'Ley 30/1984'),
  ('funcionario_age', 'AGE-A2-SI',    'Cuerpo de Subinspectores Laborales',                    'A2', 'Ley 30/1984'),
  ('funcionario_age', 'AGE-A2-SAC',   'Cuerpos Tecnicos de Administracion Civil (otros A2)',   'A2', 'Ley 30/1984'),
  ('funcionario_age', 'AGE-C1-GA',    'Cuerpo General Administrativo',                         'C1', 'Ley 30/1984'),
  ('funcionario_age', 'AGE-C1-AH',    'Cuerpo General de Agentes de la Hacienda Publica',      'C1', 'Ley 30/1984'),
  ('funcionario_age', 'AGE-C2-GAUX',  'Cuerpo General Auxiliar',                               'C2', 'Ley 30/1984'),
  ('funcionario_age', 'AGE-AP-GS',    'Cuerpo Subalterno (Personal subalterno)',               'AP', 'Ley 30/1984')
on conflict (sector_codigo, codigo_oficial, denominacion) do nothing;


-- ----- Funcionarios autonomicos (cuerpos genericos por subgrupo) -----
--
-- Cada CCAA tiene su propia denominacion oficial. Aqui unificamos por
-- subgrupo profesional para que el matcher pueda cruzar dentro de una
-- misma CCAA. La denominacion exacta del cuerpo, la pone el usuario en
-- observaciones si la diferencia importa.

insert into public.cuerpos (sector_codigo, codigo_oficial, denominacion, subgrupo, norma_reguladora) values
  ('funcionario_ccaa', 'CCAA-A1', 'Cuerpo Superior (Tecnicos superiores y facultativos)',     'A1', 'Ley autonomica de funcion publica'),
  ('funcionario_ccaa', 'CCAA-A2', 'Cuerpo de Gestion / Tecnicos medios',                       'A2', 'Ley autonomica de funcion publica'),
  ('funcionario_ccaa', 'CCAA-C1', 'Cuerpo Administrativo',                                     'C1', 'Ley autonomica de funcion publica'),
  ('funcionario_ccaa', 'CCAA-C2', 'Cuerpo Auxiliar Administrativo',                            'C2', 'Ley autonomica de funcion publica'),
  ('funcionario_ccaa', 'CCAA-AP', 'Cuerpo Subalterno / Personal de oficios',                   'AP', 'Ley autonomica de funcion publica')
on conflict (sector_codigo, codigo_oficial, denominacion) do nothing;


-- ----- Funcionarios de Administracion Local (cuerpos genericos) -----

insert into public.cuerpos (sector_codigo, codigo_oficial, denominacion, subgrupo, norma_reguladora) values
  ('funcionario_local', 'LOCAL-A1', 'Tecnico Superior / Tecnico de Administracion General',     'A1', 'Art. 98 RFL 1952 + EBEP'),
  ('funcionario_local', 'LOCAL-A2', 'Tecnico Medio / Tecnico de Administracion General',        'A2', 'Art. 98 RFL 1952 + EBEP'),
  ('funcionario_local', 'LOCAL-C1', 'Administrativo',                                            'C1', 'Art. 98 RFL 1952 + EBEP'),
  ('funcionario_local', 'LOCAL-C2', 'Auxiliar Administrativo',                                   'C2', 'Art. 98 RFL 1952 + EBEP'),
  ('funcionario_local', 'LOCAL-AP', 'Subalterno / Personal de oficios',                          'AP', 'Art. 98 RFL 1952 + EBEP')
on conflict (sector_codigo, codigo_oficial, denominacion) do nothing;


-- ----- Habilitados nacionales (RD 128/2018) -----

insert into public.cuerpos (sector_codigo, codigo_oficial, denominacion, subgrupo, norma_reguladora) values
  ('habilitado_nacional', 'HN-SEC-SUP', 'Secretaria, categoria superior',                'A1', 'RD 128/2018'),
  ('habilitado_nacional', 'HN-SEC-ENT', 'Secretaria, categoria de entrada',              'A1', 'RD 128/2018'),
  ('habilitado_nacional', 'HN-INT-SUP', 'Intervencion-Tesoreria, categoria superior',   'A1', 'RD 128/2018'),
  ('habilitado_nacional', 'HN-INT-ENT', 'Intervencion-Tesoreria, categoria de entrada','A1', 'RD 128/2018'),
  ('habilitado_nacional', 'HN-SECINT',  'Secretaria-Intervencion (clase 3a)',           'A1', 'RD 128/2018')
on conflict (sector_codigo, codigo_oficial, denominacion) do nothing;


-- ----- Policia Local (jerarquia estandar; variaciones por CCAA en escalas) -----

insert into public.cuerpos (sector_codigo, codigo_oficial, denominacion, subgrupo, norma_reguladora) values
  ('policia_local', 'PL-COMP', 'Comisario Principal (Escala Superior)',  'A1', 'Ley autonomica + LOFCS'),
  ('policia_local', 'PL-COM',  'Comisario (Escala Superior)',            'A1', 'Ley autonomica + LOFCS'),
  ('policia_local', 'PL-INSP', 'Inspector (Escala Tecnica/Ejecutiva)',   'A1', 'Ley autonomica + LOFCS'),
  ('policia_local', 'PL-SUB',  'Subinspector (Escala Ejecutiva)',         'A2', 'Ley autonomica + LOFCS'),
  ('policia_local', 'PL-OFI',  'Oficial (Escala Basica)',                 'C1', 'Ley autonomica + LOFCS'),
  ('policia_local', 'PL-AGT',  'Policia / Agente (Escala Basica)',        'C1', 'Ley autonomica + LOFCS')
on conflict (sector_codigo, codigo_oficial, denominacion) do nothing;

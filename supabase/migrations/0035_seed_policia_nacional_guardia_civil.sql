-- =========================================================================
-- 0035_seed_policia_nacional_guardia_civil.sql
--
-- Apertura de los sectores Policia Nacional (CNP) y Guardia Civil (GC).
--
-- Marco legal:
--   - CNP: Ley Organica 9/2015, de 28 de julio, de Regimen de Personal de
--     la Policia Nacional. Aunque la ley no regula expresamente la
--     "permuta" como figura, la provision de destinos por concurso (arts.
--     47-48) permite que dos funcionarios coordinen el intercambio
--     pidiendose mutuamente sus plazas. Equivalente al modelo docente.
--   - GC: Ley 29/2014 (regimen de personal) + RD 470/2019 (reglamento
--     de destinos). Misma logica que CNP: la "permuta" no aparece como
--     figura legal pero la coordinacion entre dos guardias en sus
--     concursos respectivos es valida y comun.
--
-- Decisiones de modelado:
--   - Ambos sectores son nacionales sin limite (permite_inter_ccaa = true)
--     porque el cuerpo es estatal y los destinos se asignan en todo el
--     territorio.
--   - CNP: 7 cuerpos = las 7 categorias oficiales (Policia, Oficial,
--     Subinspector, Inspector, Inspector Jefe, Comisario, Comisario
--     Principal). Sin especialidades sembradas: las "areas de actividad"
--     de la LO 9/2015 son transversales y no definen el destino, asi que
--     el campo queda NULL como en AGE/locales/habilitados.
--   - GC: 12 cuerpos (Guardia, Cabo, Cabo Primero, Cabo Mayor, Sargento,
--     Sargento Primero, Brigada, Subteniente, Suboficial Mayor, Teniente,
--     Capitan, Comandante). Excluimos los 3 empleos de Oficiales Generales
--     (Teniente General, General de Division, General de Brigada) porque
--     son puestos de libre designacion, no permutan en la practica.
--     Tambien excluimos Teniente Coronel y Coronel por la misma razon.
--   - GC: 22 especialidades = las 21 fundamentales oficiales de la Orden
--     PCM/509/2020 + "Seguridad Ciudadana" generica anadida para puestos
--     territoriales sin especialidad tecnica (el grueso de la patrulla
--     rural). Estas 22 se asocian a los 9 cuerpos de tropa y suboficiales
--     (Guardia -> Suboficial Mayor). Los 3 cuerpos de Oficiales (Teniente,
--     Capitan, Comandante) se quedan sin especialidades porque la
--     especialidad fundamental se obtiene desde tropa/suboficiales y los
--     oficiales suelen ocupar puestos de mando transversales.
-- =========================================================================


-- -----------------------------------------------------------------------
-- 1) Sectores
-- -----------------------------------------------------------------------

insert into public.sectores (codigo, nombre, descripcion, permite_inter_ccaa, regla_matching) values
  ('policia_nacional',
   'Policia Nacional',
   'Funcionarios del Cuerpo Nacional de Policia. La provision de destinos por concurso (LO 9/2015) permite coordinar intercambios entre compañeros.',
   true,
   'policia_nacional'),
  ('guardia_civil',
   'Guardia Civil',
   'Personal militar del Cuerpo de la Guardia Civil (Ley 29/2014, RD 470/2019). Coordinacion de destinos por concurso entre compañeros.',
   true,
   'guardia_civil')
on conflict (codigo) do nothing;


-- -----------------------------------------------------------------------
-- 2) Cuerpos de Policia Nacional (7 categorias, LO 9/2015)
-- -----------------------------------------------------------------------

insert into public.cuerpos (sector_codigo, codigo_oficial, denominacion, subgrupo, norma_reguladora) values
  ('policia_nacional', 'CNP-POL', 'Policia',                  'C1', 'LO 9/2015 art. 17'),
  ('policia_nacional', 'CNP-OFI', 'Oficial de Policia',       'C1', 'LO 9/2015 art. 17'),
  ('policia_nacional', 'CNP-SBI', 'Subinspector',             'A2', 'LO 9/2015 art. 17'),
  ('policia_nacional', 'CNP-INS', 'Inspector',                'A2', 'LO 9/2015 art. 17'),
  ('policia_nacional', 'CNP-IJF', 'Inspector Jefe',           'A2', 'LO 9/2015 art. 17'),
  ('policia_nacional', 'CNP-COM', 'Comisario',                'A1', 'LO 9/2015 art. 17'),
  ('policia_nacional', 'CNP-CMP', 'Comisario Principal',      'A1', 'LO 9/2015 art. 17')
on conflict (sector_codigo, codigo_oficial, denominacion) do nothing;


-- -----------------------------------------------------------------------
-- 3) Cuerpos de Guardia Civil (12 empleos, Ley 29/2014 art. 18.3)
-- -----------------------------------------------------------------------

insert into public.cuerpos (sector_codigo, codigo_oficial, denominacion, subgrupo, norma_reguladora) values
  ('guardia_civil', 'GC-GUA', 'Guardia Civil',     'C1', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-CAB', 'Cabo',              'C1', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-CB1', 'Cabo Primero',      'C1', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-CBM', 'Cabo Mayor',        'C1', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-SAR', 'Sargento',          'A2', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-SR1', 'Sargento Primero',  'A2', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-BRI', 'Brigada',           'A2', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-SBT', 'Subteniente',       'A2', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-SBM', 'Suboficial Mayor',  'A2', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-TTE', 'Teniente',          'A1', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-CAP', 'Capitan',           'A1', 'Ley 29/2014 art. 18.3'),
  ('guardia_civil', 'GC-CTE', 'Comandante',        'A1', 'Ley 29/2014 art. 18.3')
on conflict (sector_codigo, codigo_oficial, denominacion) do nothing;


-- -----------------------------------------------------------------------
-- 4) Especialidades de Guardia Civil (22 = 21 fundamentales + Seg.Ciud.)
--
-- Asociadas a los 9 cuerpos de tropa y suboficiales. Para los 3 cuerpos
-- de Oficiales (Teniente, Capitan, Comandante) no se siembran porque su
-- puesto no se rige por especialidad fundamental.
--
-- Fuente: Orden PCM/509/2020 + adicion de "Seguridad Ciudadana" para
-- puestos territoriales que no tienen especialidad tecnica.
-- -----------------------------------------------------------------------

with esp(codigo, denominacion) as (values
  ('ACSUB', 'Actividades Subacuaticas'),
  ('ADE',   'Adiestramientos Especiales'),
  ('AER',   'Aerea'),
  ('ARM',   'Armamento y Equipamiento Policial'),
  ('AUT',   'Automovilismo'),
  ('CIN',   'Cinologica'),
  ('CRIM',  'Criminalistica'),
  ('TBQ',   'Desactivacion de Explosivos y Defensa NRBQ'),
  ('FFR',   'Fiscal y Fronteras'),
  ('INF',   'Informacion'),
  ('IAE',   'Intervencion de Armas y Explosivos'),
  ('UEI',   'Intervencion Especial (UEI)'),
  ('MAR',   'Maritima'),
  ('MT',    'Montana'),
  ('PJU',   'Policia Judicial'),
  ('PRL',   'Prevencion de Riesgos Laborales'),
  ('PRONA', 'Proteccion de la Naturaleza (SEPRONA)'),
  ('TR',    'Trafico'),
  ('RSUB',  'Reconocimiento del Subsuelo'),
  ('SEIN',  'Seguridad e Intervencion'),
  ('TEIN',  'Tecnologias de la Informacion'),
  ('SC',    'Seguridad Ciudadana')
),
cuerpos_objetivo as (
  select id
  from public.cuerpos
  where sector_codigo = 'guardia_civil'
    and codigo_oficial in (
      'GC-GUA','GC-CAB','GC-CB1','GC-CBM',
      'GC-SAR','GC-SR1','GC-BRI','GC-SBT','GC-SBM'
    )
)
insert into public.especialidades (cuerpo_id, codigo_oficial, denominacion)
select c.id, e.codigo, e.denominacion
from cuerpos_objetivo c
cross join esp e
on conflict (cuerpo_id, codigo_oficial, denominacion) do nothing;

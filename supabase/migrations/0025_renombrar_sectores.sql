-- 0025_renombrar_sectores.sql
--
-- Renombra los nombres y descripciones de los sectores para que sean
-- mas claros y reconocibles para el usuario final. Los codigos
-- internos (codigo) NO cambian — siguen siendo `docente_loe`,
-- `sanitario_sns`, etc., para no romper referencias en codigo.

update public.sectores set
  nombre = 'Personal docente no universitario',
  descripcion = 'Infantil, Primaria, Secundaria, FP, EOI, Música, Artes Plásticas y Diseño.'
where codigo = 'docente_loe';

update public.sectores set
  nombre = 'Personal sanitario estatutario',
  descripcion = 'Personal fijo del SNS: SERGAS, SAS, SACYL, SESCAM, Osakidetza, ICS y demás servicios autonómicos de salud.'
where codigo = 'sanitario_sns';

update public.sectores set
  nombre = 'Funcionarios del Estado (AGE)',
  descripcion = 'Personal de Ministerios y organismos estatales. Administración General del Estado.'
where codigo = 'funcionario_age';

update public.sectores set
  nombre = 'Funcionarios autonómicos',
  descripcion = 'Personal de la Xunta, Junta, Generalitat, Govern o Gobierno autonómico. Cuerpos propios de tu Comunidad Autónoma.'
where codigo = 'funcionario_ccaa';

update public.sectores set
  nombre = 'Funcionarios de Ayuntamiento o Diputación',
  descripcion = 'Administración Local: ayuntamientos, diputaciones, cabildos y consells insulares.'
where codigo = 'funcionario_local';

update public.sectores set
  nombre = 'Secretarios, Interventores y Tesoreros',
  descripcion = 'Funcionarios de Habilitación Nacional (FHN) en entidades locales.'
where codigo = 'habilitado_nacional';

update public.sectores set
  nombre = 'Policía Local',
  descripcion = 'También llamada Policía Municipal o Guardia Urbana. Solo en CCAA con regulación expresa: Andalucía, Aragón, Baleares, Comunidad Valenciana y Galicia.'
where codigo = 'policia_local';

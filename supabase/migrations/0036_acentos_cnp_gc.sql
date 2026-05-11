-- =========================================================================
-- 0036_acentos_cnp_gc.sql
--
-- Arregla las tildes y eñes en los nombres visibles al usuario de los
-- sectores Policia Nacional y Guardia Civil sembrados en 0035.
--
-- En 0035 se omitieron los acentos siguiendo el patron de 0021, pero el
-- QA detecto la inconsistencia: el resto de la app si los usa (p.ej.
-- "Policia Local" -> "Policía Local"). Aqui acentuamos los strings que
-- el usuario ve en los selectores (sectores.nombre, cuerpos.denominacion,
-- especialidades.denominacion) y en descripciones.
--
-- Los codigos oficiales (CNP-POL, GC-GUA, etc.) NO se tocan: estan en
-- ASCII a proposito para facilitar el uso en URLs, indices y queries.
-- =========================================================================


-- -----------------------------------------------------------------------
-- 1) Sectores: nombre + descripcion
-- -----------------------------------------------------------------------

update public.sectores
   set nombre      = 'Policía Nacional',
       descripcion = 'Funcionarios del Cuerpo Nacional de Policía. La provisión de destinos por concurso (LO 9/2015) permite coordinar intercambios entre compañeros.'
 where codigo = 'policia_nacional';

update public.sectores
   set descripcion = 'Personal militar del Cuerpo de la Guardia Civil (Ley 29/2014, RD 470/2019). Coordinación de destinos por concurso entre compañeros.'
 where codigo = 'guardia_civil';


-- -----------------------------------------------------------------------
-- 2) Cuerpos CNP (denominacion)
-- -----------------------------------------------------------------------

update public.cuerpos set denominacion = 'Policía'           where sector_codigo = 'policia_nacional' and codigo_oficial = 'CNP-POL';
update public.cuerpos set denominacion = 'Oficial de Policía' where sector_codigo = 'policia_nacional' and codigo_oficial = 'CNP-OFI';


-- -----------------------------------------------------------------------
-- 3) Cuerpos GC (denominacion)
-- -----------------------------------------------------------------------

update public.cuerpos set denominacion = 'Capitán'           where sector_codigo = 'guardia_civil' and codigo_oficial = 'GC-CAP';


-- -----------------------------------------------------------------------
-- 4) Especialidades GC (denominacion)
-- -----------------------------------------------------------------------

update public.especialidades e set denominacion = 'Actividades Subacuáticas'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'ACSUB';

update public.especialidades e set denominacion = 'Aérea'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'AER';

update public.especialidades e set denominacion = 'Cinológica'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'CIN';

update public.especialidades e set denominacion = 'Criminalística'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'CRIM';

update public.especialidades e set denominacion = 'Desactivación de Explosivos y Defensa NRBQ'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'TBQ';

update public.especialidades e set denominacion = 'Información'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'INF';

update public.especialidades e set denominacion = 'Intervención de Armas y Explosivos'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'IAE';

update public.especialidades e set denominacion = 'Intervención Especial (UEI)'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'UEI';

update public.especialidades e set denominacion = 'Marítima'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'MAR';

update public.especialidades e set denominacion = 'Montaña'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'MT';

update public.especialidades e set denominacion = 'Policía Judicial'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'PJU';

update public.especialidades e set denominacion = 'Prevención de Riesgos Laborales'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'PRL';

update public.especialidades e set denominacion = 'Protección de la Naturaleza (SEPRONA)'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'PRONA';

update public.especialidades e set denominacion = 'Tráfico'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'TR';

update public.especialidades e set denominacion = 'Seguridad e Intervención'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'SEIN';

update public.especialidades e set denominacion = 'Tecnologías de la Información'
  from public.cuerpos c
 where e.cuerpo_id = c.id and c.sector_codigo = 'guardia_civil' and e.codigo_oficial = 'TEIN';

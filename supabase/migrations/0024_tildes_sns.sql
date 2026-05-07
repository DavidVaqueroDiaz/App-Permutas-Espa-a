-- =========================================================================
-- 0024_tildes_sns.sql
--
-- Normaliza con tildes correctas las denominaciones de cuerpos SNS y los
-- nombres oficiales de servicios de salud.
--
-- Las migraciones 0019 (cuerpos SNS) y 0019 (servicios_salud) sembraron
-- los textos sin tildes para evitar problemas de encoding del propio
-- archivo SQL en Windows. Resultado: el usuario veia "Tecnico/a en
-- Cuidados Auxiliares de Enfermeria", "Pediatra de Atencion Primaria",
-- "Servicio Madrileno de Salud"... que rompe profesionalidad para una
-- audiencia que precisamente espera precision en la nomenclatura
-- oficial.
-- =========================================================================

-- ----- Cuerpos SNS -----

update public.cuerpos set denominacion = 'Médico/a de Familia (Atención Primaria)'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'MED01';
update public.cuerpos set denominacion = 'Pediatra de Atención Primaria'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'MED02';
update public.cuerpos set denominacion = 'Médico/a de Urgencias Hospitalarias'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'MED03';
update public.cuerpos set denominacion = 'Facultativo Especialista de Área (FEA)'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'FEA';
update public.cuerpos set denominacion = 'Enfermero/a'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'ENF01';
update public.cuerpos set denominacion = 'Matrón/a'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'ENF02';
update public.cuerpos set denominacion = 'Técnico/a en Cuidados Auxiliares de Enfermería'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'TCAE';
update public.cuerpos set denominacion = 'Celador/a'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'CEL';
update public.cuerpos set denominacion = 'Técnico/a Especialista en Laboratorio'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'TEL';
update public.cuerpos set denominacion = 'Técnico/a Especialista en Radiodiagnóstico'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'TER';
update public.cuerpos set denominacion = 'Fisioterapeuta'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'FIS';
update public.cuerpos set denominacion = 'Psicólogo/a Clínico'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'PSI';
update public.cuerpos set denominacion = 'Trabajador/a Social'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'TSO';
update public.cuerpos set denominacion = 'Farmacéutico/a Hospitalario'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'FAR';
update public.cuerpos set denominacion = 'Personal Administrativo'
  where sector_codigo = 'sanitario_sns' and codigo_oficial = 'ADM';


-- ----- Servicios de Salud (nombres oficiales con tildes) -----

update public.servicios_salud set
  nombre_oficial = 'Servicio Andaluz de Salud',
  normativa_permutas = 'Decreto autonómico de gestión del personal estatutario'
  where codigo = 'sas';

update public.servicios_salud set
  nombre_oficial = 'Servicio Aragonés de Salud',
  normativa_permutas = 'Decreto 37/2011 del Gobierno de Aragón'
  where codigo = 'aragon';

update public.servicios_salud set
  nombre_oficial = 'Servicio de Salud del Principado de Asturias'
  where codigo = 'sespa';

update public.servicios_salud set
  nombre_oficial = 'Servicio de Salud de las Illes Balears',
  normativa_permutas = 'Decreto autonómico'
  where codigo = 'ibsalut';

update public.servicios_salud set
  nombre_oficial = 'Servicio Canario de la Salud',
  normativa_permutas = 'Decreto autonómico'
  where codigo = 'scs_can';

update public.servicios_salud set
  nombre_oficial = 'Servicio Cántabro de Salud',
  normativa_permutas = 'Decreto del Gobierno de Cantabria'
  where codigo = 'scs_cant';

update public.servicios_salud set
  nombre_oficial = 'Servicio de Salud de Castilla-La Mancha',
  normativa_permutas = 'Decreto autonómico'
  where codigo = 'sescam';

update public.servicios_salud set
  nombre_oficial = 'Sanidad de Castilla y León',
  normativa_permutas = 'Decreto autonómico'
  where codigo = 'sacyl';

update public.servicios_salud set
  nombre_oficial = 'Institut Català de la Salut (CatSalut)',
  normativa_permutas = 'Decret de la Generalitat de Catalunya'
  where codigo = 'ics';

update public.servicios_salud set
  nombre_oficial = 'Servicio Extremeño de Salud',
  normativa_permutas = 'Decreto autonómico'
  where codigo = 'ses';

update public.servicios_salud set
  nombre_oficial = 'Servicio Gallego de Salud',
  normativa_permutas = 'Decreto autonómico'
  where codigo = 'sergas';

update public.servicios_salud set
  nombre_oficial = 'Servicio Madrileño de Salud',
  normativa_permutas = 'Decreto autonómico'
  where codigo = 'sermas';

update public.servicios_salud set
  nombre_oficial = 'Servicio Murciano de Salud',
  normativa_permutas = 'Decreto autonómico'
  where codigo = 'sms';

update public.servicios_salud set
  nombre_oficial = 'Servicio Navarro de Salud (Osasunbidea)'
  where codigo = 'osasunbi';

update public.servicios_salud set
  nombre_oficial = 'Servicio Vasco de Salud (Osakidetza)',
  normativa_permutas = 'Decreto del Gobierno Vasco'
  where codigo = 'osakide';

update public.servicios_salud set
  nombre_oficial = 'Servicio Riojano de Salud',
  normativa_permutas = 'Decreto autonómico'
  where codigo = 'seris';

update public.servicios_salud set
  nombre_oficial = 'Conselleria de Sanitat (Comunitat Valenciana)',
  normativa_permutas = 'Decreto autonómico'
  where codigo = 'svs';

update public.servicios_salud set
  nombre_oficial = 'Instituto Nacional de Gestión Sanitaria (Ceuta y Melilla)'
  where codigo = 'ingesa';


-- ----- Nombres cortos: aclarar SCS Canarias vs SCS Cantabria -----

-- Cowork detecto que ambos servicios usaban "SCS" como nombre_corto y
-- chocaban en los dropdowns. Aclaramos.
update public.servicios_salud set nombre_corto = 'SCS Canarias' where codigo = 'scs_can';
update public.servicios_salud set nombre_corto = 'SCS Cantabria' where codigo = 'scs_cant';

-- =========================================================================
-- 0019_seed_sns.sql
--
-- Apertura del sector "Personal estatutario fijo del SNS" (sanitario_sns).
-- El sector ya existe desde la migracion 0001. Aqui anadimos:
--
--   1. Tabla `servicios_salud` con los 18 servicios autonomicos +
--      INGESA (Ceuta y Melilla, dependiente del Ministerio).
--   2. FK desde `anuncios.servicio_salud_codigo` -> `servicios_salud.codigo`.
--   3. Cuerpos del sector sanitario_sns (top 15 categorias unitarias
--      mas comunes).
--   4. Especialidades para Facultativo Especialista de Area (FEA)
--      con las ~35 especialidades medicas principales.
--
-- Decision de modelado: aprovechamos las tablas `cuerpos` +
-- `especialidades` ya existentes en lugar de crear `categorias_sns_unitarias`
-- aparte. La semantica es equivalente: "cuerpo" = categoria profesional,
-- "especialidad" = sub-rama (solo aplica a FEA en SNS). Asi todo el
-- codigo de wizard, matcher y formularios sigue funcionando.
-- =========================================================================


-- ----- Tabla de Servicios de Salud autonomicos -----

create table public.servicios_salud (
  codigo            text primary key,
  nombre_corto      text not null,
  nombre_oficial    text not null,
  ccaa_codigo       char(2) references public.ccaa(codigo_ine),
  -- Para INGESA (Ceuta/Melilla) ccaa_codigo se queda null porque no
  -- es exclusivo de una CCAA (gestiona ambas ciudades autonomas).
  web_oficial       text,
  normativa_permutas text
);

create index servicios_salud_ccaa_idx on public.servicios_salud(ccaa_codigo);

alter table public.servicios_salud enable row level security;
create policy "servicios_salud_select_public"
  on public.servicios_salud for select to anon, authenticated
  using (true);


-- FK desde anuncios. Las filas existentes con servicio_salud_codigo
-- distinto de null deben encajar (no las hay todavia: solo hay anuncios
-- docentes importados de PermutaDoc).
alter table public.anuncios
  add constraint anuncios_servicio_salud_fkey
  foreign key (servicio_salud_codigo) references public.servicios_salud(codigo);


-- ----- Seed: 18 servicios de salud -----
-- Codigos: usamos siglas oficiales en lower-case sin guiones.

insert into public.servicios_salud (codigo, nombre_corto, nombre_oficial, ccaa_codigo, web_oficial, normativa_permutas) values
  ('sas',      'SAS',      'Servicio Andaluz de Salud',                           '01', 'https://www.juntadeandalucia.es/servicioandaluzdesalud',     'Decreto autonomico de gestion del personal estatutario'),
  ('aragon',   'SALUD',    'Servicio Aragones de Salud',                          '02', 'https://www.aragon.es/-/servicio-aragones-de-salud',           'Decreto 37/2011 del Gobierno de Aragon'),
  ('sespa',    'SESPA',    'Servicio de Salud del Principado de Asturias',        '03', 'https://www.astursalud.es',                                    'Ley del Principado de Asturias'),
  ('ibsalut',  'IB-Salut', 'Servicio de Salud de las Illes Balears',              '04', 'https://www.ibsalut.es',                                       'Decreto autonomico'),
  ('scs_can',  'SCS',      'Servicio Canario de la Salud',                        '05', 'https://www3.gobiernodecanarias.org/sanidad/scs',              'Decreto autonomico'),
  ('scs_cant', 'SCS',      'Servicio Cantabro de Salud',                          '06', 'https://www.scsalud.es',                                       'Decreto del Gobierno de Cantabria'),
  ('sescam',   'SESCAM',   'Servicio de Salud de Castilla-La Mancha',             '08', 'https://sescam.castillalamancha.es',                           'Decreto autonomico'),
  ('sacyl',    'SACYL',    'Sanidad de Castilla y Leon',                          '07', 'https://www.saludcastillayleon.es',                            'Decreto autonomico'),
  ('ics',      'ICS',      'Institut Catala de la Salut (CatSalut)',              '09', 'https://www.gencat.cat/ics',                                   'Decret de la Generalitat de Catalunya'),
  ('ses',      'SES',      'Servicio Extremeno de Salud',                         '11', 'https://saludextremadura.ses.es',                              'Decreto autonomico'),
  ('sergas',   'SERGAS',   'Servicio Gallego de Salud',                           '12', 'https://www.sergas.es',                                        'Decreto autonomico'),
  ('sermas',   'SERMAS',   'Servicio Madrileno de Salud',                         '13', 'https://www.comunidad.madrid/servicios/salud',                 'Decreto autonomico'),
  ('sms',      'SMS',      'Servicio Murciano de Salud',                          '14', 'https://www.murciasalud.es',                                   'Decreto autonomico'),
  ('osasunbi', 'Osasunbidea','Servicio Navarro de Salud',                         '15', 'https://www.navarra.es/home_es/Temas/Portal+de+la+Salud',      'Ley Foral'),
  ('osakide',  'Osakidetza','Servicio Vasco de Salud',                            '16', 'https://www.osakidetza.euskadi.eus',                           'Decreto del Gobierno Vasco'),
  ('seris',    'SERIS',    'Servicio Riojano de Salud',                           '17', 'https://www.riojasalud.es',                                    'Decreto autonomico'),
  ('svs',      'SVS',      'Conselleria de Sanitat (Valencia)',                   '10', 'https://san.gva.es',                                           'Decreto autonomico'),
  ('ingesa',   'INGESA',   'Instituto Nacional de Gestion Sanitaria (Ceuta y Melilla)', null, 'https://ingesa.sanidad.gob.es',                       'Real Decreto')
on conflict (codigo) do nothing;


-- ----- Seed: cuerpos sanitarios (categorias unitarias mas comunes) -----
--
-- Los "codigos oficiales" del SNS no estan estandarizados como en docencia
-- LOE. Usamos un codigo de 3 letras + numero para que sea identificable.

insert into public.cuerpos (sector_codigo, codigo_oficial, denominacion, subgrupo, norma_reguladora) values
  ('sanitario_sns', 'MED01', 'Medico/a de Familia (Atencion Primaria)',          'A1', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'MED02', 'Pediatra de Atencion Primaria',                    'A1', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'MED03', 'Medico/a de Urgencias Hospitalarias',              'A1', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'FEA',   'Facultativo Especialista de Area (FEA)',           'A1', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'ENF01', 'Enfermero/a',                                       'A2', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'ENF02', 'Matron/a',                                          'A2', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'TCAE',  'Tecnico/a en Cuidados Auxiliares de Enfermeria',    'C1', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'CEL',   'Celador/a',                                         'AP', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'TEL',   'Tecnico/a Especialista en Laboratorio',             'C1', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'TER',   'Tecnico/a Especialista en Radiodiagnostico',        'C1', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'FIS',   'Fisioterapeuta',                                    'A2', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'PSI',   'Psicologo/a Clinico',                               'A1', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'TSO',   'Trabajador/a Social',                               'A2', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'FAR',   'Farmaceutico/a Hospitalario',                       'A1', 'Estatuto Marco Ley 55/2003'),
  ('sanitario_sns', 'ADM',   'Personal Administrativo',                           'C1', 'Estatuto Marco Ley 55/2003')
on conflict (sector_codigo, codigo_oficial, denominacion) do nothing;


-- ----- Seed: especialidades FEA (~35 principales) -----

with cuerpo_fea as (
  select id from public.cuerpos
   where sector_codigo = 'sanitario_sns' and codigo_oficial = 'FEA'
)
insert into public.especialidades (cuerpo_id, codigo_oficial, denominacion)
select cf.id, v.codigo, v.denom
  from cuerpo_fea cf
 cross join (values
    ('FEA001', 'Anatomia Patologica'),
    ('FEA002', 'Anestesiologia y Reanimacion'),
    ('FEA003', 'Analisis Clinicos'),
    ('FEA004', 'Bioquimica Clinica'),
    ('FEA005', 'Cardiologia'),
    ('FEA006', 'Cirugia Cardiovascular'),
    ('FEA007', 'Cirugia General y del Aparato Digestivo'),
    ('FEA008', 'Cirugia Oral y Maxilofacial'),
    ('FEA009', 'Cirugia Ortopedica y Traumatologia'),
    ('FEA010', 'Cirugia Pediatrica'),
    ('FEA011', 'Cirugia Plastica, Estetica y Reparadora'),
    ('FEA012', 'Cirugia Toracica'),
    ('FEA013', 'Cirugia Vascular (Angiologia)'),
    ('FEA014', 'Dermatologia Medico-Quirurgica y Venereologia'),
    ('FEA015', 'Endocrinologia y Nutricion'),
    ('FEA016', 'Aparato Digestivo'),
    ('FEA017', 'Geriatria'),
    ('FEA018', 'Ginecologia y Obstetricia'),
    ('FEA019', 'Hematologia y Hemoterapia'),
    ('FEA020', 'Inmunologia'),
    ('FEA021', 'Medicina Interna'),
    ('FEA022', 'Medicina Intensiva'),
    ('FEA023', 'Medicina Preventiva y Salud Publica'),
    ('FEA024', 'Microbiologia y Parasitologia'),
    ('FEA025', 'Nefrologia'),
    ('FEA026', 'Neumologia'),
    ('FEA027', 'Neurocirugia'),
    ('FEA028', 'Neurofisiologia Clinica'),
    ('FEA029', 'Neurologia'),
    ('FEA030', 'Oftalmologia'),
    ('FEA031', 'Oncologia Medica'),
    ('FEA032', 'Oncologia Radioterapica'),
    ('FEA033', 'Otorrinolaringologia'),
    ('FEA034', 'Pediatria'),
    ('FEA035', 'Psiquiatria'),
    ('FEA036', 'Radiodiagnostico'),
    ('FEA037', 'Rehabilitacion'),
    ('FEA038', 'Reumatologia'),
    ('FEA039', 'Urologia')
  ) as v(codigo, denom)
on conflict (cuerpo_id, codigo_oficial, denominacion) do nothing;


-- ----- Constraint blando: anuncio SNS exige servicio_salud_codigo -----
-- No usamos un CHECK constraint a nivel BD para no impedir migraciones
-- futuras de datos. La validacion la hace la server action `crearAnuncio`
-- via codigo TS. Pero lo dejamos documentado aqui como contrato.

comment on column public.anuncios.servicio_salud_codigo is
  'Solo aplica al sector sanitario_sns. Para sanitario_sns es OBLIGATORIO; para otros sectores debe ser null. La server action lo valida.';

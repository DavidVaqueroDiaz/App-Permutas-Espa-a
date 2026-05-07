-- =========================================================================
-- 0022_recordatorio_caducidad.sql
--
-- Email de recordatorio cuando el anuncio del usuario va a caducar.
--
-- Los anuncios se crean con `caduca_el = now() + 6 months` y, si nadie
-- los renueva, dejan de aparecer en /auto-permutas y /anuncios pero se
-- quedan en BD ocupando espacio y "muertos". Antes de eso queremos
-- avisar al dueno por email para que entre y los renueve si sigue
-- interesado.
--
-- Estrategia:
--   1. Esta tabla dedupe `recordatorios_caducidad (anuncio_id)` evita
--      enviar dos veces el mismo aviso.
--   2. RPC `candidatos_recordatorio_caducidad()` devuelve los anuncios
--      activos con caduca_el dentro de los proximos 30 dias y sin
--      recordatorio enviado, junto con el email del usuario.
--   3. RPC `marcar_recordatorio_enviado(anuncio_id)` para registrar
--      tras envio exitoso.
--   4. Un cron de Vercel (no pg_cron, porque tenemos que enviar por
--      Resend desde TS) llama diariamente a un route handler que
--      orquesta los dos pasos.
-- =========================================================================

create table public.recordatorios_caducidad (
  anuncio_id  uuid primary key references public.anuncios(id) on delete cascade,
  enviado_el  timestamptz not null default now()
);

create index recordatorios_caducidad_enviado_idx
  on public.recordatorios_caducidad(enviado_el);

alter table public.recordatorios_caducidad enable row level security;
-- Sin policies = nadie puede acceder desde el cliente. Solo via RPCs.


-- ----- RPC: candidatos -----
--
-- Devuelve los anuncios activos cuya caducidad esta entre HOY y HOY+30
-- dias, sin recordatorio previo, y cuyo dueno tiene email confirmado.
-- Excluye cuentas test (@permutaes.test) que vienen de PermutaDoc.

create or replace function public.candidatos_recordatorio_caducidad()
returns table(
  anuncio_id   uuid,
  usuario_email text,
  alias_publico text,
  caduca_el    timestamptz,
  cuerpo_texto text,
  municipio    text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    a.id,
    u.email::text,
    p.alias_publico,
    a.caduca_el,
    coalesce(c.codigo_oficial || ' — ' || c.denominacion, c.denominacion) as cuerpo_texto,
    m.nombre as municipio
  from public.anuncios a
  join auth.users u                on u.id = a.usuario_id
  join public.perfiles_usuario p   on p.id = a.usuario_id
  left join public.cuerpos c       on c.id = a.cuerpo_id
  left join public.municipios m    on m.codigo_ine = a.municipio_actual_codigo
  where a.estado = 'activo'
    and a.caduca_el > now()
    and a.caduca_el <= now() + interval '30 days'
    and not exists (
      select 1 from public.recordatorios_caducidad r where r.anuncio_id = a.id
    )
    and u.email_confirmed_at is not null
    and u.email not like '%@permutaes.test';
$$;

revoke all on function public.candidatos_recordatorio_caducidad() from public;
-- Solo authenticated podra invocarlo, y la propia ruta del cron usa la
-- service role o un fetch con cookie. Si quieres ser mas estricto,
-- restringe a service_role unicamente. Para alfa esto es suficiente
-- porque el endpoint de cron requiere CRON_SECRET en cabecera.
grant execute on function public.candidatos_recordatorio_caducidad() to authenticated, service_role;


-- ----- RPC: marcar enviado -----

create or replace function public.marcar_recordatorio_enviado(p_anuncio_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.recordatorios_caducidad (anuncio_id) values (p_anuncio_id)
  on conflict (anuncio_id) do nothing;
$$;

revoke all on function public.marcar_recordatorio_enviado(uuid) from public;
grant execute on function public.marcar_recordatorio_enviado(uuid) to authenticated, service_role;


-- ----- Cuando se renueva un anuncio (caduca_el avanza), borramos el -----
-- ----- recordatorio para que el ciclo vuelva a empezar.            -----

create or replace function public.tg_limpiar_recordatorio_si_se_renueva()
returns trigger
language plpgsql
as $$
begin
  if NEW.caduca_el > OLD.caduca_el then
    delete from public.recordatorios_caducidad where anuncio_id = NEW.id;
  end if;
  return NEW;
end;
$$;

create trigger anuncios_limpiar_recordatorio
  after update of caduca_el on public.anuncios
  for each row execute function public.tg_limpiar_recordatorio_si_se_renueva();

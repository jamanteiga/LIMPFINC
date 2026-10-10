-- =====================================================================
-- LIMPFINC · Tablas en Supabase
-- Ejecutar una sola vez en: Supabase › SQL Editor › New query › Run
-- Cada usuario solo ve y modifica sus propios datos (RLS).
-- =====================================================================

-- Fincas (linde, exclusiones, malla de árboles, plan… en el campo JSON "data")
create table if not exists public.fincas (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null,
  tipo        text not null default 'abierta',
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Trabajos realizados (sesiones con puntos GPS, resumen…)
create table if not exists public.trabajos (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  finca_id    text not null references public.fincas(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create index if not exists trabajos_finca_idx on public.trabajos(finca_id);

-- Catálogo de tractores
create table if not exists public.tractores (
  id            text primary key,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre        text not null,
  potencia_cv   numeric,
  ancho_m       numeric,
  longitud_m    numeric,
  radio_giro_m  numeric,
  deposito_l    numeric,
  marcha_atras  boolean default true,
  notas         text,
  updated_at    timestamptz not null default now()
);

-- Catálogo de aperos
create table if not exists public.aperos (
  id                text primary key,
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre            text not null,
  labor             text,          -- desbroce, trituracion, siega, grada, arado, cultivador, fresado, otro
  ancho_m           numeric,
  longitud_m        numeric,
  enganche          text,          -- suspendido / arrastrado
  distancia_gps_m   numeric,       -- iPhone → centro del apero
  desplazamiento_m  numeric,       -- lateral, + derecha
  solape_m          numeric,
  velocidad_kmh     numeric,
  consumo_lh        numeric,
  potencia_cv       numeric,
  tdf_rpm           integer,
  notas             text,
  updated_at        timestamptz not null default now()
);

-- Velocidades estándar por labor y vegetación
create table if not exists public.velocidades (
  id             text primary key,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  labor          text not null,
  vegetacion     text not null,     -- ligera / media / densa
  velocidad_kmh  numeric not null,
  notas          text,
  updated_at     timestamptz not null default now()
);

-- Ajustes generales, repostajes y filtros (una fila por usuario)
create table if not exists public.ajustes (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Seguridad: cada usuario solo accede a sus filas
do $$
declare t text;
begin
  foreach t in array array['fincas','trabajos','tractores','aperos','velocidades','ajustes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "propietario" on public.%I', t);
    execute format('create policy "propietario" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

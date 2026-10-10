-- =====================================================================
-- LIMPFINC v1.1 · Añade la tabla de fotos
-- Ejecutar una vez en: Supabase › SQL Editor › New query › Run
-- (si es una instalación nueva, basta con supabase_limpfinc.sql, que ya la incluye)
-- =====================================================================

-- Fotos de las fincas (v1.1). Imagen JPEG reducida en base64.
create table if not exists public.fotos (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  finca_id    text not null references public.fincas(id) on delete cascade,
  caption     text,
  lat         double precision,
  lon         double precision,
  img         text not null,
  fecha       timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists fotos_finca_idx on public.fotos(finca_id);
alter table public.fotos enable row level security;
drop policy if exists "propietario" on public.fotos;
create policy "propietario" on public.fotos for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.fotos to authenticated;

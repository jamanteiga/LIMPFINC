-- =====================================================================
-- LIMPFINC v2.0 · Tabla de PLANES numerados (Plan 1, Plan 2…)
-- Ejecutar una sola vez en: Supabase › SQL Editor › New query › Run
-- =====================================================================
create table if not exists public.planes (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  finca_id    text not null references public.fincas(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);
create index if not exists planes_finca_idx on public.planes(finca_id);
alter table public.planes enable row level security;
drop policy if exists "propietario" on public.planes;
create policy "propietario" on public.planes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.planes to authenticated;

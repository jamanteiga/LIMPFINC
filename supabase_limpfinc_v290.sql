-- LIMPFINC v2.9.0: registro de errores de la app (para revisar fallos del campo)
-- Ejecutar una vez en Supabase › SQL Editor › New query › Run
create table if not exists public.errores (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists errores_user_idx on public.errores(user_id, updated_at desc);
alter table public.errores enable row level security;
drop policy if exists "propietario" on public.errores;
create policy "propietario" on public.errores for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.errores to authenticated;
notify pgrst, 'reload schema';

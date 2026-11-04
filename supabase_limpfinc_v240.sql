-- LIMPFINC v2.4.0: tipo de máquina en el catálogo de tractores
-- Ejecutar una vez en Supabase › SQL Editor › New query › Run
alter table public.tractores add column if not exists tipo text;
notify pgrst, 'reload schema';

-- The marketplace RPC returns coordinates even for establishments that have
-- not been geocoded yet. Keep both fields nullable for legacy records.
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

NOTIFY pgrst, 'reload schema';

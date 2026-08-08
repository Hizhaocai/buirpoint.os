-- Table privileges are required in addition to RLS. RLS policies continue to
-- restrict cameras to their own profile and owners to permitted management.
grant select, update on table public.profiles to authenticated;

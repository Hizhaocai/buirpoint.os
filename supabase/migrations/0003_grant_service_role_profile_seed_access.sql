-- Local development seeding and trusted server-side administration use the
-- service_role. Keep ordinary application roles under RLS policies.
grant select, update on table public.profiles to service_role;

-- Keep SECURITY DEFINER functions out of the API-exposed public schema.
-- Both functions use fully-qualified references and an empty search_path.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, supabase_auth_admin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '')
  );
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;
grant execute on function private.handle_new_user() to supabase_auth_admin;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure private.handle_new_user();

drop policy if exists "Owners can read all profiles" on public.profiles;
drop policy if exists "Owners can update profiles" on public.profiles;
drop function if exists public.is_owner();

create function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
      and status = 'active'
  );
$$;

revoke all on function private.is_owner() from public;
grant execute on function private.is_owner() to authenticated;

create policy "Owners can read all profiles"
on public.profiles for select
to authenticated
using (private.is_owner());

create policy "Owners can update profiles"
on public.profiles for update
to authenticated
using (private.is_owner())
with check (private.is_owner());

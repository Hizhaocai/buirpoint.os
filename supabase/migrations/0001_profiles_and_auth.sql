-- Phase 1: identity and authorization foundation for a single studio.
create type public.user_role as enum ('owner', 'camera');
create type public.user_status as enum ('active', 'disabled');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  role public.user_role not null default 'camera',
  status public.user_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
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

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner' and status = 'active'
  );
$$;

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Owners can read all profiles"
on public.profiles for select
to authenticated
using (public.is_owner());

create policy "Owners can update profiles"
on public.profiles for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

-- Profiles are created only by the auth trigger. No client insert or delete policy exists.
-- Bootstrap the first owner after creating their auth user:
-- update public.profiles set role = 'owner' where email = 'owner@example.com';

-- Phase W6.1: Portfolio CMS foundation. This is intentionally independent from orders.
create type public.portfolio_work_status as enum ('draft', 'published', 'archived');
create type public.portfolio_content_type as enum ('text', 'image', 'video', 'embed');

create table public.portfolio_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.portfolio_works (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.portfolio_categories(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text,
  cover_path text,
  status public.portfolio_work_status not null default 'draft',
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.portfolio_credits (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.portfolio_works(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  credit_role text not null check (char_length(trim(credit_role)) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.portfolio_content (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.portfolio_works(id) on delete cascade,
  content_type public.portfolio_content_type not null,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index portfolio_categories_sort_order_idx on public.portfolio_categories (sort_order, name);
create index portfolio_works_category_id_idx on public.portfolio_works (category_id) where category_id is not null;
create index portfolio_works_status_published_at_idx on public.portfolio_works (status, published_at desc) where status = 'published';
create index portfolio_works_created_by_idx on public.portfolio_works (created_by, created_at desc);
create index portfolio_credits_work_sort_order_idx on public.portfolio_credits (work_id, sort_order);
create index portfolio_content_work_sort_order_idx on public.portfolio_content (work_id, sort_order);

create trigger portfolio_categories_set_updated_at
before update on public.portfolio_categories
for each row execute procedure public.set_updated_at();
create trigger portfolio_works_set_updated_at
before update on public.portfolio_works
for each row execute procedure public.set_updated_at();
create trigger portfolio_credits_set_updated_at
before update on public.portfolio_credits
for each row execute procedure public.set_updated_at();
create trigger portfolio_content_set_updated_at
before update on public.portfolio_content
for each row execute procedure public.set_updated_at();

-- Keep database permissions aligned with the application defaults. New accounts are
-- initialized with the camera defaults by the existing auth trigger replacement below.
update public.profiles
set permissions = permissions || case role
  when 'owner' then jsonb_build_object(
    'portfolio_view', true,
    'portfolio_create', true,
    'portfolio_edit', true,
    'portfolio_publish', true,
    'portfolio_delete', true
  )
  else jsonb_build_object(
    'portfolio_view', true,
    'portfolio_create', false,
    'portfolio_edit', false,
    'portfolio_publish', false,
    'portfolio_delete', false
  )
end;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, permissions)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
    jsonb_build_object(
      'portfolio_view', true,
      'portfolio_create', false,
      'portfolio_edit', false,
      'portfolio_publish', false,
      'portfolio_delete', false
    )
  );
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;
grant execute on function private.handle_new_user() to supabase_auth_admin;

alter table public.portfolio_categories enable row level security;
alter table public.portfolio_works enable row level security;
alter table public.portfolio_credits enable row level security;
alter table public.portfolio_content enable row level security;

-- Each policy checks an explicit Portfolio capability on an active profile. These
-- policies deliberately do not rely on private.is_active_member() alone.
create policy "Portfolio viewers can read categories"
on public.portfolio_categories for select to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_view')::boolean, false)
));
create policy "Portfolio creators can add categories"
on public.portfolio_categories for insert to authenticated
with check (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_create')::boolean, false)
));
create policy "Portfolio editors can update categories"
on public.portfolio_categories for update to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_edit')::boolean, false)
)) with check (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_edit')::boolean, false)
));
create policy "Portfolio deleters can remove categories"
on public.portfolio_categories for delete to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_delete')::boolean, false)
));

create policy "Portfolio viewers can read works"
on public.portfolio_works for select to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_view')::boolean, false)
));
create policy "Portfolio creators can add works"
on public.portfolio_works for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and coalesce((permissions ->> 'portfolio_create')::boolean, false)
  )
);
create policy "Portfolio editors can update non-published works"
on public.portfolio_works for update to authenticated
using (
  status <> 'published'
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and coalesce((permissions ->> 'portfolio_edit')::boolean, false)
  )
) with check (
  status <> 'published'
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and coalesce((permissions ->> 'portfolio_edit')::boolean, false)
  )
);
create policy "Portfolio publishers can update works"
on public.portfolio_works for update to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_publish')::boolean, false)
)) with check (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_publish')::boolean, false)
));
create policy "Portfolio deleters can remove works"
on public.portfolio_works for delete to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_delete')::boolean, false)
));

create policy "Portfolio viewers can read credits"
on public.portfolio_credits for select to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_view')::boolean, false)
));
create policy "Portfolio creators can add credits"
on public.portfolio_credits for insert to authenticated
with check (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_create')::boolean, false)
));
create policy "Portfolio editors can update credits"
on public.portfolio_credits for update to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_edit')::boolean, false)
)) with check (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_edit')::boolean, false)
));
create policy "Portfolio deleters can remove credits"
on public.portfolio_credits for delete to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_delete')::boolean, false)
));

create policy "Portfolio viewers can read content"
on public.portfolio_content for select to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_view')::boolean, false)
));
create policy "Portfolio creators can add content"
on public.portfolio_content for insert to authenticated
with check (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_create')::boolean, false)
));
create policy "Portfolio editors can update content"
on public.portfolio_content for update to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_edit')::boolean, false)
)) with check (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_edit')::boolean, false)
));
create policy "Portfolio deleters can remove content"
on public.portfolio_content for delete to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_delete')::boolean, false)
));

revoke all on public.portfolio_categories, public.portfolio_works, public.portfolio_credits, public.portfolio_content from public;
grant select, insert, update, delete on public.portfolio_categories, public.portfolio_works, public.portfolio_credits, public.portfolio_content to authenticated;

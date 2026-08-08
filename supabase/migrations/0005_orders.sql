-- Phase 2: the owner-managed order workspace.
create type public.order_status as enum ('draft', 'confirmed', 'completed', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  project_name text not null check (char_length(trim(project_name)) between 1 and 160),
  client_name text not null check (char_length(trim(client_name)) between 1 and 120),
  contact_name text,
  contact_phone text,
  shoot_date date,
  total_price numeric(12, 2) not null default 0 check (total_price >= 0),
  status public.order_status not null default 'draft',
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index orders_shoot_date_idx on public.orders (shoot_date);
create index orders_status_idx on public.orders (status);
create index orders_client_name_idx on public.orders (client_name);
create index orders_project_name_idx on public.orders (project_name);

create trigger orders_set_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

alter table public.orders enable row level security;

create policy "Owners can read orders"
on public.orders for select
to authenticated
using (private.is_owner());

create policy "Owners can create orders"
on public.orders for insert
to authenticated
with check (private.is_owner() and created_by = auth.uid());

create policy "Owners can update orders"
on public.orders for update
to authenticated
using (private.is_owner())
with check (private.is_owner());

create policy "Owners can delete orders"
on public.orders for delete
to authenticated
using (private.is_owner());

grant select, insert, update, delete on table public.orders to authenticated;

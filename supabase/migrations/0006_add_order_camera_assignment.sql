-- Phase 3: camera assignment remains an attribute of an order, never a separate schedule record.
alter table public.orders
add column assigned_camera_id uuid references public.profiles(id) on delete set null;

create index orders_assigned_camera_id_idx on public.orders (assigned_camera_id);
create index orders_shoot_date_assigned_camera_id_idx on public.orders (shoot_date, assigned_camera_id);

-- A deliberately narrow, derived read model for the team work calendar.
-- It stores no independent schedule data and never exposes customer, phone,
-- price, notes, or other sensitive order fields to cameras.
create view public.order_schedule_public
with (security_barrier = true)
as
select
  orders.id,
  orders.shoot_date,
  orders.project_name,
  orders.assigned_camera_id,
  coalesce(profiles.name, profiles.email) as assigned_camera_name,
  orders.status
from public.orders
left join public.profiles on profiles.id = orders.assigned_camera_id
where orders.shoot_date is not null;

revoke all on public.order_schedule_public from public;
grant select on public.order_schedule_public to authenticated;

-- Phase 5.1: wedding production metadata remains part of an order.
-- No partner, project, or production-board records are introduced.

create type public.order_shoot_status as enum ('pending', 'completed');
create type public.order_backup_status as enum ('pending', 'uploaded', 'confirmed');
create type public.order_editing_status as enum ('pending', 'editing', 'completed');
create type public.order_delivery_status as enum ('pending', 'delivered');

alter table public.orders
  add column wedding_company_name text check (wedding_company_name is null or char_length(trim(wedding_company_name)) between 1 and 120),
  add column shoot_location text check (shoot_location is null or char_length(trim(shoot_location)) between 1 and 240),
  add column shoot_status public.order_shoot_status not null default 'pending',
  add column backup_status public.order_backup_status not null default 'pending',
  add column editing_status public.order_editing_status not null default 'pending',
  add column delivery_status public.order_delivery_status not null default 'pending';

-- At the current scale a btree index is sufficient for exact channel lookup.
-- General substring search remains application-side and does not need pg_trgm.
create index orders_wedding_company_name_idx
on public.orders (wedding_company_name)
where wedding_company_name is not null;

-- These indexes directly support the three owner-facing production reminders.
create index orders_backup_attention_idx
on public.orders (shoot_date)
where status <> 'cancelled' and shoot_status = 'completed' and backup_status = 'pending';

create index orders_editing_attention_idx
on public.orders (shoot_date)
where status <> 'cancelled' and editing_status = 'editing';

create index orders_delivery_attention_idx
on public.orders (shoot_date)
where status <> 'cancelled' and editing_status = 'completed' and delivery_status = 'pending';

alter table public.order_logs drop constraint if exists order_logs_action_check;
alter table public.order_logs add constraint order_logs_action_check check (action in (
  'created', 'status_changed', 'shoot_date_changed', 'camera_changed',
  'price_changed', 'attachment_uploaded', 'attachment_deleted', 'deleted',
  'wedding_company_changed', 'shoot_location_changed', 'shoot_status_changed',
  'backup_status_changed', 'editing_status_changed', 'delivery_status_changed'
));

-- SECURITY INVOKER by default. This extends the existing business trigger and
-- does not expose a SECURITY DEFINER function to clients.
create or replace function private.log_order_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  old_camera jsonb;
  new_camera jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.order_logs (order_id, actor_id, action, new_value)
    values (new.id, auth.uid(), 'created', jsonb_build_object('project_name', new.project_name));
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.order_logs (order_id, actor_id, action, old_value)
    values (old.id, auth.uid(), 'deleted', jsonb_build_object('project_name', old.project_name));
    return old;
  end if;

  if old.status is distinct from new.status then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'status_changed', jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
  end if;
  if old.shoot_date is distinct from new.shoot_date then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'shoot_date_changed', jsonb_build_object('shoot_date', old.shoot_date), jsonb_build_object('shoot_date', new.shoot_date));
  end if;
  if old.total_price is distinct from new.total_price then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'price_changed', jsonb_build_object('total_price', old.total_price), jsonb_build_object('total_price', new.total_price));
  end if;
  if old.wedding_company_name is distinct from new.wedding_company_name then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'wedding_company_changed', jsonb_build_object('wedding_company_name', old.wedding_company_name), jsonb_build_object('wedding_company_name', new.wedding_company_name));
  end if;
  if old.shoot_location is distinct from new.shoot_location then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'shoot_location_changed', jsonb_build_object('shoot_location', old.shoot_location), jsonb_build_object('shoot_location', new.shoot_location));
  end if;
  if old.shoot_status is distinct from new.shoot_status then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'shoot_status_changed', jsonb_build_object('shoot_status', old.shoot_status), jsonb_build_object('shoot_status', new.shoot_status));
  end if;
  if old.backup_status is distinct from new.backup_status then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'backup_status_changed', jsonb_build_object('backup_status', old.backup_status), jsonb_build_object('backup_status', new.backup_status));
  end if;
  if old.editing_status is distinct from new.editing_status then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'editing_status_changed', jsonb_build_object('editing_status', old.editing_status), jsonb_build_object('editing_status', new.editing_status));
  end if;
  if old.delivery_status is distinct from new.delivery_status then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'delivery_status_changed', jsonb_build_object('delivery_status', old.delivery_status), jsonb_build_object('delivery_status', new.delivery_status));
  end if;
  if old.assigned_camera_id is distinct from new.assigned_camera_id then
    select jsonb_build_object('id', profiles.id, 'name', coalesce(profiles.name, profiles.email)) into old_camera from public.profiles where profiles.id = old.assigned_camera_id;
    select jsonb_build_object('id', profiles.id, 'name', coalesce(profiles.name, profiles.email)) into new_camera from public.profiles where profiles.id = new.assigned_camera_id;
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'camera_changed', coalesce(old_camera, 'null'::jsonb), coalesce(new_camera, 'null'::jsonb));
  end if;
  return new;
end;
$$;

revoke all on function private.log_order_change() from public, authenticated;

-- The team calendar receives only the operationally necessary location.
create or replace view public.order_schedule_public
with (security_barrier = true)
as
select
  orders.id,
  orders.shoot_date,
  orders.project_name,
  orders.assigned_camera_id,
  coalesce(profiles.name, profiles.email) as assigned_camera_name,
  orders.status,
  orders.shoot_location
from public.orders
left join public.profiles on profiles.id = orders.assigned_camera_id
where orders.shoot_date is not null;

revoke all on public.order_schedule_public from public;
grant select on public.order_schedule_public to authenticated;

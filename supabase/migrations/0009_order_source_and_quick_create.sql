-- Phase 5.2: source remains an order attribute, never a CRM record.
create type public.order_source_type as enum ('wedding_company', 'direct_customer');

alter table public.orders
  add column source_type public.order_source_type,
  add column source_name text;

-- Preserve Phase 5.1 attribution without inventing a partner record.
update public.orders
set
  source_type = case when wedding_company_name is not null then 'wedding_company'::public.order_source_type else 'direct_customer'::public.order_source_type end,
  source_name = coalesce(wedding_company_name, '直客');

alter table public.orders
  alter column source_type set default 'direct_customer',
  alter column source_type set not null,
  alter column source_name set default '直客',
  alter column source_name set not null,
  add constraint orders_source_name_length_check check (char_length(trim(source_name)) between 1 and 120),
  add constraint orders_source_type_name_check check (
    (source_type = 'wedding_company' and source_name <> '直客')
    or (source_type = 'direct_customer' and source_name = '直客')
  );

drop index if exists public.orders_wedding_company_name_idx;
alter table public.orders drop column wedding_company_name;

create index orders_source_type_source_name_idx
on public.orders (source_type, source_name);

alter table public.order_logs drop constraint if exists order_logs_action_check;
alter table public.order_logs add constraint order_logs_action_check check (action in (
  'created', 'status_changed', 'shoot_date_changed', 'camera_changed',
  'price_changed', 'attachment_uploaded', 'attachment_deleted', 'deleted',
  'wedding_company_changed', 'shoot_location_changed', 'shoot_status_changed',
  'backup_status_changed', 'editing_status_changed', 'delivery_status_changed',
  'source_changed'
));

-- SECURITY INVOKER by default. Existing wedding_company_changed history remains
-- readable; new source changes are recorded as a single business event.
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
  if old.source_type is distinct from new.source_type or old.source_name is distinct from new.source_name then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'source_changed', jsonb_build_object('source_type', old.source_type, 'source_name', old.source_name), jsonb_build_object('source_type', new.source_type, 'source_name', new.source_name));
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

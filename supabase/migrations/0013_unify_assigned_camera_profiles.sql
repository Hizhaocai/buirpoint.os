-- Phase 9.2.3: profiles remains the only source of assignable people.
-- orders.assigned_camera_id already has a foreign key to profiles(id), so no
-- second people table or data copy is introduced here.

-- New schedule reads and future camera-change log entries prefer the editable
-- display name. Existing log JSON deliberately remains untouched as history.
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
  if old.deleted_at is null and new.deleted_at is not null then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'deleted', jsonb_build_object('project_name', old.project_name), jsonb_build_object('deleted_at', new.deleted_at));
    return new;
  end if;
  if old.deleted_at is not null and new.deleted_at is null then
    insert into public.order_logs (order_id, actor_id, action, old_value)
    values (new.id, auth.uid(), 'restored', jsonb_build_object('deleted_at', old.deleted_at));
    return new;
  end if;
  if old.client_name is distinct from new.client_name or old.contact_name is distinct from new.contact_name or old.contact_phone is distinct from new.contact_phone then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value)
    values (new.id, auth.uid(), 'client_changed', jsonb_build_object('client_name', old.client_name, 'contact_name', old.contact_name, 'contact_phone', old.contact_phone), jsonb_build_object('client_name', new.client_name, 'contact_name', new.contact_name, 'contact_phone', new.contact_phone));
  end if;
  if old.status is distinct from new.status then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'status_changed', jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
  end if;
  if old.shoot_date is distinct from new.shoot_date then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'shoot_date_changed', jsonb_build_object('shoot_date', old.shoot_date), jsonb_build_object('shoot_date', new.shoot_date));
  end if;
  if old.total_price is distinct from new.total_price then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'price_changed', jsonb_build_object('total_price', old.total_price), jsonb_build_object('total_price', new.total_price));
  end if;
  if old.source_type is distinct from new.source_type or old.source_name is distinct from new.source_name then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'source_changed', jsonb_build_object('source_type', old.source_type, 'source_name', old.source_name), jsonb_build_object('source_type', new.source_type, 'source_name', new.source_name));
  end if;
  if old.shoot_location is distinct from new.shoot_location then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'shoot_location_changed', jsonb_build_object('shoot_location', old.shoot_location), jsonb_build_object('shoot_location', new.shoot_location));
  end if;
  if old.shoot_status is distinct from new.shoot_status then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'shoot_status_changed', jsonb_build_object('shoot_status', old.shoot_status), jsonb_build_object('shoot_status', new.shoot_status));
  end if;
  if old.backup_status is distinct from new.backup_status then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'backup_status_changed', jsonb_build_object('backup_status', old.backup_status), jsonb_build_object('backup_status', new.backup_status));
  end if;
  if old.editing_status is distinct from new.editing_status then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'editing_status_changed', jsonb_build_object('editing_status', old.editing_status), jsonb_build_object('editing_status', new.editing_status));
  end if;
  if old.delivery_status is distinct from new.delivery_status then
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'delivery_status_changed', jsonb_build_object('delivery_status', old.delivery_status), jsonb_build_object('delivery_status', new.delivery_status));
  end if;
  if old.assigned_camera_id is distinct from new.assigned_camera_id then
    select jsonb_build_object('id', profiles.id, 'name', coalesce(profiles.display_name, profiles.name, profiles.email)) into old_camera from public.profiles where profiles.id = old.assigned_camera_id;
    select jsonb_build_object('id', profiles.id, 'name', coalesce(profiles.display_name, profiles.name, profiles.email)) into new_camera from public.profiles where profiles.id = new.assigned_camera_id;
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'camera_changed', coalesce(old_camera, 'null'::jsonb), coalesce(new_camera, 'null'::jsonb));
  end if;
  return new;
end;
$$;

revoke all on function private.log_order_change() from public, authenticated;

create or replace view public.order_schedule_public
with (security_barrier = true, security_invoker = true)
as
select
  orders.id,
  orders.shoot_date,
  orders.project_name,
  orders.assigned_camera_id,
  coalesce(profiles.display_name, profiles.name, profiles.email) as assigned_camera_name,
  orders.status,
  orders.shoot_location
from public.orders
left join public.profiles on profiles.id = orders.assigned_camera_id
where orders.shoot_date is not null and orders.deleted_at is null;

revoke all on public.order_schedule_public from public;
grant select on public.order_schedule_public to authenticated;

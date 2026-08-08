-- Phase 9.2.4: one order can have one primary and multiple secondary cameras.
create type public.order_camera_role as enum ('primary', 'secondary');

create table public.order_camera_assignments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  camera_id uuid not null references public.profiles(id) on delete restrict,
  role public.order_camera_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (order_id, camera_id)
);

create unique index order_camera_assignments_one_primary_idx
  on public.order_camera_assignments (order_id)
  where role = 'primary';
create index order_camera_assignments_camera_id_idx
  on public.order_camera_assignments (camera_id, order_id);

-- Backfill the existing primary-camera compatibility field without changing orders.
insert into public.order_camera_assignments (order_id, camera_id, role)
select id, assigned_camera_id, 'primary'::public.order_camera_role
from public.orders
where assigned_camera_id is not null
on conflict (order_id, camera_id) do nothing;

alter table public.order_camera_assignments enable row level security;
create policy "Active members can read order camera assignments"
on public.order_camera_assignments for select to authenticated
using (private.is_active_member());
create policy "Active members can manage order camera assignments"
on public.order_camera_assignments for all to authenticated
using (private.is_active_member())
with check (private.is_active_member());
grant select, insert, update, delete on public.order_camera_assignments to authenticated;

-- Database-level validation keeps direct writes consistent with the same rule
-- enforced by Server Actions: only active camera profiles may be assigned.
create function private.validate_order_camera_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.camera_id and role = 'camera' and status = 'active'
  ) then
    raise exception 'order camera assignment requires an active camera profile';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_order_camera_assignment() from public, authenticated;
create trigger order_camera_assignments_validate_camera
before insert or update of camera_id on public.order_camera_assignments
for each row execute procedure private.validate_order_camera_assignment();

-- Keep the legacy primary field synchronized when assignments change.
create function private.sync_order_primary_camera()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_order_id uuid := coalesce(new.order_id, old.order_id);
  primary_camera_id uuid;
begin
  if pg_trigger_depth() > 1 then return null; end if;
  select camera_id into primary_camera_id
  from public.order_camera_assignments
  where order_id = target_order_id and role = 'primary';
  update public.orders
  set assigned_camera_id = primary_camera_id
  where id = target_order_id and assigned_camera_id is distinct from primary_camera_id;
  return null;
end;
$$;
revoke all on function private.sync_order_primary_camera() from public, authenticated;
create trigger order_camera_assignments_sync_primary
after insert or update or delete on public.order_camera_assignments
for each row execute procedure private.sync_order_primary_camera();

alter table public.order_logs drop constraint if exists order_logs_action_check;
alter table public.order_logs add constraint order_logs_action_check check (action in (
  'created', 'client_changed', 'status_changed', 'shoot_date_changed', 'camera_changed',
  'camera_assigned', 'camera_removed', 'price_changed', 'attachment_uploaded', 'attachment_deleted',
  'deleted', 'restored', 'wedding_company_changed', 'shoot_location_changed', 'shoot_status_changed',
  'backup_status_changed', 'editing_status_changed', 'delivery_status_changed', 'source_changed'
));

create function private.log_order_camera_assignment_change()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  person jsonb;
begin
  if tg_op = 'INSERT' then
    select jsonb_build_object('id', id, 'name', coalesce(display_name, name, email), 'role', new.role)
    into person from public.profiles where id = new.camera_id;
    insert into public.order_logs (order_id, actor_id, action, new_value)
    values (new.order_id, auth.uid(), 'camera_assigned', coalesce(person, jsonb_build_object('id', new.camera_id, 'role', new.role)));
  elsif tg_op = 'DELETE' then
    select jsonb_build_object('id', id, 'name', coalesce(display_name, name, email), 'role', old.role)
    into person from public.profiles where id = old.camera_id;
    insert into public.order_logs (order_id, actor_id, action, old_value)
    values (old.order_id, auth.uid(), 'camera_removed', coalesce(person, jsonb_build_object('id', old.camera_id, 'role', old.role)));
  end if;
  return null;
end;
$$;
revoke all on function private.log_order_camera_assignment_change() from public, authenticated;
create trigger order_camera_assignments_log_change
after insert or delete on public.order_camera_assignments
for each row execute procedure private.log_order_camera_assignment_change();

create or replace view public.order_schedule_public
with (security_barrier = true, security_invoker = true)
as
select
  orders.id,
  orders.shoot_date,
  orders.project_name,
  orders.assigned_camera_id,
  coalesce(string_agg(concat(coalesce(camera_profile.display_name, camera_profile.name, camera_profile.email), chr(65288), case assignments.role when 'primary' then chr(20027) else chr(21103) end, chr(65289)), ' · ' order by case assignments.role when 'primary' then 0 else 1 end) filter (where assignments.camera_id is not null), coalesce(primary_profile.display_name, primary_profile.name, primary_profile.email)) as assigned_camera_name,
  orders.status,
  orders.shoot_location,
  coalesce(array_agg(assignments.camera_id order by case assignments.role when 'primary' then 0 else 1 end) filter (where assignments.camera_id is not null), '{}'::uuid[]) as assigned_camera_ids,
  coalesce(jsonb_agg(jsonb_build_object('id', assignments.camera_id, 'name', coalesce(camera_profile.display_name, camera_profile.name, camera_profile.email), 'role', assignments.role) order by case assignments.role when 'primary' then 0 else 1 end) filter (where assignments.camera_id is not null), '[]'::jsonb) as assigned_cameras
from public.orders
left join public.profiles primary_profile on primary_profile.id = orders.assigned_camera_id
left join public.order_camera_assignments assignments on assignments.order_id = orders.id
left join public.profiles camera_profile on camera_profile.id = assignments.camera_id
where orders.shoot_date is not null and orders.deleted_at is null
group by orders.id, primary_profile.id;

revoke all on public.order_schedule_public from public;
grant select on public.order_schedule_public to authenticated;

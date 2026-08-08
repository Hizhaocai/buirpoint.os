-- Phase 7: active studio members collaborate on the same order archive.
-- This remains a single-studio trust model; no teams, tasks, or people module is introduced.

create function private.is_active_member()
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
      and status = 'active'
  );
$$;

revoke all on function private.is_active_member() from public;
grant execute on function private.is_active_member() to authenticated;

alter table public.orders
  add column deleted_at timestamptz,
  add column deleted_by uuid references public.profiles(id) on delete set null;

create index orders_active_shoot_date_idx on public.orders (shoot_date) where deleted_at is null;
create index orders_archived_at_idx on public.orders (deleted_at desc) where deleted_at is not null;

-- A creator is an audit fact. It is set on insert and cannot be reassigned.
create function private.prevent_order_creator_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'orders.created_by cannot be changed';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_order_creator_change() from public, authenticated;
create trigger orders_prevent_creator_change before update on public.orders for each row execute procedure private.prevent_order_creator_change();

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Owners can read all profiles" on public.profiles;
create policy "Active members can read studio profiles" on public.profiles for select to authenticated using (private.is_active_member());

drop policy if exists "Owners can read orders" on public.orders;
drop policy if exists "Owners can create orders" on public.orders;
drop policy if exists "Owners can update orders" on public.orders;
drop policy if exists "Owners can delete orders" on public.orders;
create policy "Active members can read orders" on public.orders for select to authenticated using (private.is_active_member());
create policy "Active members can create orders" on public.orders for insert to authenticated with check (private.is_active_member() and created_by = (select auth.uid()));
create policy "Active members can update orders" on public.orders for update to authenticated using (private.is_active_member()) with check (private.is_active_member());

revoke delete on table public.orders from authenticated;
grant select, insert, update on table public.orders to authenticated;

drop policy if exists "Owners can read order attachments" on public.order_attachments;
drop policy if exists "Owners can add order attachments" on public.order_attachments;
drop policy if exists "Owners can delete order attachments" on public.order_attachments;
drop policy if exists "Owners can read order logs" on public.order_logs;
drop policy if exists "Owners can append order logs" on public.order_logs;
create policy "Active members can read order attachments" on public.order_attachments for select to authenticated using (private.is_active_member());
create policy "Active members can add order attachments" on public.order_attachments for insert to authenticated with check (private.is_active_member() and uploaded_by = (select auth.uid()));
create policy "Active members can delete order attachments" on public.order_attachments for delete to authenticated using (private.is_active_member());
create policy "Active members can read order logs" on public.order_logs for select to authenticated using (private.is_active_member());
create policy "Active members can append order logs" on public.order_logs for insert to authenticated with check (private.is_active_member() and actor_id = (select auth.uid()));

drop policy if exists "Owners can read order attachment objects" on storage.objects;
drop policy if exists "Owners can add order attachment objects" on storage.objects;
drop policy if exists "Owners can delete order attachment objects" on storage.objects;
create policy "Active members can read order attachment objects" on storage.objects for select to authenticated using (bucket_id = 'order-attachments' and private.is_active_member());
create policy "Active members can add order attachment objects" on storage.objects for insert to authenticated with check (bucket_id = 'order-attachments' and private.is_active_member());
create policy "Active members can delete order attachment objects" on storage.objects for delete to authenticated using (bucket_id = 'order-attachments' and private.is_active_member());

alter table public.order_logs drop constraint if exists order_logs_action_check;
alter table public.order_logs add constraint order_logs_action_check check (action in (
  'created', 'client_changed', 'status_changed', 'shoot_date_changed', 'camera_changed',
  'price_changed', 'attachment_uploaded', 'attachment_deleted', 'deleted', 'restored',
  'wedding_company_changed', 'shoot_location_changed', 'shoot_status_changed',
  'backup_status_changed', 'editing_status_changed', 'delivery_status_changed', 'source_changed'
));

-- SECURITY INVOKER business logging: no API-exposed security-definer business function.
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
    select jsonb_build_object('id', profiles.id, 'name', coalesce(profiles.name, profiles.email)) into old_camera from public.profiles where profiles.id = old.assigned_camera_id;
    select jsonb_build_object('id', profiles.id, 'name', coalesce(profiles.name, profiles.email)) into new_camera from public.profiles where profiles.id = new.assigned_camera_id;
    insert into public.order_logs (order_id, actor_id, action, old_value, new_value) values (new.id, auth.uid(), 'camera_changed', coalesce(old_camera, 'null'::jsonb), coalesce(new_camera, 'null'::jsonb));
  end if;
  return new;
end;
$$;

revoke all on function private.log_order_change() from public, authenticated;

create or replace view public.order_schedule_public
with (security_barrier = true, security_invoker = true)
as
select orders.id, orders.shoot_date, orders.project_name, orders.assigned_camera_id,
  coalesce(profiles.name, profiles.email) as assigned_camera_name, orders.status, orders.shoot_location
from public.orders
left join public.profiles on profiles.id = orders.assigned_camera_id
where orders.shoot_date is not null and orders.deleted_at is null;

revoke all on public.order_schedule_public from public;
grant select on public.order_schedule_public to authenticated;

-- Phase 4: attachments and business-only order history.
-- Attachments remain children of orders; no file-center schema is introduced.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-attachments',
  'order-attachments',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.order_attachments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  file_name text not null check (char_length(trim(file_name)) between 1 and 255),
  file_path text not null unique,
  file_type text not null,
  file_size bigint not null check (file_size >= 0 and file_size <= 20971520),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index order_attachments_order_id_created_at_idx
on public.order_attachments (order_id, created_at desc);

create table public.order_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action in (
    'created', 'status_changed', 'shoot_date_changed', 'camera_changed',
    'price_changed', 'attachment_uploaded', 'attachment_deleted', 'deleted'
  )),
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index order_logs_order_id_created_at_idx
on public.order_logs (order_id, created_at desc);

alter table public.order_attachments enable row level security;
alter table public.order_logs enable row level security;

create policy "Owners can read order attachments" on public.order_attachments for select to authenticated using (private.is_owner());
create policy "Owners can add order attachments" on public.order_attachments for insert to authenticated with check (private.is_owner() and uploaded_by = (select auth.uid()));
create policy "Owners can delete order attachments" on public.order_attachments for delete to authenticated using (private.is_owner());
create policy "Owners can read order logs" on public.order_logs for select to authenticated using (private.is_owner());

-- Server actions and the order trigger append records under the acting owner's JWT.
-- Updates and deletes deliberately have no policy: logs are append-only.
create policy "Owners can append order logs" on public.order_logs for insert to authenticated with check (private.is_owner() and actor_id = (select auth.uid()));

grant select, insert, delete on public.order_attachments to authenticated;
grant select, insert on public.order_logs to authenticated;

create policy "Owners can read order attachment objects" on storage.objects for select to authenticated using (bucket_id = 'order-attachments' and private.is_owner());
create policy "Owners can add order attachment objects" on storage.objects for insert to authenticated with check (bucket_id = 'order-attachments' and private.is_owner());
create policy "Owners can delete order attachment objects" on storage.objects for delete to authenticated using (bucket_id = 'order-attachments' and private.is_owner());

-- SECURITY INVOKER by default. This tracks business changes only and creates
-- no API-exposed SECURITY DEFINER business function.
create function private.log_order_change()
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

create trigger orders_log_business_changes
after insert or update or delete on public.orders
for each row execute procedure private.log_order_change();

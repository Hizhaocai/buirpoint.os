-- Phase 9.2.2: member display names and explicit capability overrides.
alter table public.profiles
  add column display_name text,
  add column permissions jsonb not null default '{}'::jsonb,
  add constraint profiles_permissions_is_object check (jsonb_typeof(permissions) = 'object');

update public.profiles
set display_name = nullif(trim(name), '')
where display_name is null;

update public.profiles
set permissions = case
  when role = 'owner' then jsonb_build_object(
    'orders_view', true,
    'orders_create', true,
    'orders_edit', true,
    'orders_delete', true,
    'attachments_manage', true,
    'members_manage', true
  )
  else jsonb_build_object(
    'orders_view', true,
    'orders_create', true,
    'orders_edit', true,
    'orders_delete', false,
    'attachments_manage', true,
    'members_manage', false
  )
end
where permissions = '{}'::jsonb;

-- Phase W6.2.3: fixed About content records in the existing portfolio_content table.
-- The first version deliberately stores one plain-text value in content JSONB.

alter table public.portfolio_content
  alter column work_id drop not null,
  alter column content_type type text using content_type::text,
  add column title text,
  add column subtitle text,
  add column image_url text,
  add column published boolean not null default false;

alter table public.portfolio_content
  add constraint portfolio_content_type_check
    check (content_type in ('text', 'image', 'video', 'embed', 'story', 'concept', 'process', 'faq')),
  add constraint portfolio_content_title_length_check
    check (title is null or char_length(trim(title)) between 1 and 160),
  add constraint portfolio_content_subtitle_length_check
    check (subtitle is null or char_length(trim(subtitle)) between 1 and 300),
  add constraint portfolio_content_image_url_length_check
    check (image_url is null or char_length(image_url) <= 2000),
  add constraint portfolio_about_content_shape_check
    check (
      content_type not in ('story', 'concept', 'process', 'faq')
      or (
        work_id is null
        and title is not null
        and coalesce(jsonb_typeof(content -> 'text'), '') = 'string'
        and char_length(content ->> 'text') <= 20000
      )
    ),
  add constraint portfolio_work_content_scope_check
    check (content_type in ('story', 'concept', 'process', 'faq') or work_id is not null);

create unique index portfolio_about_content_type_unique_idx
on public.portfolio_content (content_type)
where content_type in ('story', 'concept', 'process', 'faq');

insert into public.portfolio_content (work_id, content_type, title, subtitle, content, image_url, published, sort_order)
values
  (null, 'story', '关于我们', null, jsonb_build_object('text', ''), null, false, 10),
  (null, 'concept', '拍摄理念', null, jsonb_build_object('text', ''), null, false, 20),
  (null, 'process', '服务流程', null, jsonb_build_object('text', ''), null, false, 30),
  (null, 'faq', '常见问题', null, jsonb_build_object('text', ''), null, false, 40);

drop policy "Portfolio editors can update content" on public.portfolio_content;
create policy "Portfolio content writers can update content"
on public.portfolio_content for update to authenticated
using (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and (
      coalesce((permissions ->> 'portfolio_edit')::boolean, false)
      or coalesce((permissions ->> 'portfolio_publish')::boolean, false)
    )
)) with check (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and (
      coalesce((permissions ->> 'portfolio_edit')::boolean, false)
      or coalesce((permissions ->> 'portfolio_publish')::boolean, false)
    )
));

drop policy "Portfolio deleters can remove content" on public.portfolio_content;
create policy "Portfolio deleters can remove work content"
on public.portfolio_content for delete to authenticated
using (
  content_type not in ('story', 'concept', 'process', 'faq')
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and coalesce((permissions ->> 'portfolio_delete')::boolean, false)
  )
);

create function private.enforce_portfolio_content_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  can_edit boolean := false;
  can_publish boolean := false;
begin
  if auth.uid() is null then
    return new;
  end if;

  if old.id is distinct from new.id
    or old.work_id is distinct from new.work_id
    or old.content_type is distinct from new.content_type
    or old.sort_order is distinct from new.sort_order then
    raise exception 'Portfolio content identity fields are immutable.' using errcode = '42501';
  end if;

  select
    coalesce((permissions ->> 'portfolio_edit')::boolean, false),
    coalesce((permissions ->> 'portfolio_publish')::boolean, false)
  into can_edit, can_publish
  from public.profiles
  where id = auth.uid() and status = 'active';

  if (
    old.title is distinct from new.title
    or old.subtitle is distinct from new.subtitle
    or old.content is distinct from new.content
    or old.image_url is distinct from new.image_url
  ) and not can_edit then
    raise exception 'portfolio_edit permission required.' using errcode = '42501';
  end if;

  if old.published is distinct from new.published and not can_publish then
    raise exception 'portfolio_publish permission required.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_portfolio_content_changes() from public, authenticated;

create trigger portfolio_content_enforce_changes
before update on public.portfolio_content
for each row execute procedure private.enforce_portfolio_content_changes();


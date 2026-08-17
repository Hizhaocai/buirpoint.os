-- Phase W6.2.2: public Portfolio media with permission-gated writes.
-- Portfolio media is intentionally isolated from private order attachments.

alter table public.portfolio_works
  add column cover_url text,
  add column video_url text;

alter table public.portfolio_works
  add constraint portfolio_works_cover_url_check
    check (cover_url is null or cover_url like '%/storage/v1/object/public/portfolio-media/covers/%'),
  add constraint portfolio_works_video_url_check
    check (video_url is null or video_url like '%/storage/v1/object/public/portfolio-media/videos/%');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-media',
  'portfolio-media',
  true,
  20971520,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Portfolio editors can upload media objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'portfolio-media'
  and (storage.foldername(name))[1] in ('covers', 'videos')
  and exists (
    select 1 from public.portfolio_works
    where id::text = (storage.foldername(name))[2]
  )
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and coalesce((permissions ->> 'portfolio_edit')::boolean, false)
  )
);

-- Storage remove first queries the target rows, so authenticated Portfolio
-- viewers need object SELECT in addition to the bucket's public read endpoint.
create policy "Portfolio viewers can read media objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'portfolio-media'
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and coalesce((permissions ->> 'portfolio_view')::boolean, false)
  )
);

create policy "Portfolio deleters can remove media objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'portfolio-media'
  and (storage.foldername(name))[1] in ('covers', 'videos')
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and coalesce((permissions ->> 'portfolio_delete')::boolean, false)
  )
);

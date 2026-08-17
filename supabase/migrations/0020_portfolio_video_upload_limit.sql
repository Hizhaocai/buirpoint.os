-- Phase W8.8.0.1: allow Portfolio videos up to 200 MB.
-- The bucket remains public, keeps its MIME allow-list, and retains the
-- existing permission policies. Cover images remain capped at 5 MB by CMS.

do $$
begin
  update storage.buckets
  set file_size_limit = 209715200
  where id = 'portfolio-media';

  if not found then
    raise exception 'portfolio-media bucket does not exist.';
  end if;
end
$$;

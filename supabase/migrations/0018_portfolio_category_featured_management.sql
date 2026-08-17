-- Phase W6.2.4: category lifecycle and home featured ordering.

alter table public.portfolio_categories
  add column status text not null default 'active',
  add constraint portfolio_categories_status_check
    check (status in ('active', 'inactive'));

alter table public.portfolio_works
  add column featured boolean not null default false,
  add column sort_order integer not null default 0,
  add constraint portfolio_works_sort_order_check
    check (sort_order between 0 and 9999),
  add constraint portfolio_works_featured_published_check
    check (not featured or status = 'published');

alter table public.portfolio_works
  drop constraint portfolio_works_category_id_fkey,
  add constraint portfolio_works_category_id_fkey
    foreign key (category_id) references public.portfolio_categories(id) on delete restrict;

create index portfolio_categories_status_sort_idx
on public.portfolio_categories (status, sort_order, name);

create index portfolio_works_featured_sort_idx
on public.portfolio_works (sort_order, published_at desc)
where featured = true and status = 'published';

drop policy "Portfolio creators can add categories" on public.portfolio_categories;
create policy "Portfolio editors can add categories"
on public.portfolio_categories for insert to authenticated
with check (exists (
  select 1 from public.profiles
  where id = (select auth.uid())
    and status = 'active'
    and coalesce((permissions ->> 'portfolio_edit')::boolean, false)
));

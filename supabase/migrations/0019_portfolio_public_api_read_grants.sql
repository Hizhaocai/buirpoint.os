-- Phase W7: allow the server-only miniapp API client to read Portfolio data.
-- RLS remains enabled and no browser/anonymous role receives table access.

grant select on table
  public.portfolio_categories,
  public.portfolio_works,
  public.portfolio_credits,
  public.portfolio_content
to service_role;

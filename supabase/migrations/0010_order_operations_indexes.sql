-- Phase 6: derived operational reads need no new business tables.
create index orders_contact_phone_idx
on public.orders (contact_phone)
where contact_phone is not null;

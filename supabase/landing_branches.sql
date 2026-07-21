-- Owner-managed "Our Branches" landing section. Supports two modes per row:
-- (A) linked  — branch_id references an existing core `branches` row; display
--     data (name/city/address/phone/logo) is read LIVE via the `public_branches`
--     view, never snapshotted.
-- (B) standalone — branch_id is null; this row's own name/address/city/phone/
--     photo_url/lat/lng columns are used directly.
-- Mode is decided by the CMS UI (branch_id set or not), not by a DB constraint.
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "uuid-ossp";

create table if not exists public.landing_branches (
  id uuid not null default uuid_generate_v4(),
  sort_order integer not null default 0,
  branch_id uuid references public.branches(id) on delete set null,
  name text,
  address text,
  city text,
  phone text,
  photo_url text,
  lat double precision,
  lng double precision,
  updated_at timestamp with time zone not null default now(),
  constraint landing_branches_pkey primary key (id)
);

drop trigger if exists set_landing_branches_updated_at on public.landing_branches;
create trigger set_landing_branches_updated_at
before update on public.landing_branches
for each row execute function public.set_updated_at();

alter table public.landing_branches enable row level security;

drop policy if exists public_select_landing_branches on public.landing_branches;
create policy public_select_landing_branches
on public.landing_branches for select to anon, authenticated using (true);

drop policy if exists owner_write_landing_branches on public.landing_branches;
create policy owner_write_landing_branches
on public.landing_branches for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

-- Extend the existing public-safe branch view (was: id, name, city) with the
-- columns the landing card needs, without exposing sensitive core columns
-- (bank_*, wa_numbers) to anon/public readers.
create or replace view public.public_branches as
select id, name, city, address, phone, logo_url
from public.branches;

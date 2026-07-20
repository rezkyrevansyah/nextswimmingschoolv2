-- Owner-managed "Trusted by Our Partners" logo list
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "uuid-ossp";

create table if not exists public.landing_partners (
  id uuid not null default uuid_generate_v4(),
  sort_order integer not null default 0,
  name text not null default '',
  logo_url text,
  website_url text,
  updated_at timestamp with time zone not null default now(),
  constraint landing_partners_pkey primary key (id)
);

drop trigger if exists set_landing_partners_updated_at on public.landing_partners;
create trigger set_landing_partners_updated_at
before update on public.landing_partners
for each row execute function public.set_updated_at();

alter table public.landing_partners enable row level security;

drop policy if exists public_select_landing_partners on public.landing_partners;
create policy public_select_landing_partners
on public.landing_partners for select to anon, authenticated using (true);

drop policy if exists owner_write_landing_partners on public.landing_partners;
create policy owner_write_landing_partners
on public.landing_partners for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

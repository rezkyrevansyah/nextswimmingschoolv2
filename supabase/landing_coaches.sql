-- Owner-managed "Our Coach" landing section (photo + name only).
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "uuid-ossp";

create table if not exists public.landing_coaches (
  id uuid not null default uuid_generate_v4(),
  sort_order integer not null default 0,
  name text not null default '',
  photo_url text,
  updated_at timestamp with time zone not null default now(),
  constraint landing_coaches_pkey primary key (id)
);

drop trigger if exists set_landing_coaches_updated_at on public.landing_coaches;
create trigger set_landing_coaches_updated_at
before update on public.landing_coaches
for each row execute function public.set_updated_at();

alter table public.landing_coaches enable row level security;

drop policy if exists public_select_landing_coaches on public.landing_coaches;
create policy public_select_landing_coaches
on public.landing_coaches for select to anon, authenticated using (true);

drop policy if exists owner_write_landing_coaches on public.landing_coaches;
create policy owner_write_landing_coaches
on public.landing_coaches for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

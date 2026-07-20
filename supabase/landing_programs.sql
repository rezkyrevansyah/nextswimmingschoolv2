-- Owner-managed "Our Programs" landing section (independent of the classes table).
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "uuid-ossp";

create table if not exists public.landing_programs (
  id uuid not null default uuid_generate_v4(),
  sort_order integer not null default 0,
  name text not null default '',
  description text,
  class_type text not null default 'reguler' check (class_type in ('reguler', 'private')),
  photo_url text,
  updated_at timestamp with time zone not null default now(),
  constraint landing_programs_pkey primary key (id)
);

drop trigger if exists set_landing_programs_updated_at on public.landing_programs;
create trigger set_landing_programs_updated_at
before update on public.landing_programs
for each row execute function public.set_updated_at();

alter table public.landing_programs enable row level security;

drop policy if exists public_select_landing_programs on public.landing_programs;
create policy public_select_landing_programs
on public.landing_programs for select to anon, authenticated using (true);

drop policy if exists owner_write_landing_programs on public.landing_programs;
create policy owner_write_landing_programs
on public.landing_programs for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

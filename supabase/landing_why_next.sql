-- Owner-managed "Why Next" landing section (icon + title + description).
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "uuid-ossp";

create table if not exists public.landing_why_next (
  id uuid not null default uuid_generate_v4(),
  sort_order integer not null default 0,
  icon text not null default 'shield',
  title text not null default '',
  description text,
  updated_at timestamp with time zone not null default now(),
  constraint landing_why_next_pkey primary key (id)
);

drop trigger if exists set_landing_why_next_updated_at on public.landing_why_next;
create trigger set_landing_why_next_updated_at
before update on public.landing_why_next
for each row execute function public.set_updated_at();

alter table public.landing_why_next enable row level security;

drop policy if exists public_select_landing_why_next on public.landing_why_next;
create policy public_select_landing_why_next
on public.landing_why_next for select to anon, authenticated using (true);

drop policy if exists owner_write_landing_why_next on public.landing_why_next;
create policy owner_write_landing_why_next
on public.landing_why_next for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

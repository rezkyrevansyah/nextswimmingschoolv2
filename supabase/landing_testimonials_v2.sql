-- Owner-managed "Testimonials" landing section.
-- Named _v2 to avoid colliding with the old landing_testimonials table, which
-- has no dedicated migration file or verified RLS policy.
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "uuid-ossp";

create table if not exists public.landing_testimonials_v2 (
  id uuid not null default uuid_generate_v4(),
  sort_order integer not null default 0,
  name text not null default '',
  role text,
  body_text text not null default '',
  avatar_url text,
  rating smallint not null default 5 check (rating >= 1 and rating <= 5),
  updated_at timestamp with time zone not null default now(),
  constraint landing_testimonials_v2_pkey primary key (id)
);

drop trigger if exists set_landing_testimonials_v2_updated_at on public.landing_testimonials_v2;
create trigger set_landing_testimonials_v2_updated_at
before update on public.landing_testimonials_v2
for each row execute function public.set_updated_at();

alter table public.landing_testimonials_v2 enable row level security;

drop policy if exists public_select_landing_testimonials_v2 on public.landing_testimonials_v2;
create policy public_select_landing_testimonials_v2
on public.landing_testimonials_v2 for select to anon, authenticated using (true);

drop policy if exists owner_write_landing_testimonials_v2 on public.landing_testimonials_v2;
create policy owner_write_landing_testimonials_v2
on public.landing_testimonials_v2 for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

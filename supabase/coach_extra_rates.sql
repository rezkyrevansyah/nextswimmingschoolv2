-- Tarif Extra: global per-coach extra-session rate (outside regular classes)
-- Run this in Supabase SQL Editor. Safe to rerun.

create table if not exists public.coach_extra_rates (
  id uuid not null default gen_random_uuid(),
  coach_id uuid not null unique references public.profiles(id),
  rate_per_session integer not null check (rate_per_session > 0),
  set_by uuid references public.profiles(id),
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  constraint coach_extra_rates_pkey primary key (id)
);

alter table public.coach_extra_rates enable row level security;

drop policy if exists owner_all_coach_extra_rates on public.coach_extra_rates;
create policy owner_all_coach_extra_rates
on public.coach_extra_rates for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists coach_select_own_extra_rate on public.coach_extra_rates;
create policy coach_select_own_extra_rate
on public.coach_extra_rates for select to authenticated
using (coach_id = auth.uid());

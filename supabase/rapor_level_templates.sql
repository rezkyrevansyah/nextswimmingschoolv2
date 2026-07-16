-- Owner-managed rapor level templates: criteria + personal best time targets,
-- keyed by level (Level A, Level B, ...) instead of by class.
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "pgcrypto";

-- ── rapor_levels ─────────────────────────────────────────────────────────────
create table if not exists public.rapor_levels (
  id uuid not null default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  constraint rapor_levels_pkey primary key (id),
  constraint rapor_levels_name_key unique (name)
);

-- ── rapor_level_criteria ─────────────────────────────────────────────────────
create table if not exists public.rapor_level_criteria (
  id uuid not null default gen_random_uuid(),
  level_id uuid not null,
  label text not null,
  kind text not null check (kind = any (array['score_10'::text, 'score_100'::text, 'choice'::text, 'text'::text])),
  options text[],
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint rapor_level_criteria_pkey primary key (id),
  constraint rapor_level_criteria_level_id_fkey foreign key (level_id) references public.rapor_levels(id) on delete cascade
);

-- ── rapor_level_best_times ───────────────────────────────────────────────────
-- Defines which (stroke, distance) columns appear on a level's Personal Best
-- Time table, and the optional standard/target time coaches compare against.
create table if not exists public.rapor_level_best_times (
  id uuid not null default gen_random_uuid(),
  level_id uuid not null,
  stroke text not null,
  distance integer not null check (distance > 0),
  target_time_seconds numeric check (target_time_seconds is null or target_time_seconds > 0),
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint rapor_level_best_times_pkey primary key (id),
  constraint rapor_level_best_times_level_id_fkey foreign key (level_id) references public.rapor_levels(id) on delete cascade
);

-- ── rapor_entries.level_id ───────────────────────────────────────────────────
-- Nullable FK alongside the existing free-text `level` column. `level` stays
-- as the denormalized display name (kept in sync by application code on
-- save) so printRapor.ts and every existing reader of `rapor_entries.level`
-- needs no change. `level_id` is the source of truth for which template to
-- load when re-opening an entry.
alter table public.rapor_entries add column if not exists level_id uuid references public.rapor_levels(id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.rapor_levels enable row level security;
alter table public.rapor_level_criteria enable row level security;
alter table public.rapor_level_best_times enable row level security;

drop policy if exists owner_all_rapor_levels on public.rapor_levels;
create policy owner_all_rapor_levels
on public.rapor_levels
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists authenticated_read_rapor_levels on public.rapor_levels;
create policy authenticated_read_rapor_levels
on public.rapor_levels
for select
to authenticated
using (true);

drop policy if exists owner_all_rapor_level_criteria on public.rapor_level_criteria;
create policy owner_all_rapor_level_criteria
on public.rapor_level_criteria
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists authenticated_read_rapor_level_criteria on public.rapor_level_criteria;
create policy authenticated_read_rapor_level_criteria
on public.rapor_level_criteria
for select
to authenticated
using (true);

drop policy if exists owner_all_rapor_level_best_times on public.rapor_level_best_times;
create policy owner_all_rapor_level_best_times
on public.rapor_level_best_times
for all
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists authenticated_read_rapor_level_best_times on public.rapor_level_best_times;
create policy authenticated_read_rapor_level_best_times
on public.rapor_level_best_times
for select
to authenticated
using (true);

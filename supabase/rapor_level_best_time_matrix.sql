-- Redesigns "Personal Best Time" from one-row-per-(stroke,distance) into a
-- proper level-scoped matrix: distances are columns, strokes are rows, and
-- an optional target time exists per (stroke, distance) cell. Splits the
-- old `rapor_level_best_times` table into 3 tables and backfills existing
-- data losslessly. Run this in Supabase SQL Editor. Safe to rerun (idempotent
-- up through Step D — Step F is a manual, commented-out safety gate).

-- ── Step A: new tables + RLS ─────────────────────────────────────────────────

create table if not exists public.rapor_level_distances (
  id uuid not null default gen_random_uuid(),
  level_id uuid not null,
  distance integer not null check (distance > 0),
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint rapor_level_distances_pkey primary key (id),
  constraint rapor_level_distances_level_id_fkey foreign key (level_id) references public.rapor_levels(id) on delete cascade,
  constraint rapor_level_distances_level_distance_key unique (level_id, distance)
);

create table if not exists public.rapor_level_strokes (
  id uuid not null default gen_random_uuid(),
  level_id uuid not null,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint rapor_level_strokes_pkey primary key (id),
  constraint rapor_level_strokes_level_id_fkey foreign key (level_id) references public.rapor_levels(id) on delete cascade
);
create unique index if not exists rapor_level_strokes_level_name_ci_key
  on public.rapor_level_strokes (level_id, lower(name));

create table if not exists public.rapor_level_best_time_targets (
  id uuid not null default gen_random_uuid(),
  level_id uuid not null,
  stroke_id uuid not null,
  distance_id uuid not null,
  target_time_seconds numeric check (target_time_seconds is null or target_time_seconds > 0),
  created_at timestamp with time zone not null default now(),
  constraint rapor_level_best_time_targets_pkey primary key (id),
  constraint rapor_level_best_time_targets_level_id_fkey foreign key (level_id) references public.rapor_levels(id) on delete cascade,
  constraint rapor_level_best_time_targets_stroke_id_fkey foreign key (stroke_id) references public.rapor_level_strokes(id) on delete cascade,
  constraint rapor_level_best_time_targets_distance_id_fkey foreign key (distance_id) references public.rapor_level_distances(id) on delete cascade,
  constraint rapor_level_best_time_targets_cell_key unique (stroke_id, distance_id)
);

alter table public.rapor_level_distances enable row level security;
alter table public.rapor_level_strokes enable row level security;
alter table public.rapor_level_best_time_targets enable row level security;

drop policy if exists authenticated_select_rapor_level_distances on public.rapor_level_distances;
create policy authenticated_select_rapor_level_distances
on public.rapor_level_distances for select to authenticated using (true);
drop policy if exists owner_write_rapor_level_distances on public.rapor_level_distances;
create policy owner_write_rapor_level_distances
on public.rapor_level_distances for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists authenticated_select_rapor_level_strokes on public.rapor_level_strokes;
create policy authenticated_select_rapor_level_strokes
on public.rapor_level_strokes for select to authenticated using (true);
drop policy if exists owner_write_rapor_level_strokes on public.rapor_level_strokes;
create policy owner_write_rapor_level_strokes
on public.rapor_level_strokes for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists authenticated_select_rapor_level_best_time_targets on public.rapor_level_best_time_targets;
create policy authenticated_select_rapor_level_best_time_targets
on public.rapor_level_best_time_targets for select to authenticated using (true);
drop policy if exists owner_write_rapor_level_best_time_targets on public.rapor_level_best_time_targets;
create policy owner_write_rapor_level_best_time_targets
on public.rapor_level_best_time_targets for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

-- ── Step B: backfill distances — one row per distinct (level_id, distance) ──

insert into public.rapor_level_distances (level_id, distance, sort_order)
select level_id, distance, min(sort_order)
from public.rapor_level_best_times
group by level_id, distance
on conflict (level_id, distance) do nothing;

-- ── Step C: backfill strokes — one row per distinct (level_id, lower(stroke)),
--    keeping the first-seen original casing ────────────────────────────────

insert into public.rapor_level_strokes (level_id, name, sort_order)
select distinct on (level_id, lower(stroke)) level_id, stroke, min_sort
from (
  select level_id, stroke,
         min(sort_order) over (partition by level_id, lower(stroke)) as min_sort
  from public.rapor_level_best_times
) x
on conflict do nothing;

-- ── Step D: backfill targets — join old rows back to the new stroke/distance
--    ids, carrying target_time_seconds over verbatim ──────────────────────

insert into public.rapor_level_best_time_targets (level_id, stroke_id, distance_id, target_time_seconds)
select o.level_id, s.id, d.id, o.target_time_seconds
from public.rapor_level_best_times o
join public.rapor_level_strokes s on s.level_id = o.level_id and lower(s.name) = lower(o.stroke)
join public.rapor_level_distances d on d.level_id = o.level_id and d.distance = o.distance
on conflict (stroke_id, distance_id) do nothing;

-- ── Step E: verify row counts match before dropping the old table (run manually) ──
-- select count(*) from public.rapor_level_best_times;
-- select count(*) from public.rapor_level_best_time_targets;

-- ── Step F: drop the old table — UNCOMMENT ONLY after verifying Step E's counts
--    match and the Owner CMS shows correct data for existing levels ────────
-- drop table if exists public.rapor_level_best_times;

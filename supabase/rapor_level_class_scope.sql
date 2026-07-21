-- Lets a rapor level be scoped to specific classes instead of always being
-- available to every class. `all_classes` (default true) preserves today's
-- behavior for every existing level with zero migration effort; the junction
-- table is only consulted when a level opts into `all_classes = false`.
-- Run this in Supabase SQL Editor. Safe to rerun.

alter table public.rapor_levels
  add column if not exists all_classes boolean not null default true;

create table if not exists public.rapor_level_classes (
  level_id uuid not null references public.rapor_levels(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  constraint rapor_level_classes_pkey primary key (level_id, class_id)
);

alter table public.rapor_level_classes enable row level security;

drop policy if exists authenticated_select_rapor_level_classes on public.rapor_level_classes;
create policy authenticated_select_rapor_level_classes
on public.rapor_level_classes for select to authenticated using (true);

drop policy if exists owner_write_rapor_level_classes on public.rapor_level_classes;
create policy owner_write_rapor_level_classes
on public.rapor_level_classes for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

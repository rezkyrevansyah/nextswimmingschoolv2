-- Owner-managed landing images
-- Run this in Supabase SQL Editor. Safe to rerun.

create extension if not exists "uuid-ossp";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.landing_hero add column if not exists bg_image_url text;
alter table public.classes add column if not exists photo_url text;
alter table public.classes add column if not exists show_on_landing boolean not null default false;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists show_on_landing boolean not null default false;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists certifications text[];
alter table public.landing_testimonials add column if not exists avatar_url text;
alter table public.landing_testimonials add column if not exists rating smallint;

create table if not exists public.landing_safety (
  id integer not null default 1 check (id = 1),
  section_label text not null default 'Keamanan',
  headline text not null default '',
  body_text text not null default '',
  photo_url text,
  updated_at timestamp with time zone not null default now(),
  constraint landing_safety_pkey primary key (id)
);

create table if not exists public.landing_safety_points (
  id uuid not null default uuid_generate_v4(),
  sort_order integer not null default 0,
  text text not null default '',
  updated_at timestamp with time zone not null default now(),
  constraint landing_safety_points_pkey primary key (id)
);

create table if not exists public.landing_facilities (
  id integer not null default 1 check (id = 1),
  section_label text not null default 'Fasilitas',
  headline text not null default 'Fasilitas yang mendukung\nkenyamanan belajar.',
  updated_at timestamp with time zone not null default now(),
  constraint landing_facilities_pkey primary key (id)
);

create table if not exists public.landing_facility_items (
  id uuid not null default uuid_generate_v4(),
  sort_order integer not null default 0,
  title text not null default '',
  body_text text not null default '',
  photo_url text,
  updated_at timestamp with time zone not null default now(),
  constraint landing_facility_items_pkey primary key (id)
);

create table if not exists public.landing_process_steps (
  id uuid not null default uuid_generate_v4(),
  sort_order integer not null default 0,
  title text not null default '',
  description text not null default '',
  updated_at timestamp with time zone not null default now(),
  constraint landing_process_steps_pkey primary key (id)
);

create table if not exists public.landing_gallery (
  id uuid not null default uuid_generate_v4(),
  sort_order integer not null default 0,
  photo_url text,
  alt_text text,
  updated_at timestamp with time zone not null default now(),
  constraint landing_gallery_pkey primary key (id)
);

create table if not exists public.trial_bookings (
  id uuid not null default uuid_generate_v4(),
  name text not null,
  phone text not null,
  age_group text,
  branch_id uuid references public.branches(id),
  preferred_time text,
  status text not null default 'new',
  created_at timestamp with time zone not null default now(),
  constraint trial_bookings_pkey primary key (id)
);

insert into public.landing_safety (id, section_label, headline, body_text)
values (
  1,
  'Standar Keamanan',
  'Keamanan bukan slogan, tapi SOP.',
  'Setiap cabang mengikuti standar pengawasan air yang sama, diaudit berkala oleh admin pusat.'
)
on conflict (id) do nothing;

insert into public.landing_facilities (id, section_label, headline)
values (1, 'Fasilitas', 'Fasilitas yang mendukung\nkenyamanan belajar.')
on conflict (id) do nothing;

insert into public.landing_facility_items (sort_order, title, body_text)
select 0, 'Kolam bersih, terawat, semi-private.', 'Kualitas air dicek berkala, suhu terjaga nyaman untuk anak, dan area kolam tidak dicampur dengan pengunjung umum saat jam kelas.'
where not exists (select 1 from public.landing_facility_items);

insert into public.landing_facility_items (sort_order, title, body_text)
select 1, 'Pilih cabang terdekat dari rumah Anda.', 'Tersedia di beberapa lokasi. Jadwal dan level kelas terintegrasi antar cabang, cukup satu akun untuk semua.'
where (select count(*) from public.landing_facility_items) = 1;

do $$
declare
  t text;
begin
  foreach t in array array[
    'landing_safety',
    'landing_safety_points',
    'landing_facilities',
    'landing_facility_items',
    'landing_process_steps',
    'landing_gallery'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', t, t);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'landing_hero',
    'landing_hero_stats',
    'landing_whyus',
    'landing_whyus_cards',
    'landing_testimonials',
    'landing_faqs',
    'landing_finalcta',
    'landing_config',
    'landing_nav_links',
    'landing_safety',
    'landing_safety_points',
    'landing_facilities',
    'landing_facility_items',
    'landing_process_steps',
    'landing_gallery'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'public_select_' || t, t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', 'public_select_' || t, t);
    execute format('drop policy if exists %I on public.%I', 'owner_write_' || t, t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''owner'')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = ''owner''))',
      'owner_write_' || t,
      t
    );
  end loop;
end $$;

alter table public.trial_bookings enable row level security;
drop policy if exists public_insert_trial_bookings on public.trial_bookings;
create policy public_insert_trial_bookings
on public.trial_bookings
for insert
to anon, authenticated
with check (true);

drop policy if exists owner_read_trial_bookings on public.trial_bookings;
create policy owner_read_trial_bookings
on public.trial_bookings
for select
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists owner_update_classes_landing on public.classes;
create policy owner_update_classes_landing
on public.classes
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

drop policy if exists owner_update_profiles_landing on public.profiles;
create policy owner_update_profiles_landing
on public.profiles
for update
to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner'));

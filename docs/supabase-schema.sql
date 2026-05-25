-- =============================================================================
-- Next Swimming School — Supabase SQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Order matters — run top to bottom in one shot.
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for full-text search on names

-- ── Enums ─────────────────────────────────────────────────────────────────────
create type user_role        as enum ('owner', 'admin', 'coach', 'member', 'school');
create type member_type      as enum ('reguler', 'private', 'school_affiliate');
create type member_status    as enum ('active', 'suspended', 'archived');
create type coach_status     as enum ('active', 'suspended', 'archived');
create type attendance_method as enum ('selfie', 'qr', 'manual');
create type attendance_status as enum ('hadir', 'izin', 'sakit', 'tidak_hadir');
create type payment_status   as enum ('unpaid', 'partial', 'paid', 'free', 'school_covered');
create type leave_status     as enum ('pending', 'approved', 'rejected');
create type leave_type       as enum ('izin', 'sakit', 'ujian', 'lainnya');
create type invoice_status   as enum ('pending', 'paid');
create type cert_status      as enum ('pending', 'approved', 'rejected');
create type bill_type        as enum ('monthly', 'package', 'custom');


-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- ── 1. Branches ───────────────────────────────────────────────────────────────
create table branches (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  lat         double precision,
  lng         double precision,
  wa_numbers  text[]   not null default '{}',
  logo_url    text,
  created_at  timestamptz not null default now()
);

-- ── 2. Profiles (extends auth.users 1-to-1) ──────────────────────────────────
-- Created automatically via trigger on auth.users insert.
create table profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  role                   user_role not null default 'member',
  branch_id              uuid references branches(id) on delete set null,
  full_name              text not null default '',
  nick_name              text,
  phone                  text,
  avatar_url             text,
  gender                 text check (gender in ('male','female')),
  birth_date             date,
  address                text,
  bio                    text,
  specialization         text,
  bank_name              text,
  bank_account           text,
  bank_holder            text,
  education_level        text,
  education_institution  text,
  health_notes           text,
  is_profile_complete    boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, full_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'member'),
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Keep updated_at current
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();


-- ── 3. Schools (affiliating institutions) ────────────────────────────────────
create table schools (
  id          uuid primary key default uuid_generate_v4(),
  branch_id   uuid not null references branches(id) on delete cascade,
  profile_id  uuid references profiles(id) on delete set null, -- school user account
  name        text not null,
  email       text,
  created_at  timestamptz not null default now()
);


-- ── 4. Classes ────────────────────────────────────────────────────────────────
create table classes (
  id                  uuid primary key default uuid_generate_v4(),
  branch_id           uuid not null references branches(id) on delete cascade,
  name                text not null,
  description         text,
  goal                text,
  photo_url           text,
  capacity            int not null default 15,
  enrolled            int not null default 0,       -- denormalized counter
  sessions_per_week   int not null default 3,
  sessions_per_month  int not null default 12,
  schedule_days       text[] not null default '{}', -- ['Senin','Rabu','Jumat']
  time_start          time not null,
  time_end            time not null,
  location_name       text,
  price_monthly       int not null default 0,
  age_min             int,
  age_max             int,
  show_landing        boolean not null default false,
  status              text not null default 'active' check (status in ('active','archived')),
  spreadsheet_filled  boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ── 4a. Class ↔ Coach (many-to-many) ─────────────────────────────────────────
create table class_coaches (
  class_id    uuid not null references classes(id) on delete cascade,
  coach_id    uuid not null references profiles(id) on delete cascade,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (class_id, coach_id)
);

-- ── 4b. Rapor / assessment criteria per class ────────────────────────────────
create table class_criteria (
  id          uuid primary key default uuid_generate_v4(),
  class_id    uuid not null references classes(id) on delete cascade,
  label       text not null,
  kind        text not null check (kind in ('score_10','score_100','choice','text')),
  options     text[],          -- for kind='choice'
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);


-- ── 5. Members ────────────────────────────────────────────────────────────────
create table members (
  id                  uuid primary key default uuid_generate_v4(),
  profile_id          uuid not null references profiles(id) on delete cascade,
  branch_id           uuid not null references branches(id),
  type                member_type not null default 'reguler',
  status              member_status not null default 'active',
  suspend_until       date,
  suspend_reason      text,
  school_id           uuid references schools(id) on delete set null,
  date_start          date not null default current_date,
  qr_code             text not null unique default uuid_generate_v4()::text,
  remaining_sessions  int,
  total_sessions      int,
  pay_status          payment_status not null default 'unpaid',
  admin_notes         text,
  created_at          timestamptz not null default now()
);

-- ── 5a. Member ↔ Class (many-to-many) ────────────────────────────────────────
create table member_classes (
  member_id   uuid not null references members(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (member_id, class_id)
);

-- Keep enrolled counter in sync
create or replace function update_class_enrolled()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update classes set enrolled = enrolled + 1 where id = new.class_id;
  elsif (tg_op = 'DELETE') then
    update classes set enrolled = greatest(enrolled - 1, 0) where id = old.class_id;
  end if;
  return null;
end;
$$;

create trigger member_classes_enrolled
  after insert or delete on member_classes
  for each row execute procedure update_class_enrolled();


-- ── 6. Certifications (coach) ─────────────────────────────────────────────────
create table certifications (
  id          uuid primary key default uuid_generate_v4(),
  coach_id    uuid not null references profiles(id) on delete cascade,
  name        text not null,
  valid_from  date,
  valid_until date,
  no_expiry   boolean not null default false,
  photo_url   text,
  status      cert_status not null default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now()
);


-- =============================================================================
-- ATTENDANCE
-- =============================================================================

-- ── 7. Coach Attendance ───────────────────────────────────────────────────────
create table coach_attendances (
  id               uuid primary key default uuid_generate_v4(),
  coach_id         uuid not null references profiles(id),
  class_id         uuid not null references classes(id),
  branch_id        uuid not null references branches(id),
  session_date     date not null,
  clock_in_at      timestamptz not null default now(),
  selfie_url       text,
  distance_meters  int,
  is_manual        boolean not null default false,
  manual_by        uuid references profiles(id), -- admin who entered it
  manual_reason    text,
  created_at       timestamptz not null default now(),
  unique (coach_id, class_id, session_date)
);

-- ── 8. Member Attendance ──────────────────────────────────────────────────────
create table member_attendances (
  id            uuid primary key default uuid_generate_v4(),
  member_id     uuid not null references members(id),
  class_id      uuid not null references classes(id),
  session_date  date not null,
  status        attendance_status not null default 'hadir',
  method        attendance_method,
  marked_by     uuid references profiles(id), -- coach or admin
  created_at    timestamptz not null default now(),
  unique (member_id, class_id, session_date)
);

-- Decrement remaining_sessions for private members on attendance
create or replace function decrement_private_sessions()
returns trigger language plpgsql as $$
begin
  if new.status = 'hadir' then
    update members
    set remaining_sessions = greatest(coalesce(remaining_sessions, 0) - 1, 0)
    where id = new.member_id and type = 'private';
  end if;
  return new;
end;
$$;

create trigger private_sessions_decrement
  after insert on member_attendances
  for each row execute procedure decrement_private_sessions();


-- =============================================================================
-- LEAVE / IZIN
-- =============================================================================

-- ── 9. Coach Leave ────────────────────────────────────────────────────────────
create table coach_leaves (
  id              uuid primary key default uuid_generate_v4(),
  coach_id        uuid not null references profiles(id),
  type            leave_type not null,
  reason          text,
  date_from       date not null,
  date_to         date not null,
  substitute_id   uuid references profiles(id),
  status          leave_status not null default 'pending',
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  reject_reason   text,
  created_by_admin boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ── 9a. Coach leave ↔ affected classes ───────────────────────────────────────
create table coach_leave_classes (
  leave_id  uuid not null references coach_leaves(id) on delete cascade,
  class_id  uuid not null references classes(id) on delete cascade,
  primary key (leave_id, class_id)
);

-- ── 10. Member Leave ──────────────────────────────────────────────────────────
create table member_leaves (
  id               uuid primary key default uuid_generate_v4(),
  member_id        uuid not null references members(id),
  type             leave_type not null,
  reason           text,
  date_from        date not null,
  date_to          date not null,
  status           leave_status not null default 'pending',
  reviewed_by      uuid references profiles(id),
  reviewed_at      timestamptz,
  reject_reason    text,
  created_by_admin boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ── 10a. Member leave ↔ affected classes ─────────────────────────────────────
create table member_leave_classes (
  leave_id  uuid not null references member_leaves(id) on delete cascade,
  class_id  uuid not null references classes(id) on delete cascade,
  primary key (leave_id, class_id)
);


-- =============================================================================
-- BILLING
-- =============================================================================

-- ── 11. Bills (tagihan member) ────────────────────────────────────────────────
create table bills (
  id              uuid primary key default uuid_generate_v4(),
  member_id       uuid not null references members(id),
  class_id        uuid references classes(id),
  branch_id       uuid not null references branches(id),
  type            bill_type not null default 'monthly',
  period_label    text not null,          -- e.g. "Mei 2026" or "Paket 6 Sesi"
  amount          int not null,
  discount        int not null default 0,
  discount_reason text,
  total           int generated always as (amount - discount) stored,
  status          payment_status not null default 'unpaid',
  paid_at         timestamptz,
  paid_method     text,                   -- 'transfer' | 'cash' | 'other'
  proof_url       text,
  verified_by     uuid references profiles(id),
  admin_notes     text,
  created_at      timestamptz not null default now()
);


-- ── 12. Coach Invoices ────────────────────────────────────────────────────────
create table coach_invoices (
  id            uuid primary key default uuid_generate_v4(),
  coach_id      uuid not null references profiles(id),
  branch_id     uuid not null references branches(id),
  period_label  text not null,
  total_amount  int not null,
  status        invoice_status not null default 'pending',
  pdf_url       text,
  created_at    timestamptz not null default now()
);

create table coach_invoice_items (
  id          uuid primary key default uuid_generate_v4(),
  invoice_id  uuid not null references coach_invoices(id) on delete cascade,
  class_id    uuid not null references classes(id),
  session_count int not null,
  rate        int not null,
  subtotal    int generated always as (session_count * rate) stored
);

-- ── 13. Coach Rates (per-coach override from owner) ──────────────────────────
create table coach_rates (
  id          uuid primary key default uuid_generate_v4(),
  coach_id    uuid not null references profiles(id),
  class_id    uuid not null references classes(id),
  rate        int not null,
  set_by      uuid references profiles(id),
  created_at  timestamptz not null default now(),
  unique (coach_id, class_id)
);


-- =============================================================================
-- COMMUNICATION
-- =============================================================================

-- ── 14. Announcements ─────────────────────────────────────────────────────────
create table announcements (
  id          uuid primary key default uuid_generate_v4(),
  branch_id   uuid not null references branches(id) on delete cascade,
  created_by  uuid not null references profiles(id),
  title       text not null,
  body        text not null,
  target_all  boolean not null default true,
  active      boolean not null default true,
  valid_from  date not null default current_date,
  valid_until date,
  created_at  timestamptz not null default now()
);

create table announcement_classes (
  announcement_id uuid not null references announcements(id) on delete cascade,
  class_id        uuid not null references classes(id) on delete cascade,
  primary key (announcement_id, class_id)
);

-- ── 15. Notifications ─────────────────────────────────────────────────────────
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null,
  body        text,
  icon        text not null default 'bell',
  kind        text not null default 'info' check (kind in ('info','warn','danger','success')),
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);


-- =============================================================================
-- RAPOR
-- =============================================================================

-- ── 16. Rapor Periods ─────────────────────────────────────────────────────────
create table rapor_periods (
  id          uuid primary key default uuid_generate_v4(),
  branch_id   uuid not null references branches(id) on delete cascade,
  label       text not null,              -- "Semester 1 — 2026"
  date_from   date not null,
  date_to     date not null,
  is_open     boolean not null default true,
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

-- ── 17. Rapor Entries (one per member per period per class) ──────────────────
create table rapor_entries (
  id          uuid primary key default uuid_generate_v4(),
  period_id   uuid not null references rapor_periods(id) on delete cascade,
  member_id   uuid not null references members(id),
  class_id    uuid not null references classes(id),
  coach_id    uuid not null references profiles(id),
  scores      jsonb not null default '{}',  -- { criterion_id: value }
  notes       text,
  filled_at   timestamptz,
  locked      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (period_id, member_id, class_id)
);

-- ── 18. Member Reviews (of coach, after rapor) ───────────────────────────────
create table member_reviews (
  id          uuid primary key default uuid_generate_v4(),
  rapor_id    uuid not null references rapor_entries(id) on delete cascade,
  member_id   uuid not null references members(id),
  coach_id    uuid not null references profiles(id),
  stars       int not null check (stars between 1 and 5),
  message     text,
  created_at  timestamptz not null default now(),
  unique (rapor_id, member_id)
);


-- =============================================================================
-- REGISTRATION APPROVEMENT
-- =============================================================================

create table registrations (
  id              uuid primary key default uuid_generate_v4(),
  branch_id       uuid references branches(id),
  full_name       text not null,
  birth_date      date,
  gender          text,
  phone           text,
  phone_owner     text check (phone_owner in ('self','parent')),
  parent_name     text,
  parent_phone    text,
  address         text,
  health_notes    text,
  status          text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  proof_url       text,
  member_id       uuid references members(id),  -- set after approve
  created_at      timestamptz not null default now()
);


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table branches           enable row level security;
alter table profiles           enable row level security;
alter table schools            enable row level security;
alter table classes            enable row level security;
alter table class_coaches      enable row level security;
alter table class_criteria     enable row level security;
alter table members            enable row level security;
alter table member_classes     enable row level security;
alter table certifications     enable row level security;
alter table coach_attendances  enable row level security;
alter table member_attendances enable row level security;
alter table coach_leaves       enable row level security;
alter table coach_leave_classes enable row level security;
alter table member_leaves      enable row level security;
alter table member_leave_classes enable row level security;
alter table bills              enable row level security;
alter table coach_invoices     enable row level security;
alter table coach_invoice_items enable row level security;
alter table coach_rates        enable row level security;
alter table announcements      enable row level security;
alter table announcement_classes enable row level security;
alter table notifications      enable row level security;
alter table rapor_periods      enable row level security;
alter table rapor_entries      enable row level security;
alter table member_reviews     enable row level security;
alter table registrations      enable row level security;

-- ── Helper function: get current user role ───────────────────────────────────
create or replace function auth_role()
returns user_role language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_branch_id()
returns uuid language sql stable security definer as $$
  select branch_id from profiles where id = auth.uid()
$$;

-- ── Profiles ─────────────────────────────────────────────────────────────────
-- Users can read & update their own profile.
create policy "profiles: own read"   on profiles for select using (id = auth.uid());
create policy "profiles: own update" on profiles for update using (id = auth.uid());
-- Admins can read profiles in their branch.
create policy "profiles: admin read" on profiles for select
  using (auth_role() in ('admin','owner') and (branch_id = auth_branch_id() or auth_role() = 'owner'));

-- ── Branches ─────────────────────────────────────────────────────────────────
create policy "branches: public read"  on branches for select using (true);
create policy "branches: owner write"  on branches for all
  using (auth_role() = 'owner') with check (auth_role() = 'owner');

-- ── Classes ──────────────────────────────────────────────────────────────────
create policy "classes: public read"   on classes for select using (true);
create policy "classes: admin write"   on classes for all
  using (auth_role() in ('admin','owner') and (branch_id = auth_branch_id() or auth_role() = 'owner'))
  with check (auth_role() in ('admin','owner') and (branch_id = auth_branch_id() or auth_role() = 'owner'));

-- ── Members ──────────────────────────────────────────────────────────────────
create policy "members: own read"      on members for select using (profile_id = auth.uid());
create policy "members: admin read"    on members for select
  using (auth_role() in ('admin','owner','coach') and (branch_id = auth_branch_id() or auth_role() = 'owner'));
create policy "members: admin write"   on members for all
  using (auth_role() in ('admin','owner') and (branch_id = auth_branch_id() or auth_role() = 'owner'))
  with check (auth_role() in ('admin','owner') and (branch_id = auth_branch_id() or auth_role() = 'owner'));

-- ── Notifications ─────────────────────────────────────────────────────────────
create policy "notifications: own"     on notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Bills ────────────────────────────────────────────────────────────────────
create policy "bills: member read"     on bills for select
  using (member_id in (select id from members where profile_id = auth.uid()));
create policy "bills: admin all"       on bills for all
  using (auth_role() in ('admin','owner') and (branch_id = auth_branch_id() or auth_role() = 'owner'))
  with check (auth_role() in ('admin','owner') and (branch_id = auth_branch_id() or auth_role() = 'owner'));

-- ── Coach Attendances ─────────────────────────────────────────────────────────
create policy "coach_att: own read"    on coach_attendances for select using (coach_id = auth.uid());
create policy "coach_att: own insert"  on coach_attendances for insert with check (coach_id = auth.uid());
create policy "coach_att: admin all"   on coach_attendances for all
  using (auth_role() in ('admin','owner')) with check (auth_role() in ('admin','owner'));

-- ── Member Attendances ────────────────────────────────────────────────────────
create policy "member_att: member read" on member_attendances for select
  using (member_id in (select id from members where profile_id = auth.uid()));
create policy "member_att: coach write" on member_attendances for insert
  with check (auth_role() = 'coach');
create policy "member_att: admin all"   on member_attendances for all
  using (auth_role() in ('admin','owner')) with check (auth_role() in ('admin','owner'));

-- ── Rapor ─────────────────────────────────────────────────────────────────────
create policy "rapor: member read"     on rapor_entries for select
  using (member_id in (select id from members where profile_id = auth.uid()));
create policy "rapor: coach write"     on rapor_entries for all
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy "rapor: admin read"      on rapor_entries for select using (auth_role() in ('admin','owner'));

-- ── Registrations ─────────────────────────────────────────────────────────────
create policy "reg: insert public"     on registrations for insert with check (true);
create policy "reg: admin all"         on registrations for all
  using (auth_role() in ('admin','owner')) with check (auth_role() in ('admin','owner'));


-- =============================================================================
-- REALTIME
-- Enable realtime for tables that need live updates.
-- =============================================================================

-- Run these after creating the tables (they use supabase's realtime schema).
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table member_attendances;
alter publication supabase_realtime add table coach_attendances;
alter publication supabase_realtime add table bills;
alter publication supabase_realtime add table announcements;


-- =============================================================================
-- INDEXES (performance)
-- =============================================================================

create index on branches          (name);
create index on profiles          (role);
create index on profiles          (branch_id);
create index on classes           (branch_id);
create index on classes           (show_landing) where show_landing = true;
create index on members           (branch_id);
create index on members           (profile_id);
create index on members           (status);
create index on members           (school_id);
create index on member_classes    (class_id);
create index on member_classes    (member_id);
create index on class_coaches     (coach_id);
create index on coach_attendances (coach_id, session_date);
create index on coach_attendances (class_id, session_date);
create index on member_attendances(member_id, session_date);
create index on member_attendances(class_id, session_date);
create index on bills             (member_id);
create index on bills             (branch_id, status);
create index on notifications     (user_id, read);
create index on rapor_entries     (period_id);
create index on rapor_entries     (member_id);
create index on registrations     (status);
create index on profiles          using gin (full_name gin_trgm_ops);
create index on registrations     using gin (full_name gin_trgm_ops);

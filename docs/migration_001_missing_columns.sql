-- =============================================================================
-- MIGRATION 001 — Add missing columns required by the app
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Safe to run multiple times (uses IF NOT EXISTS / DO $$ blocks)
-- =============================================================================


-- ── 1. branches — add city, phone, status ─────────────────────────────────────
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS city   text,
  ADD COLUMN IF NOT EXISTS phone  text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status = ANY (ARRAY['active'::text, 'archived'::text]));


-- ── 2. classes — add schedule_time, show_on_landing, goals ───────────────────
-- These are plain columns backfilled from existing data.
-- schedule_time kept in sync by trigger below.
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS schedule_time  text,
  ADD COLUMN IF NOT EXISTS show_on_landing boolean,
  ADD COLUMN IF NOT EXISTS goals          text;

-- Backfill
UPDATE public.classes
SET
  schedule_time   = to_char(time_start, 'HH24:MI'),
  show_on_landing = show_landing,
  goals           = goal
WHERE schedule_time IS NULL;

-- Trigger: keep schedule_time / show_on_landing / goals in sync on writes
CREATE OR REPLACE FUNCTION sync_class_alias_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.schedule_time   := to_char(NEW.time_start, 'HH24:MI');
  NEW.show_on_landing := NEW.show_landing;
  NEW.goals           := NEW.goal;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS classes_sync_aliases ON public.classes;
CREATE TRIGGER classes_sync_aliases
  BEFORE INSERT OR UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION sync_class_alias_columns();


-- ── 3. coach_attendances — add clock_in_time, status, manual_note ─────────────
ALTER TABLE public.coach_attendances
  ADD COLUMN IF NOT EXISTS clock_in_time text,
  ADD COLUMN IF NOT EXISTS status        text NOT NULL DEFAULT 'present'
    CHECK (status = ANY (ARRAY['present'::text, 'absent'::text])),
  ADD COLUMN IF NOT EXISTS manual_note   text,
  ADD COLUMN IF NOT EXISTS invoice_id    uuid
    REFERENCES public.coach_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS coach_attendances_invoice_id_idx
  ON public.coach_attendances (invoice_id);

-- Backfill clock_in_time for existing rows
UPDATE public.coach_attendances
SET clock_in_time = to_char(clock_in_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI')
WHERE clock_in_time IS NULL;

-- Trigger: auto-set clock_in_time on insert/update
CREATE OR REPLACE FUNCTION set_coach_attendance_clock_in_time()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.clock_in_time := to_char(NEW.clock_in_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coach_attendances_set_clock_in_time ON public.coach_attendances;
CREATE TRIGGER coach_attendances_set_clock_in_time
  BEFORE INSERT OR UPDATE OF clock_in_at ON public.coach_attendances
  FOR EACH ROW EXECUTE FUNCTION set_coach_attendance_clock_in_time();


-- ── 4. coach_invoices — add invoice_number, bank_info, submitted_at, paid_at ──
ALTER TABLE public.coach_invoices
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS bank_info      text,
  ADD COLUMN IF NOT EXISTS submitted_at   timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS paid_at        timestamp with time zone;

UPDATE public.coach_invoices
SET invoice_number = 'INV-' || to_char(created_at, 'YYYYMM') || '-'
    || LPAD((EXTRACT(EPOCH FROM created_at)::bigint % 10000)::text, 4, '0')
WHERE invoice_number IS NULL;


-- ── 5. coach_rates — add rate_per_session (plain column, synced by trigger) ────
ALTER TABLE public.coach_rates
  ADD COLUMN IF NOT EXISTS rate_per_session integer;

UPDATE public.coach_rates
SET rate_per_session = rate
WHERE rate_per_session IS NULL;

CREATE OR REPLACE FUNCTION sync_coach_rate_per_session()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.rate_per_session := NEW.rate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coach_rates_sync_rate_per_session ON public.coach_rates;
CREATE TRIGGER coach_rates_sync_rate_per_session
  BEFORE INSERT OR UPDATE OF rate ON public.coach_rates
  FOR EACH ROW EXECUTE FUNCTION sync_coach_rate_per_session();


-- ── 6. profiles — add email (mirrors auth.users.email) ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND p.email IS NULL;

CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_profile_email();


-- ── 7. member_profiles view ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.member_profiles AS
SELECT
  m.id,
  m.profile_id,
  m.branch_id,
  m.type,
  m.status,
  m.school_id,
  m.date_start,
  m.qr_code,
  m.remaining_sessions,
  m.total_sessions,
  m.pay_status,
  m.admin_notes,
  m.created_at,
  p.full_name,
  p.nick_name,
  p.phone,
  p.avatar_url,
  p.gender,
  p.birth_date,
  p.address,
  p.health_notes,
  r.parent_name,
  r.parent_phone
FROM public.members m
JOIN public.profiles p ON p.id = m.profile_id
LEFT JOIN LATERAL (
  SELECT parent_name, parent_phone
  FROM public.registrations
  WHERE member_id = m.id
  ORDER BY created_at DESC
  LIMIT 1
) r ON true;


-- ── 8. certifications — add title (plain column synced by trigger) + issuer ───
ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS title  text,
  ADD COLUMN IF NOT EXISTS issuer text;

UPDATE public.certifications
SET title = name
WHERE title IS NULL;

CREATE OR REPLACE FUNCTION sync_certification_title()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.title := NEW.name;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS certifications_sync_title ON public.certifications;
CREATE TRIGGER certifications_sync_title
  BEFORE INSERT OR UPDATE OF name ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION sync_certification_title();


-- ── 9. coach_invoice_items — add attendance_id ───────────────────────────────
ALTER TABLE public.coach_invoice_items
  ADD COLUMN IF NOT EXISTS attendance_id uuid
    REFERENCES public.coach_attendances(id) ON DELETE SET NULL;


-- =============================================================================
-- Done. Verify with:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'branches' ORDER BY 1;
-- =============================================================================

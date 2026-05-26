-- migration_004_unrestricted_rls.sql
-- Drop all existing restrictive RLS policies and replace with
-- unrestricted "authenticated can do everything" policies.
-- service_role always bypasses RLS regardless.
-- Run this in Supabase SQL Editor.

-- ============================================================
-- profiles
-- ============================================================
DROP POLICY IF EXISTS "profiles: own read"       ON public.profiles;
DROP POLICY IF EXISTS "profiles: own update"     ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin read"     ON public.profiles;
DROP POLICY IF EXISTS "profiles: owner read"     ON public.profiles;
DROP POLICY IF EXISTS "profiles: admin update"   ON public.profiles;
DROP POLICY IF EXISTS "profiles: owner update"   ON public.profiles;
DROP POLICY IF EXISTS "profiles: insert"         ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: authenticated full access"
  ON public.profiles FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- branches
-- ============================================================
DROP POLICY IF EXISTS "branches: read"           ON public.branches;
DROP POLICY IF EXISTS "branches: admin read"     ON public.branches;
DROP POLICY IF EXISTS "branches: owner manage"   ON public.branches;
DROP POLICY IF EXISTS "branches: insert"         ON public.branches;
DROP POLICY IF EXISTS "branches: update"         ON public.branches;
DROP POLICY IF EXISTS "branches: delete"         ON public.branches;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches: authenticated full access"
  ON public.branches FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- classes
-- ============================================================
DROP POLICY IF EXISTS "classes: read"            ON public.classes;
DROP POLICY IF EXISTS "classes: admin read"      ON public.classes;
DROP POLICY IF EXISTS "classes: manage"          ON public.classes;
DROP POLICY IF EXISTS "classes: insert"          ON public.classes;
DROP POLICY IF EXISTS "classes: update"          ON public.classes;
DROP POLICY IF EXISTS "classes: delete"          ON public.classes;

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes: authenticated full access"
  ON public.classes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- class_coaches
-- ============================================================
DROP POLICY IF EXISTS "class_coaches: read"      ON public.class_coaches;
DROP POLICY IF EXISTS "class_coaches: manage"    ON public.class_coaches;

ALTER TABLE public.class_coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_coaches: authenticated full access"
  ON public.class_coaches FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- class_criteria
-- ============================================================
DROP POLICY IF EXISTS "class_criteria: read"     ON public.class_criteria;
DROP POLICY IF EXISTS "class_criteria: manage"   ON public.class_criteria;

ALTER TABLE public.class_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_criteria: authenticated full access"
  ON public.class_criteria FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- class_holidays
-- ============================================================
DROP POLICY IF EXISTS "class_holidays: read"     ON public.class_holidays;
DROP POLICY IF EXISTS "class_holidays: manage"   ON public.class_holidays;

ALTER TABLE public.class_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_holidays: authenticated full access"
  ON public.class_holidays FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- class_programs
-- ============================================================
DROP POLICY IF EXISTS "class_programs: read"     ON public.class_programs;
DROP POLICY IF EXISTS "class_programs: manage"   ON public.class_programs;

ALTER TABLE public.class_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_programs: authenticated full access"
  ON public.class_programs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- members
-- ============================================================
DROP POLICY IF EXISTS "members: own read"        ON public.members;
DROP POLICY IF EXISTS "members: admin read"      ON public.members;
DROP POLICY IF EXISTS "members: manage"          ON public.members;
DROP POLICY IF EXISTS "members: insert"          ON public.members;
DROP POLICY IF EXISTS "members: update"          ON public.members;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members: authenticated full access"
  ON public.members FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- member_classes
-- ============================================================
DROP POLICY IF EXISTS "member_classes: read"     ON public.member_classes;
DROP POLICY IF EXISTS "member_classes: manage"   ON public.member_classes;

ALTER TABLE public.member_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_classes: authenticated full access"
  ON public.member_classes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- member_attendances
-- ============================================================
DROP POLICY IF EXISTS "member_attendances: read" ON public.member_attendances;
DROP POLICY IF EXISTS "member_attendances: manage" ON public.member_attendances;

ALTER TABLE public.member_attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_attendances: authenticated full access"
  ON public.member_attendances FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- member_leaves
-- ============================================================
DROP POLICY IF EXISTS "member_leaves: read"      ON public.member_leaves;
DROP POLICY IF EXISTS "member_leaves: manage"    ON public.member_leaves;

ALTER TABLE public.member_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_leaves: authenticated full access"
  ON public.member_leaves FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- member_leave_classes
-- ============================================================
DROP POLICY IF EXISTS "member_leave_classes: read"   ON public.member_leave_classes;
DROP POLICY IF EXISTS "member_leave_classes: manage" ON public.member_leave_classes;

ALTER TABLE public.member_leave_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_leave_classes: authenticated full access"
  ON public.member_leave_classes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- member_reviews
-- ============================================================
DROP POLICY IF EXISTS "member_reviews: read"     ON public.member_reviews;
DROP POLICY IF EXISTS "member_reviews: manage"   ON public.member_reviews;

ALTER TABLE public.member_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_reviews: authenticated full access"
  ON public.member_reviews FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- bills
-- ============================================================
DROP POLICY IF EXISTS "bills: own read"          ON public.bills;
DROP POLICY IF EXISTS "bills: admin read"        ON public.bills;
DROP POLICY IF EXISTS "bills: manage"            ON public.bills;

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bills: authenticated full access"
  ON public.bills FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- announcements
-- ============================================================
DROP POLICY IF EXISTS "announcements: read"      ON public.announcements;
DROP POLICY IF EXISTS "announcements: manage"    ON public.announcements;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements: authenticated full access"
  ON public.announcements FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- announcement_classes
-- ============================================================
DROP POLICY IF EXISTS "announcement_classes: read"   ON public.announcement_classes;
DROP POLICY IF EXISTS "announcement_classes: manage" ON public.announcement_classes;

ALTER TABLE public.announcement_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcement_classes: authenticated full access"
  ON public.announcement_classes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- notifications
-- ============================================================
DROP POLICY IF EXISTS "notifications: own read"  ON public.notifications;
DROP POLICY IF EXISTS "notifications: manage"    ON public.notifications;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: authenticated full access"
  ON public.notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- certifications
-- ============================================================
DROP POLICY IF EXISTS "certifications: read"     ON public.certifications;
DROP POLICY IF EXISTS "certifications: manage"   ON public.certifications;

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certifications: authenticated full access"
  ON public.certifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- coach_attendances
-- ============================================================
DROP POLICY IF EXISTS "coach_attendances: read"  ON public.coach_attendances;
DROP POLICY IF EXISTS "coach_attendances: manage" ON public.coach_attendances;

ALTER TABLE public.coach_attendances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_attendances: authenticated full access"
  ON public.coach_attendances FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- coach_leaves
-- ============================================================
DROP POLICY IF EXISTS "coach_leaves: read"       ON public.coach_leaves;
DROP POLICY IF EXISTS "coach_leaves: manage"     ON public.coach_leaves;

ALTER TABLE public.coach_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_leaves: authenticated full access"
  ON public.coach_leaves FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- coach_leave_classes
-- ============================================================
DROP POLICY IF EXISTS "coach_leave_classes: read"   ON public.coach_leave_classes;
DROP POLICY IF EXISTS "coach_leave_classes: manage" ON public.coach_leave_classes;

ALTER TABLE public.coach_leave_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_leave_classes: authenticated full access"
  ON public.coach_leave_classes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- coach_rates
-- ============================================================
DROP POLICY IF EXISTS "coach_rates: read"        ON public.coach_rates;
DROP POLICY IF EXISTS "coach_rates: manage"      ON public.coach_rates;

ALTER TABLE public.coach_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_rates: authenticated full access"
  ON public.coach_rates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- coach_invoices
-- ============================================================
DROP POLICY IF EXISTS "coach_invoices: read"     ON public.coach_invoices;
DROP POLICY IF EXISTS "coach_invoices: manage"   ON public.coach_invoices;

ALTER TABLE public.coach_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_invoices: authenticated full access"
  ON public.coach_invoices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- coach_invoice_items
-- ============================================================
DROP POLICY IF EXISTS "coach_invoice_items: read"   ON public.coach_invoice_items;
DROP POLICY IF EXISTS "coach_invoice_items: manage" ON public.coach_invoice_items;

ALTER TABLE public.coach_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_invoice_items: authenticated full access"
  ON public.coach_invoice_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- rapor_periods
-- ============================================================
DROP POLICY IF EXISTS "rapor_periods: read"      ON public.rapor_periods;
DROP POLICY IF EXISTS "rapor_periods: manage"    ON public.rapor_periods;

ALTER TABLE public.rapor_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rapor_periods: authenticated full access"
  ON public.rapor_periods FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- rapor_entries
-- ============================================================
DROP POLICY IF EXISTS "rapor_entries: read"      ON public.rapor_entries;
DROP POLICY IF EXISTS "rapor_entries: manage"    ON public.rapor_entries;

ALTER TABLE public.rapor_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rapor_entries: authenticated full access"
  ON public.rapor_entries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- registrations
-- ============================================================
DROP POLICY IF EXISTS "registrations: read"      ON public.registrations;
DROP POLICY IF EXISTS "registrations: manage"    ON public.registrations;
-- allow anon insert (public registration form)
DROP POLICY IF EXISTS "registrations: anon insert" ON public.registrations;

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registrations: authenticated full access"
  ON public.registrations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public registration form submits as anon
CREATE POLICY "registrations: anon insert"
  ON public.registrations FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================
-- schools
-- ============================================================
DROP POLICY IF EXISTS "schools: read"            ON public.schools;
DROP POLICY IF EXISTS "schools: manage"          ON public.schools;

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schools: authenticated full access"
  ON public.schools FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Done. All tables now use unrestricted RLS for authenticated users.
-- anon role only has INSERT on registrations (public form).
-- service_role always bypasses RLS entirely.

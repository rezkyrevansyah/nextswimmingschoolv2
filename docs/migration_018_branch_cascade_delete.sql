-- migration_018_branch_cascade_delete.sql
-- Enable full cascade delete from branches down through all dependent tables.
-- Deleting a branch will automatically clean up ALL associated data atomically.
--
-- Cascade chain:
--   branches
--     → classes → class_coaches, class_criteria, member_classes, member_attendances,
--                  coach_leave_classes, member_leave_classes, coach_invoice_items,
--                  coach_rates, announcement_classes, rapor_entries, class_holidays,
--                  class_programs
--     → members → member_leaves → member_leave_classes
--                               (member_attendances already covered via class cascade)
--                  bills, rapor_entries (already covered via class cascade)
--     → coach_attendances → coach_invoice_items (already covered via class cascade)
--     → coach_invoices → coach_invoice_items (already covered via class cascade)
--     → bills
--     → announcements → announcement_classes (already covered via class cascade)
--     → rapor_periods → rapor_entries → member_reviews
--     → schools
--     → registrations
--     → class_holidays (already covered via class cascade)
--   profiles.branch_id → SET NULL (profiles persist, just lose branch link)

-- ── Level 1: branch_id → branches(id) ────────────────────────────────────────

-- classes
ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_branch_id_fkey,
  ADD CONSTRAINT classes_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- members
ALTER TABLE public.members
  DROP CONSTRAINT IF EXISTS members_branch_id_fkey,
  ADD CONSTRAINT members_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- coach_attendances
ALTER TABLE public.coach_attendances
  DROP CONSTRAINT IF EXISTS coach_attendances_branch_id_fkey,
  ADD CONSTRAINT coach_attendances_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- coach_invoices
ALTER TABLE public.coach_invoices
  DROP CONSTRAINT IF EXISTS coach_invoices_branch_id_fkey,
  ADD CONSTRAINT coach_invoices_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- bills
ALTER TABLE public.bills
  DROP CONSTRAINT IF EXISTS bills_branch_id_fkey,
  ADD CONSTRAINT bills_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- announcements
ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_branch_id_fkey,
  ADD CONSTRAINT announcements_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- rapor_periods
ALTER TABLE public.rapor_periods
  DROP CONSTRAINT IF EXISTS rapor_periods_branch_id_fkey,
  ADD CONSTRAINT rapor_periods_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- schools
ALTER TABLE public.schools
  DROP CONSTRAINT IF EXISTS schools_branch_id_fkey,
  ADD CONSTRAINT schools_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- registrations (nullable branch_id)
ALTER TABLE public.registrations
  DROP CONSTRAINT IF EXISTS registrations_branch_id_fkey,
  ADD CONSTRAINT registrations_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- class_holidays (also has class_id fk, handled below)
ALTER TABLE public.class_holidays
  DROP CONSTRAINT IF EXISTS class_holidays_branch_id_fkey,
  ADD CONSTRAINT class_holidays_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

-- profiles: SET NULL — profiles survive, just lose their branch assignment
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_branch_id_fkey,
  ADD CONSTRAINT profiles_branch_id_fkey
    FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- ── Level 2: class_id → classes(id) ──────────────────────────────────────────

-- class_coaches
ALTER TABLE public.class_coaches
  DROP CONSTRAINT IF EXISTS class_coaches_class_id_fkey,
  ADD CONSTRAINT class_coaches_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- class_criteria
ALTER TABLE public.class_criteria
  DROP CONSTRAINT IF EXISTS class_criteria_class_id_fkey,
  ADD CONSTRAINT class_criteria_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- member_classes
ALTER TABLE public.member_classes
  DROP CONSTRAINT IF EXISTS member_classes_class_id_fkey,
  ADD CONSTRAINT member_classes_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- member_attendances
ALTER TABLE public.member_attendances
  DROP CONSTRAINT IF EXISTS member_attendances_class_id_fkey,
  ADD CONSTRAINT member_attendances_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- coach_attendances (class_id fk)
ALTER TABLE public.coach_attendances
  DROP CONSTRAINT IF EXISTS coach_attendances_class_id_fkey,
  ADD CONSTRAINT coach_attendances_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- coach_leave_classes
ALTER TABLE public.coach_leave_classes
  DROP CONSTRAINT IF EXISTS coach_leave_classes_class_id_fkey,
  ADD CONSTRAINT coach_leave_classes_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- member_leave_classes
ALTER TABLE public.member_leave_classes
  DROP CONSTRAINT IF EXISTS member_leave_classes_class_id_fkey,
  ADD CONSTRAINT member_leave_classes_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- coach_invoice_items (class_id fk)
ALTER TABLE public.coach_invoice_items
  DROP CONSTRAINT IF EXISTS coach_invoice_items_class_id_fkey,
  ADD CONSTRAINT coach_invoice_items_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- coach_rates
ALTER TABLE public.coach_rates
  DROP CONSTRAINT IF EXISTS coach_rates_class_id_fkey,
  ADD CONSTRAINT coach_rates_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- announcement_classes
ALTER TABLE public.announcement_classes
  DROP CONSTRAINT IF EXISTS announcement_classes_class_id_fkey,
  ADD CONSTRAINT announcement_classes_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- rapor_entries (class_id fk)
ALTER TABLE public.rapor_entries
  DROP CONSTRAINT IF EXISTS rapor_entries_class_id_fkey,
  ADD CONSTRAINT rapor_entries_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- class_holidays (class_id fk)
ALTER TABLE public.class_holidays
  DROP CONSTRAINT IF EXISTS class_holidays_class_id_fkey,
  ADD CONSTRAINT class_holidays_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- class_programs
ALTER TABLE public.class_programs
  DROP CONSTRAINT IF EXISTS class_programs_class_id_fkey,
  ADD CONSTRAINT class_programs_class_id_fkey
    FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- ── Level 2: member_id → members(id) ─────────────────────────────────────────

-- member_classes (member_id fk)
ALTER TABLE public.member_classes
  DROP CONSTRAINT IF EXISTS member_classes_member_id_fkey,
  ADD CONSTRAINT member_classes_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- member_attendances (member_id fk)
ALTER TABLE public.member_attendances
  DROP CONSTRAINT IF EXISTS member_attendances_member_id_fkey,
  ADD CONSTRAINT member_attendances_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- member_leaves
ALTER TABLE public.member_leaves
  DROP CONSTRAINT IF EXISTS member_leaves_member_id_fkey,
  ADD CONSTRAINT member_leaves_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- bills (member_id fk)
ALTER TABLE public.bills
  DROP CONSTRAINT IF EXISTS bills_member_id_fkey,
  ADD CONSTRAINT bills_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- rapor_entries (member_id fk)
ALTER TABLE public.rapor_entries
  DROP CONSTRAINT IF EXISTS rapor_entries_member_id_fkey,
  ADD CONSTRAINT rapor_entries_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- member_reviews (member_id fk)
ALTER TABLE public.member_reviews
  DROP CONSTRAINT IF EXISTS member_reviews_member_id_fkey,
  ADD CONSTRAINT member_reviews_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE CASCADE;

-- registrations (member_id fk, nullable)
ALTER TABLE public.registrations
  DROP CONSTRAINT IF EXISTS registrations_member_id_fkey,
  ADD CONSTRAINT registrations_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;

-- ── Level 2: invoice_id → coach_invoices(id) ─────────────────────────────────

-- coach_invoice_items (invoice_id fk)
ALTER TABLE public.coach_invoice_items
  DROP CONSTRAINT IF EXISTS coach_invoice_items_invoice_id_fkey,
  ADD CONSTRAINT coach_invoice_items_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES public.coach_invoices(id) ON DELETE CASCADE;

-- coach_attendances (invoice_id fk, nullable)
ALTER TABLE public.coach_attendances
  DROP CONSTRAINT IF EXISTS coach_attendances_invoice_id_fkey,
  ADD CONSTRAINT coach_attendances_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES public.coach_invoices(id) ON DELETE SET NULL;

-- ── Level 2: announcement_id → announcements(id) ─────────────────────────────

-- announcement_classes (announcement_id fk)
ALTER TABLE public.announcement_classes
  DROP CONSTRAINT IF EXISTS announcement_classes_announcement_id_fkey,
  ADD CONSTRAINT announcement_classes_announcement_id_fkey
    FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;

-- ── Level 2: leave_id → coach_leaves(id) / member_leaves(id) ─────────────────

-- coach_leave_classes (leave_id fk)
ALTER TABLE public.coach_leave_classes
  DROP CONSTRAINT IF EXISTS coach_leave_classes_leave_id_fkey,
  ADD CONSTRAINT coach_leave_classes_leave_id_fkey
    FOREIGN KEY (leave_id) REFERENCES public.coach_leaves(id) ON DELETE CASCADE;

-- member_leave_classes (leave_id fk)
ALTER TABLE public.member_leave_classes
  DROP CONSTRAINT IF EXISTS member_leave_classes_leave_id_fkey,
  ADD CONSTRAINT member_leave_classes_leave_id_fkey
    FOREIGN KEY (leave_id) REFERENCES public.member_leaves(id) ON DELETE CASCADE;

-- ── Level 3: period_id → rapor_periods(id) ───────────────────────────────────

-- rapor_entries (period_id fk)
ALTER TABLE public.rapor_entries
  DROP CONSTRAINT IF EXISTS rapor_entries_period_id_fkey,
  ADD CONSTRAINT rapor_entries_period_id_fkey
    FOREIGN KEY (period_id) REFERENCES public.rapor_periods(id) ON DELETE CASCADE;

-- ── Level 4: rapor_id → rapor_entries(id) ────────────────────────────────────

-- member_reviews (rapor_id fk)
ALTER TABLE public.member_reviews
  DROP CONSTRAINT IF EXISTS member_reviews_rapor_id_fkey,
  ADD CONSTRAINT member_reviews_rapor_id_fkey
    FOREIGN KEY (rapor_id) REFERENCES public.rapor_entries(id) ON DELETE CASCADE;

-- ── Level 2: coach_attendance_id → coach_attendances(id) ─────────────────────

-- coach_invoice_items (attendance_id fk)
ALTER TABLE public.coach_invoice_items
  DROP CONSTRAINT IF EXISTS coach_invoice_items_attendance_id_fkey,
  ADD CONSTRAINT coach_invoice_items_attendance_id_fkey
    FOREIGN KEY (attendance_id) REFERENCES public.coach_attendances(id) ON DELETE CASCADE;

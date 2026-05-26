-- migration_005_disable_rls.sql
-- Completely disable RLS on all public tables.
-- Supabase service_role always bypasses RLS regardless.
-- anon/authenticated access is controlled by your API layer instead.
-- Run this in Supabase SQL Editor.

ALTER TABLE public.profiles              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_coaches         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_criteria        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_holidays        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_programs        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.members               DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_classes        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_attendances    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_leaves         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_leave_classes  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_reviews        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills                 DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_classes  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_attendances     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_leaves          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_leave_classes   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_rates           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_invoices        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_invoice_items   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapor_periods         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapor_entries         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools               DISABLE ROW LEVEL SECURITY;

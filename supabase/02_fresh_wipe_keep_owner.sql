-- ============================================================
-- Script 2: Wipe all data — keep owner accounts only
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- WARNING: This is irreversible. Back up first if needed.
-- ============================================================

-- Deepest children first, then work up the FK tree

-- Rapor
DELETE FROM public.member_reviews;
DELETE FROM public.rapor_entries;
DELETE FROM public.rapor_periods;

-- Bills & invoices
DELETE FROM public.coach_invoice_items;
DELETE FROM public.coach_attendances;
DELETE FROM public.coach_invoices;
DELETE FROM public.coach_rates;
DELETE FROM public.bills;

-- Attendance & leaves
DELETE FROM public.member_attendances;
DELETE FROM public.member_leave_classes;
DELETE FROM public.member_leaves;
DELETE FROM public.coach_leave_classes;
DELETE FROM public.coach_leaves;

-- Announcements & notifications
DELETE FROM public.announcement_classes;
DELETE FROM public.announcements;
DELETE FROM public.notifications;

-- Class relations
DELETE FROM public.class_holidays;
DELETE FROM public.class_programs;
DELETE FROM public.class_criteria;
DELETE FROM public.member_classes;
DELETE FROM public.class_coaches;

-- Registrations (references members + branches)
DELETE FROM public.registrations;

-- Members (references profiles + schools + branches)
DELETE FROM public.members;

-- Certifications (references profiles)
DELETE FROM public.certifications;

-- Schools (references profiles + branches)
DELETE FROM public.schools;

-- Classes (references branches)
DELETE FROM public.classes;

-- Non-owner profiles (keep role = 'owner')
DELETE FROM public.profiles WHERE role <> 'owner';

-- Branches — only delete if you want to wipe branch data too.
-- If you want to keep branches, comment out the next line.
-- DELETE FROM public.branches;

-- auth.users: delete non-owner auth accounts
-- (owner profiles are kept above, their auth.users entries stay)
DELETE FROM auth.users
WHERE id NOT IN (
  SELECT id FROM public.profiles WHERE role = 'owner'
);

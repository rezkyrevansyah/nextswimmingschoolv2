-- Migration 021: Add 'late' status to coach_attendances and 'telat' to attendance_status enum

-- 1. Coach attendances: drop + recreate CHECK constraint to allow 'late'
ALTER TABLE public.coach_attendances
  DROP CONSTRAINT IF EXISTS coach_attendances_status_check;
ALTER TABLE public.coach_attendances
  ADD CONSTRAINT coach_attendances_status_check
  CHECK (status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text]));

-- 2. Member attendance status enum: add 'telat' value
ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'telat';

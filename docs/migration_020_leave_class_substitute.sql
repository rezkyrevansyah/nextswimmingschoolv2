-- Migration 020: Add substitute_id per class to coach_leave_classes
-- This allows each affected class in a leave request to have a different substitute coach.
-- The existing coach_leaves.substitute_id is kept for backward compatibility (pre-migration rows).

ALTER TABLE public.coach_leave_classes
  ADD COLUMN IF NOT EXISTS substitute_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

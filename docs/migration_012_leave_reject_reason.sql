-- =============================================================================
-- MIGRATION 012 — Add reject_reason to coach_leaves and member_leaves
-- Run this in Supabase SQL Editor
-- =============================================================================

ALTER TABLE public.coach_leaves
  ADD COLUMN IF NOT EXISTS reject_reason text;

ALTER TABLE public.member_leaves
  ADD COLUMN IF NOT EXISTS reject_reason text;

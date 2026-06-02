-- =============================================================================
-- MIGRATION 011 — Add reject_reason to certifications and registrations
-- Run this in Supabase SQL Editor
-- =============================================================================

ALTER TABLE public.certifications
  ADD COLUMN IF NOT EXISTS reject_reason text;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS reject_reason text;

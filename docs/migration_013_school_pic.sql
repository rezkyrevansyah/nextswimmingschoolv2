-- =============================================================================
-- MIGRATION 013 — Add PIC fields to schools
-- Run this in Supabase SQL Editor
-- =============================================================================

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS pic_name  text,
  ADD COLUMN IF NOT EXISTS pic_phone text;

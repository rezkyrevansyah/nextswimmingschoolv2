-- =============================================================================
-- MIGRATION 010 — Add education fields to profiles for coach profile
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS education_level       text,
  ADD COLUMN IF NOT EXISTS education_institution text;

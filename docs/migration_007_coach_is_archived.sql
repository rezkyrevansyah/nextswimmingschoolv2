-- migration_007_coach_is_archived.sql
-- Add is_archived boolean to profiles for coach/admin archive feature.
-- Run in Supabase SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

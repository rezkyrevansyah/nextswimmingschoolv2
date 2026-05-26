-- migration_006_coach_suspend_columns.sql
-- Add suspend columns to profiles for coach suspend feature.
-- Run in Supabase SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspend_until  date,
  ADD COLUMN IF NOT EXISTS suspend_reason text;

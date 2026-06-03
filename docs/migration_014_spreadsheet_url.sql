-- Migration 014: add spreadsheet_url column to classes table
-- Replaces the old class_programs table approach.
-- Coach now inputs a Google Sheets link instead of filling a form.
-- Run this in Supabase SQL Editor

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS spreadsheet_url text;

-- spreadsheet_filled already exists from migration_003 (as a boolean column).
-- If it does not exist yet, add it:
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS spreadsheet_filled boolean NOT NULL DEFAULT false;

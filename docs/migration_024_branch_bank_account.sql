-- Migration 024: Add bank account fields to branches
-- Stores payment destination info displayed to members on the billing page.
-- NULL = not configured (box hidden from member UI).

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS bank_name    TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS bank_holder  TEXT;

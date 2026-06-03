-- Migration 016: Fix coach_rates table for tarif umum (nullable coach_id) + unique constraint
-- Run this in Supabase SQL Editor

-- 1. Make coach_id nullable so tarif umum (coach_id IS NULL) can be stored
ALTER TABLE public.coach_rates
  ALTER COLUMN coach_id DROP NOT NULL;

-- 2. Ensure rate_per_session is not null (standardize on this column; drop legacy 'rate' if safe)
--    We keep 'rate' column as-is to avoid breaking anything, just ensure rate_per_session is usable.
--    If rate_per_session is null, copy from rate column.
UPDATE public.coach_rates
  SET rate_per_session = rate
  WHERE rate_per_session IS NULL AND rate IS NOT NULL;

-- 3. Add unique constraint so only one tarif umum per class and one tarif khusus per (class, coach)
ALTER TABLE public.coach_rates
  DROP CONSTRAINT IF EXISTS coach_rates_class_coach_unique;

ALTER TABLE public.coach_rates
  ADD CONSTRAINT coach_rates_class_coach_unique
  UNIQUE NULLS NOT DISTINCT (class_id, coach_id);

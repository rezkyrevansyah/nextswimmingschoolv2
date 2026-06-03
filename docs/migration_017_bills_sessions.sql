-- Migration 017: Add session tracking columns to bills table
-- Needed for private member session-pack billing
-- Run in Supabase SQL Editor

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS sessions_total integer,
  ADD COLUMN IF NOT EXISTS sessions_used  integer NOT NULL DEFAULT 0;

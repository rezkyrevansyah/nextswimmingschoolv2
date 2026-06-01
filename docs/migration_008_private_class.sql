-- migration_008_private_class.sql
-- Adds support for private classes and session-pack billing.
--
-- Run in Supabase SQL Editor.

-- 1. Add class_type column to classes (reguler | private)
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS class_type text NOT NULL DEFAULT 'reguler'
  CHECK (class_type IN ('reguler', 'private'));

-- 2. Add price_per_session column to classes (used for private classes)
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS price_per_session integer;

-- 3. Add 'session_pack' to bill_type enum
--    In PostgreSQL, enum values can only be added (not removed) without recreating the type.
ALTER TYPE bill_type ADD VALUE IF NOT EXISTS 'session_pack';

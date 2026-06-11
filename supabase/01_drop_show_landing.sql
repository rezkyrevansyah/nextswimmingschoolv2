-- ============================================================
-- Script 1: Drop show/unshow class logic
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Drop trigger first (references the function)
DROP TRIGGER IF EXISTS classes_sync_aliases ON public.classes;

-- 2. Drop the function
DROP FUNCTION IF EXISTS sync_class_alias_columns();

-- 3. Drop alias column (was added in migration_001 as copy of show_landing)
ALTER TABLE public.classes DROP COLUMN IF EXISTS show_on_landing;

-- 4. Drop original column
ALTER TABLE public.classes DROP COLUMN IF EXISTS show_landing;

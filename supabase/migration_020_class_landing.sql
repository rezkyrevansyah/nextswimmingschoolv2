-- ============================================================
-- Migration 020: show_on_landing flag for classes
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS show_on_landing boolean NOT NULL DEFAULT false;

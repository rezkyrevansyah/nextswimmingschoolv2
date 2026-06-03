-- Migration 015: add description and spreadsheet_url columns to classes table
-- Run this in Supabase SQL Editor

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS spreadsheet_url  text,
  ADD COLUMN IF NOT EXISTS spreadsheet_filled boolean NOT NULL DEFAULT false;

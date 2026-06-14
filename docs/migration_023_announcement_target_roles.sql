-- Migration 023: Add target_roles to announcements
-- Stores which roles receive this announcement as a PostgreSQL text array.
-- Empty array {} = legacy behavior (treated as "all members" by app logic).
-- Valid values: 'member', 'coach', 'admin', 'school'
-- Supports combinations e.g. '{"member","coach"}'

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS target_roles TEXT[] NOT NULL DEFAULT '{}';

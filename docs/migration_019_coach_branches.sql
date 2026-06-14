-- Migration 019: Multi-branch coach support
-- Creates coach_branches junction table so one coach account can be active
-- in multiple branches without creating duplicate accounts.
-- Also adds branch_id to coach_leaves for per-branch scoping.

-- 1. Junction table: coach <-> branch (many-to-many)
CREATE TABLE public.coach_branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(coach_id, branch_id)
);

-- 2. Backfill existing coaches from profiles.branch_id
INSERT INTO public.coach_branches (coach_id, branch_id, is_primary)
SELECT id, branch_id, true
FROM public.profiles
WHERE role = 'coach' AND branch_id IS NOT NULL
ON CONFLICT (coach_id, branch_id) DO NOTHING;

-- 3. Add branch_id to coach_leaves for per-branch scoping
ALTER TABLE public.coach_leaves
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- 4. Backfill branch_id in coach_leaves from profiles.branch_id
UPDATE public.coach_leaves cl
SET branch_id = p.branch_id
FROM public.profiles p
WHERE cl.coach_id = p.id
  AND p.branch_id IS NOT NULL
  AND cl.branch_id IS NULL;

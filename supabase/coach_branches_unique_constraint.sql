-- Prevent duplicate (coach_id, branch_id) rows in coach_branches.
-- Previously "already linked" was only checked at the application level
-- (a check-then-insert race), so concurrent link requests could create
-- duplicate rows. This adds a DB-level guarantee.

-- Dedupe any pre-existing duplicate rows first, keeping the earliest one.
DELETE FROM coach_branches a
USING coach_branches b
WHERE a.coach_id = b.coach_id
  AND a.branch_id = b.branch_id
  AND a.id <> b.id
  AND (a.joined_at, a.id) > (b.joined_at, b.id);

ALTER TABLE coach_branches
  ADD CONSTRAINT coach_branches_coach_branch_unique UNIQUE (coach_id, branch_id);

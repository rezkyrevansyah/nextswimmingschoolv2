-- Migration 027: Activity log for all CRUD operations across roles
-- Client-side fire-and-forget logging via logActivity() helper in src/lib/activityLog.ts
-- No triggers — app uses anon key so DB layer has no user context.

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who did it (denormalized — no FK, owner row may not be in profiles)
  user_id       TEXT        NOT NULL,
  user_role     TEXT        NOT NULL,   -- 'owner' | 'admin' | 'coach' | 'member'
  user_name     TEXT        NOT NULL,   -- full_name at time of action

  -- Branch scope (null = cross-branch / owner-level action)
  branch_id     UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  branch_name   TEXT,                   -- denormalized for display after branch deletion

  -- What was affected
  entity_type   TEXT        NOT NULL,   -- table name: 'bills', 'branches', 'members', etc.
  entity_id     TEXT        NOT NULL,   -- UUID of affected row (TEXT to avoid FK issues)
  entity_label  TEXT,                   -- display name: "Budi Santoso", "Kelas Renang A"

  -- What happened
  action        TEXT        NOT NULL CHECK (action IN (
                  'create', 'update', 'delete',
                  'approve', 'reject', 'publish',
                  'archive', 'restore', 'suspend', 'unsuspend'
                )),

  -- Human-readable description in Indonesian
  label         TEXT        NOT NULL,

  -- Optional structured context (amounts, status changes, etc.)
  meta          JSONB,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at  ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_branch_id   ON public.activity_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id     ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action      ON public.activity_logs(action);

-- Composite: most common owner query — filter by branch, sort by time
CREATE INDEX IF NOT EXISTS idx_activity_logs_branch_time ON public.activity_logs(branch_id, created_at DESC);

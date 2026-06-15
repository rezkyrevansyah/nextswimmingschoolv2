import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "publish"
  | "archive"
  | "restore"
  | "suspend"
  | "unsuspend";

export interface LogActivityOptions {
  /** Actor's user id (profiles.id or auth.uid) */
  userId: string;
  /** 'owner' | 'admin' | 'coach' | 'member' */
  userRole: string;
  /** Full name — denormalized so log stays readable after account deletion */
  userName: string;
  /** branches.id — null for cross-branch / owner-level actions */
  branchId?: string | null;
  /** Branch display name — denormalized */
  branchName?: string | null;
  /** Table name: 'bills', 'members', 'branches', etc. */
  entityType: string;
  /** UUID of the affected row (stored as TEXT to avoid FK constraints) */
  entityId: string;
  /** Human-readable subject: "Budi Santoso", "Kelas Renang A" */
  entityLabel?: string | null;
  /** What happened */
  action: ActivityAction;
  /** Pre-formatted Indonesian description shown in the activity feed */
  label: string;
  /** Optional structured context (amounts, status changes, etc.) */
  meta?: Record<string, unknown>;
}

/**
 * Fire-and-forget insert into activity_logs.
 *
 * - Returns void so callers cannot accidentally await it.
 * - Never throws — errors are silently swallowed in production.
 * - Call AFTER the primary Supabase mutation succeeds, never before.
 *
 * @example
 * const { error } = await supabase.from("bills").update(...).eq("id", id);
 * if (error) return toast.error(...);
 * toast.success("Tagihan diverifikasi");
 * logActivity(supabase, {
 *   userId, userRole: "admin", userName,
 *   branchId, entityType: "bills", entityId: id,
 *   action: "update",
 *   label: `Tagihan Mei 2026 Budi Santoso diverifikasi lunas`,
 *   meta: { amount: 500000, paid_method: "transfer" },
 * });
 */
export function logActivity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  opts: LogActivityOptions
): void {
  supabase
    .from("activity_logs")
    .insert({
      user_id:      opts.userId,
      user_role:    opts.userRole,
      user_name:    opts.userName,
      branch_id:    opts.branchId   ?? null,
      branch_name:  opts.branchName ?? null,
      entity_type:  opts.entityType,
      entity_id:    opts.entityId,
      entity_label: opts.entityLabel ?? null,
      action:       opts.action,
      label:        opts.label,
      meta:         opts.meta ?? null,
    })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error && process.env.NODE_ENV === "development") {
        console.warn("[logActivity] failed:", error.message);
      }
    });
}

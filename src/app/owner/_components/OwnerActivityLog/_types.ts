export interface ActivityLogRow {
  id: string; user_id: string; user_role: string; user_name: string;
  branch_id: string | null; branch_name: string | null;
  entity_type: string; entity_id: string; entity_label: string | null;
  action: string; label: string; meta: Record<string, unknown> | null;
  created_at: string;
}

export const ACTION_BADGE: Record<string, string> = {
  create: "active", update: "manual", delete: "rejected",
  approve: "approved", reject: "rejected", publish: "active",
  archive: "archived", restore: "ok", suspend: "suspend", unsuspend: "ok",
};

export const ENTITY_COLORS: Record<string, string> = {
  branches: "bg-ocean-50 text-ocean-700", students: "bg-wave-50 text-wave-700",
  bills: "bg-ok-50 text-ok-700", coach_invoices: "bg-warn-50 text-warn-700",
  payslips: "bg-ok-50 text-ok-700", registrations: "bg-ocean-50 text-ocean-700",
  certifications: "bg-wave-50 text-wave-700", coach_attendances: "bg-paper-deep text-ink-soft",
  classes: "bg-ocean-50 text-ocean-700", announcements: "bg-wave-50 text-wave-700",
};

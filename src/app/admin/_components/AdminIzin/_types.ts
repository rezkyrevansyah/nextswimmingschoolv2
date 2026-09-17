export interface LeaveRow {
  id: string; type: string; reason: string | null;
  date_from: string; date_to: string; status: string;
  coach_id?: string | null;
  member_id?: string | null;
  member_profile_id?: string | null;
  profile?: { full_name: string; role: string } | null;
  leave_classes?: { class: { name: string } | null }[];
  substitute_profile?: { full_name: string } | null;
  coach_leave_classes?: {
    class_id: string;
    substitute_id: string | null;
    class?: { name: string; schedule_days: string[] } | null;
    substitute?: { full_name: string } | null;
  }[];
}

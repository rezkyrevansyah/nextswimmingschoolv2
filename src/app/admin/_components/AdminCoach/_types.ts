import type { CoachProfile } from "../../_types";

export interface CoachFull extends CoachProfile {
  suspend_until?: string | null;
  suspend_reason?: string | null;
  is_archived?: boolean | null;
  class_coaches?: { class_id: string; role?: string; class?: { id: string; name: string; branch_id: string; time_start: string | null; time_end: string | null; schedule_days: string[] | null; branches?: { name: string; city: string | null } | null } | null }[];
  coach_branches?: { branch_id: string; branches?: { name: string; city: string | null } | null; is_primary: boolean; joined_at: string }[] | null;
}

export const EMPTY_COACH_FORM = { full_name: "", nick_name: "", email: "", phone: "", password: "", gender: "", birth_date: "", specialization: "", bio: "", address: "", education_level: "", education_institution: "", bank_name: "", bank_account: "", bank_holder: "" };

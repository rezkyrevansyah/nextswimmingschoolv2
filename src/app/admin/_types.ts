// Shared types used by multiple admin panel components.
// Types used only by a single component are defined in that component's file.

export interface Branch {
  id: string; name: string; city: string; address: string | null;
  lat: number | null; lng: number | null; wa_numbers: string[] | null;
  logo_url: string | null;
}

export interface ScheduleSlot { day: string; time_start: string; time_end: string }

export interface ClassPackage {
  id: string;
  class_id: string;
  name: string;
  sessions: number;
  price: number;
  sort_order: number;
  active: boolean;
}

export interface ClassRow {
  id: string; name: string; branch_id: string; status: string;
  capacity: number; enrolled: number; price_monthly: number;
  price_per_session: number | null; class_type: string;
  schedule_days: string[]; time_start: string | null; time_end: string | null;
  schedule_times?: ScheduleSlot[] | null;
  goals?: string | null;
  description?: string | null;
  photo_url?: string | null;
  spreadsheet_url?: string | null;
  spreadsheet_filled?: boolean;
  branch?: { name: string } | null;
  class_coaches?: { role: string; profile: { full_name: string; id: string } | null }[];
  coach_spreadsheets?: {
    coach_id: string;
    spreadsheet_url: string;
    updated_at: string;
    coach?: { full_name: string } | null;
  }[];
  packages?: ClassPackage[];
}

export interface CoachProfile {
  id: string; full_name: string; email: string;
  nick_name: string | null; gender: string | null; birth_date: string | null;
  phone: string | null; specialization: string | null;
  bio: string | null; address: string | null;
  education_level: string | null; education_institution: string | null;
  bank_name: string | null; bank_account: string | null; bank_holder: string | null;
  avatar_url?: string | null;
  certifications?: { id: string; name: string; title: string | null; status: string; valid_from: string | null; valid_until: string | null }[];
}

export interface AttendanceRow {
  id: string; coach_id: string; class_id: string; session_date: string; clock_in_time: string | null;
  status: string; distance_meters: number | null; is_manual: boolean;
  manual_note: string | null;
  profile?: { full_name: string } | null;
  class?: { name: string } | null;
}

export interface MemberAttendanceRow {
  id: string; member_id: string; class_id: string; session_date: string;
  status: string; method: string;
  member?: { profile?: { full_name: string } | null } | null;
  class?: { name: string } | null;
}

export interface School {
  id: string; name: string; email: string | null;
  profile_id: string | null;
  pic_name: string | null; pic_phone: string | null;
}

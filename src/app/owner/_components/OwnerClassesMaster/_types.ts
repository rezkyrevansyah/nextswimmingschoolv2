export interface ScheduleSlot {
  day: string;
  time_start: string;
  time_end: string;
}

export interface ClassRow {
  id: string;
  branch_id: string;
  name: string;
  class_type: string | null;
  location_type: string | null;
  external_location_name: string | null;
  external_location_address: string | null;
  google_maps_url: string | null;
  schedule_days: string[] | null;
  schedule_times: ScheduleSlot[] | null;
  time_start: string | null;
  time_end: string | null;
  capacity: number | null;
  enrolled: number;
  price_monthly: number | null;
  price_per_session: number | null;
  goals: string | null;
  description: string | null;
  photo_url: string | null;
  status: string;
  spreadsheet_url: string | null;
  spreadsheet_filled: boolean | null;
  rapor_signer_coach_id: string | null;
  branch?: { id: string; name: string } | null;
  class_coaches?: {
    coach_id: string;
    role: string;
    profile?: { id: string; full_name: string; phone: string | null; avatar_url: string | null } | null;
  }[];
  coach_spreadsheets?: {
    coach_id: string;
    spreadsheet_url: string;
    updated_at: string;
    coach?: { full_name: string } | null;
  }[];
}

export interface CoachProfile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  branch_id?: string | null;
}

export interface ClassCoachDetail {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: "head" | "assistant" | string;
  is_archived?: boolean;
}

export interface ClassStudentDetail {
  id: string;
  student_no: string | null;
  status: string;
  total_sessions: number | null;
  remaining_sessions: number | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  joined_at?: string;
}

export interface CoachAttendanceDetail {
  id: string;
  session_date: string;
  clock_in_time: string | null;
  clock_in_at: string | null;
  status: string;
  distance_meters: number | null;
  is_manual: boolean | null;
  manual_note: string | null;
  profile: { full_name: string | null } | null;
}

export interface StudentAttendanceDetail {
  id: string;
  session_date: string;
  status: string;
  method: string | null;
  created_at: string;
  student: {
    id: string;
    student_no: string | null;
    profile: { full_name: string | null } | null;
  } | null;
}

export const EMPTY_CLASS_FORM = {
  branch_id: "",
  name: "",
  class_type: "reguler",
  location_type: "branch",
  external_location_name: "",
  external_location_address: "",
  google_maps_url: "",
  schedule_days: [] as string[],
  schedule_times: [] as ScheduleSlot[],
  same_time_all: true,
  time_start: "",
  time_end: "",
  capacity: "15",
  price_monthly: "",
  price_per_session: "",
  goals: "",
  description: "",
  photo_url: "",
};

export const DAY_OPTS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export type DetailTab = "info" | "coach" | "student" | "att_coach" | "att_student";

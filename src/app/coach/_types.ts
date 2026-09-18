// Shared types used by multiple Coach panel components. Types used only by a
// single component are defined in that component's file.
import type { PrintCriterion } from "@/lib/printRapor";

export type TabId = "home" | "absen" | "kelas" | "invoice" | "rapor" | "payslip" | "profile";

export interface CoachSpreadsheetRow {
  coach_id: string;
  spreadsheet_url: string;
  updated_at: string;
  coach?: { full_name: string } | null;
}

export interface ClassRow {
  id: string; name: string; schedule_days: string[];
  time_start: string; time_end: string;
  capacity: number; enrolled: number;
  goals: string | null; description: string | null;
  class_type?: string;
  location_type?: string;
  external_location_name?: string | null;
  external_location_address?: string | null;
  google_maps_url?: string | null;
  custom_location_lat?: number | null;
  custom_location_lng?: number | null;
  spreadsheet_filled?: boolean;
  spreadsheet_url?: string | null;
  branch_id?: string;
  branch?: { name: string; city: string; address: string | null } | null;
  student_classes?: { student: { id: string; profile: { full_name: string; avatar_url?: string | null; birth_date: string | null; phone: string | null; gender: string | null; address: string | null; health_notes: string | null } | null } | null }[];
  coach_spreadsheets?: CoachSpreadsheetRow[];
}

export interface AttendanceRow {
  id: string; session_date: string; clock_in_time: string | null;
  distance_meters: number | null; is_manual: boolean; manual_note: string | null; status: string;
  manual_by_profile?: { full_name: string } | null;
  class?: { name: string } | null;
}

export interface StudentAttRow {
  id: string; student_id: string; session_date: string; status: string;
  type?: string; school_grade?: string | null;
  student?: { full_name: string; avatar_url?: string | null; birth_date?: string | null } | null;
}

export interface InvoiceSession {
  id: string; session_date: string; class_id: string; rate_per_session: number;
  rate_set: boolean;
  class?: { name: string } | null;
}

export interface DraftExtraItem { id: string; sessionCount: number; rate: number; }
export interface DraftReimburseItem { id: string; description: string; amount: number; proofUrl: string; }

export interface PastInvoiceItem {
  id: string; item_type: string; class_id: string | null; session_count: number; rate: number;
  description: string | null; proof_url: string | null;
  class?: { name: string } | null;
}

export interface PastInvoice {
  id: string; invoice_number: string; period_label: string; total_amount: number; status: string;
  bank_info: string | null;
  rejection_reason?: string | null;
  coach_invoice_items?: PastInvoiceItem[];
}

export interface RaporEntry {
  id: string; student_id: string; class_id: string; locked: boolean;
  personality?: string | null;
  motivation?: string | null;
  learning_achievements?: string | null;
  level?: string | null;
  level_id?: string | null;
  student?: { student_no?: string | null; profile: { full_name: string; avatar_url?: string | null; birth_date?: string | null } | null } | null;
  class?: { name: string } | null;
  rapor_levels?: { rapor_level_criteria: (PrintCriterion & { sort_order: number })[] } | null;
}

export interface BestTimeRow {
  id: string; stroke: string; distance: number; time_seconds: number;
}

export interface ProfileData {
  id: string; full_name: string; email: string;
  nick_name: string | null; gender: string | null; birth_date: string | null;
  phone: string | null; specialization: string | null;
  bio: string | null; address: string | null;
  education_level: string | null; education_institution: string | null;
  bank_name: string | null; bank_account: string | null; bank_holder: string | null;
  avatar_url: string | null;
  is_profile_complete: boolean;
  suspend_until: string | null;
  suspend_reason: string | null;
  user_no: string | null;
  qr_code: string | null;
  certifications?: { id: string; title: string; issuer: string | null; valid_from: string | null; valid_until: string | null; photo_url: string | null; status: string; reject_reason: string | null }[];
}

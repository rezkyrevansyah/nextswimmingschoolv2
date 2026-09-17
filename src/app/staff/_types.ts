// Shared types used by multiple Staff panel components. Types used only by a
// single component are defined in that component's file.
import type { StaffDbStatus } from "@/lib/attendance";

export type TabId = "home" | "absen" | "invoice" | "payslip" | "expenses" | "profile";

export interface StaffProfile {
  id: string;
  full_name: string;
  email?: string;
  phone?: string | null;
  branch_id?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  bank_holder?: string | null;
  avatar_url?: string | null;
  qr_code?: string | null;
  is_profile_complete?: boolean;
}

export interface BranchInfo {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
}

export interface StaffAttendance {
  id: string;
  attendance_date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: StaffDbStatus;
  note: string | null;
  selfie_url: string | null;
  created_at: string;
}

export interface StaffSalary {
  id: string;
  period_month: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  reimburse_amount: number;
  total_salary: number;
  status: string;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface StaffLeaveRequest {
  id: string;
  type: "izin" | "sakit";
  date_from: string;
  date_to: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  invoice_number: string;
  description: string;
  amount: number;
  proof_url: string | null;
  status: string;
  submitted_at: string;
  rejection_reason: string | null;
  created_at: string;
}

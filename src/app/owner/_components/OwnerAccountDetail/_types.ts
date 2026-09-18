export interface AccountStudentData {
  id: string;
  student_no: string | null;
  qr_code: string | null;
  type: string;
  status: string;
  remaining_sessions: number | null;
  total_sessions: number | null;
  school_id: string | null;
  school_grade: string | null;
  date_start: string | null;
  school?: { id: string; name: string } | null;
  student_classes?: { class: { id: string; name: string; time_start?: string; time_end?: string } }[];
}

export interface AccountProfile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  custom_role_label: string | null;
  branch_id: string | null;
  branch?: { id?: string; name: string } | null;
  avatar_url: string | null;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  user_no: string | null;
  qr_code?: string | null;
  is_archived: boolean;
  created_at: string;
  specialization: string | null;
  bio: string | null;
  linked_admin_id?: string | null;
  student?: AccountStudentData | null;
  students?: AccountStudentData[] | null;
}

export interface Props {
  account: AccountProfile | null;
  branches: { id: string; name: string }[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

// Only roles actually paid through this system carry a bank account —
// students/schools pay the school, they don't receive payouts from it.
export const BANK_ACCOUNT_ROLES = ["staff", "admin", "coach", "manager_center"];

export const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-ocean-100 text-ocean-700 border-ocean-200",
  manager_center: "bg-indigo-100 text-indigo-700 border-indigo-200",
  coach: "bg-wave-100 text-wave-700 border-wave-200",
  student: "bg-green-100 text-green-700 border-green-200",
  school: "bg-amber-100 text-amber-700 border-amber-200",
  staff: "bg-slate-100 text-slate-700 border-slate-200",
};

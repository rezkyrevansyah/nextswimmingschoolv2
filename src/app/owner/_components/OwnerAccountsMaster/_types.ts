export type RoleFilter = "all" | "owner" | "admin" | "manager_center" | "coach" | "student" | "school" | "staff";
export type CreatableRole = "admin" | "manager_center" | "coach" | "student" | "school" | "staff";

/** "budi@sekolah.com" -> "budistaff@sekolah.com"; "" if the email isn't complete yet. */
export const deriveStaffEmail = (email: string): string => {
  const at = email.indexOf("@");
  if (at <= 0) return "";
  return `${email.slice(0, at)}staff${email.slice(at)}`;
};

export const EMPTY_FORM = {
  role: "staff" as CreatableRole,
  full_name: "",
  email: "",
  phone: "",
  branch_id: "",
  password: "",
  custom_role_label: "",
  student_type: "reguler" as "reguler" | "private" | "school_affiliate",
  school_id: "",
  school_grade: "",
  total_sessions: "",
  bank_name: "",
  bank_account: "",
  bank_holder: "",
};

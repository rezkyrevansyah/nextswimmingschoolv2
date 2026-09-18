/**
 * Canonical attendance mapping.
 *
 * Three tables remain the source of truth:
 *   coach_attendances  — coach × class × date   status: present | late | absent
 *   student_attendances — student × class × date  status: hadir | telat | izin | sakit | tidak_hadir
 *   staff_attendances  — staff × calendar day   status: present | absent | izin | sakit
 *
 * UI canon is English: present | late | absent | sick | izin
 * Coach izin/sakit live on coach_leaves; an approved leave writes session
 * rows as original=absent + substitute=present. Staff has no Late.
 * Students never write their own rows (QR / coach / admin / approved leave).
 */

export const UI_ATTENDANCE_STATUSES = ["present", "late", "absent", "sick", "izin"] as const;
export type UiAttendanceStatus = (typeof UI_ATTENDANCE_STATUSES)[number];

export const STUDENT_DB_STATUSES = ["hadir", "telat", "izin", "sakit", "tidak_hadir"] as const;
export type StudentDbStatus = (typeof STUDENT_DB_STATUSES)[number];

export const COACH_DB_STATUSES = ["present", "late", "absent"] as const;
export type CoachDbStatus = (typeof COACH_DB_STATUSES)[number];

export const STAFF_DB_STATUSES = ["present", "absent", "izin", "sakit"] as const;
export type StaffDbStatus = (typeof STAFF_DB_STATUSES)[number];

export type AttendanceStatusKind = "present" | "late" | "absent" | "excused" | "sick";

/** Postgres ON CONFLICT targets — unique indexes already exist in live DB. */
export const COACH_ATTENDANCE_CONFLICT = "coach_id,class_id,session_date";
export const STUDENT_ATTENDANCE_CONFLICT = "class_id,student_id,session_date";
export const STAFF_ATTENDANCE_CONFLICT = "staff_id,attendance_date";

/** Coach is late if clock-in is more than 15 minutes after class start. */
export const COACH_LATE_THRESHOLD_MINUTES = 15;
/** Student QR/scan is late if more than 1 minute after class start. */
export const STUDENT_QR_LATE_THRESHOLD_MINUTES = 1;

export const STUDENT_STATUS_TO_UI: Record<StudentDbStatus, UiAttendanceStatus> = {
  hadir: "present",
  telat: "late",
  tidak_hadir: "absent",
  sakit: "sick",
  izin: "izin",
};

export const UI_TO_STUDENT_STATUS: Record<UiAttendanceStatus, StudentDbStatus> = {
  present: "hadir",
  late: "telat",
  absent: "tidak_hadir",
  sick: "sakit",
  izin: "izin",
};

export const COACH_STATUS_TO_UI: Record<CoachDbStatus, UiAttendanceStatus> = {
  present: "present",
  late: "late",
  absent: "absent",
};

export const STAFF_STATUS_TO_UI: Record<StaffDbStatus, UiAttendanceStatus> = {
  present: "present",
  absent: "absent",
  izin: "izin",
  sakit: "sick",
};

export const UI_TO_STAFF_STATUS: Partial<Record<UiAttendanceStatus, StaffDbStatus>> = {
  present: "present",
  absent: "absent",
  izin: "izin",
  sick: "sakit",
};

function isStudentDbStatus(value: string): value is StudentDbStatus {
  return (STUDENT_DB_STATUSES as readonly string[]).includes(value);
}

function isCoachDbStatus(value: string): value is CoachDbStatus {
  return (COACH_DB_STATUSES as readonly string[]).includes(value);
}

function isStaffDbStatus(value: string): value is StaffDbStatus {
  return (STAFF_DB_STATUSES as readonly string[]).includes(value);
}

/** Map a student_attendances.status (or a UI alias) to the UI canon. */
export function studentDbToUi(status: string | null | undefined): UiAttendanceStatus {
  if (!status) return "absent";
  if (isStudentDbStatus(status)) return STUDENT_STATUS_TO_UI[status];
  if ((UI_ATTENDANCE_STATUSES as readonly string[]).includes(status)) return status as UiAttendanceStatus;
  if (status === "alpha") return "absent";
  return "absent";
}

/** Map a coach_attendances.status to the UI canon. */
export function coachDbToUi(status: string | null | undefined): UiAttendanceStatus {
  if (!status) return "absent";
  if (isCoachDbStatus(status)) return COACH_STATUS_TO_UI[status];
  if (status === "hadir") return "present";
  if (status === "telat") return "late";
  return "absent";
}

/** Map a staff_attendances.status to the UI canon. Staff has no Late. */
export function staffDbToUi(status: string | null | undefined): UiAttendanceStatus {
  if (!status) return "absent";
  if (isStaffDbStatus(status)) return STAFF_STATUS_TO_UI[status];
  if (status === "late") return "present";
  if (status === "hadir") return "present";
  return "absent";
}

export function uiToStudentDb(ui: UiAttendanceStatus): StudentDbStatus {
  return UI_TO_STUDENT_STATUS[ui];
}

export function uiToCoachDb(ui: UiAttendanceStatus): CoachDbStatus | null {
  if (ui === "present" || ui === "late" || ui === "absent") return ui;
  return null;
}

export function uiToStaffDb(ui: UiAttendanceStatus): StaffDbStatus | null {
  return UI_TO_STAFF_STATUS[ui] ?? null;
}

export function uiToStatusKind(ui: UiAttendanceStatus): AttendanceStatusKind {
  if (ui === "izin") return "excused";
  return ui;
}

export function studentStatusKind(status: string | null | undefined): AttendanceStatusKind {
  return uiToStatusKind(studentDbToUi(status));
}

export function coachStatusKind(status: string | null | undefined): AttendanceStatusKind {
  return uiToStatusKind(coachDbToUi(status));
}

export function staffStatusKind(status: string | null | undefined): AttendanceStatusKind {
  return uiToStatusKind(staffDbToUi(status));
}

/** Present-like: attended the session (on time or late). */
export function isStudentPresentLike(status: string | null | undefined): boolean {
  const ui = studentDbToUi(status);
  return ui === "present" || ui === "late";
}

export function isCoachPresentLike(status: string | null | undefined): boolean {
  const ui = coachDbToUi(status);
  return ui === "present" || ui === "late";
}

export function isStaffPresentLike(status: string | null | undefined): boolean {
  return staffDbToUi(status) === "present";
}

export function studentStatusIcon(status: string | null | undefined): "check" | "clipboard" | "warning" | "close" | "info" {
  const ui = studentDbToUi(status);
  if (ui === "present") return "check";
  if (ui === "izin") return "clipboard";
  if (ui === "sick") return "warning";
  if (ui === "absent") return "close";
  return "info";
}

/**
 * Minutes after class start (HH:MM or HH:MM:SS). Negative = early.
 * Empty / unparsable inputs return 0 so callers default to on-time.
 */
export function minutesAfterStart(clockInTime: string, classTimeStart: string): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
    return h * 60 + m;
  };
  return toMin(clockInTime) - toMin(classTimeStart);
}

export function classifyCoachClockIn(minutesLate: number): CoachDbStatus {
  return minutesLate > COACH_LATE_THRESHOLD_MINUTES ? "late" : "present";
}

export function classifyStudentScan(minutesLate: number): StudentDbStatus {
  return minutesLate > STUDENT_QR_LATE_THRESHOLD_MINUTES ? "telat" : "hadir";
}

/** Approved student leave → session status. ujian / lainnya / unknown map to izin. */
export function studentLeaveTypeToStatus(type: string | null | undefined): StudentDbStatus {
  return type === "sakit" ? "sakit" : "izin";
}

/** Approved staff leave → attendance status. Staff leave types already match staff_attendances' status values 1:1. */
export function staffLeaveTypeToStatus(type: "izin" | "sakit"): StaffDbStatus {
  return type;
}

export function isUniqueViolation(message: string | null | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("duplicate key") || lower.includes("unique constraint") || lower.includes("unique_violation");
}

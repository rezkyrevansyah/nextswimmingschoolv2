import { describe, it, expect } from "vitest";
import {
  studentDbToUi,
  coachDbToUi,
  staffDbToUi,
  uiToStudentDb,
  uiToCoachDb,
  uiToStaffDb,
  studentStatusKind,
  coachStatusKind,
  staffStatusKind,
  studentStatusIcon,
  isStudentPresentLike,
  isCoachPresentLike,
  isStaffPresentLike,
  minutesAfterStart,
  classifyCoachClockIn,
  classifyStudentScan,
  studentLeaveTypeToStatus,
  staffLeaveTypeToStatus,
  isUniqueViolation,
  COACH_LATE_THRESHOLD_MINUTES,
  STUDENT_QR_LATE_THRESHOLD_MINUTES,
} from "./attendance";

describe("studentDbToUi", () => {
  it("maps every student enum value", () => {
    expect(studentDbToUi("hadir")).toBe("present");
    expect(studentDbToUi("telat")).toBe("late");
    expect(studentDbToUi("tidak_hadir")).toBe("absent");
    expect(studentDbToUi("sakit")).toBe("sick");
    expect(studentDbToUi("izin")).toBe("izin");
  });

  it("accepts UI aliases and unknown as absent", () => {
    expect(studentDbToUi("present")).toBe("present");
    expect(studentDbToUi("alpha")).toBe("absent");
    expect(studentDbToUi(null)).toBe("absent");
    expect(studentDbToUi("nope")).toBe("absent");
  });
});

describe("coachDbToUi / staffDbToUi", () => {
  it("maps coach session statuses", () => {
    expect(coachDbToUi("present")).toBe("present");
    expect(coachDbToUi("late")).toBe("late");
    expect(coachDbToUi("absent")).toBe("absent");
  });

  it("maps staff statuses and does not invent Late", () => {
    expect(staffDbToUi("present")).toBe("present");
    expect(staffDbToUi("izin")).toBe("izin");
    expect(staffDbToUi("sakit")).toBe("sick");
    expect(staffDbToUi("absent")).toBe("absent");
    expect(uiToStaffDb("late")).toBeNull();
  });
});

describe("round-trip UI ↔ student DB", () => {
  it("round-trips the five UI statuses", () => {
    for (const ui of ["present", "late", "absent", "sick", "izin"] as const) {
      expect(studentDbToUi(uiToStudentDb(ui))).toBe(ui);
    }
  });

  it("coach UI sick/izin have no session status", () => {
    expect(uiToCoachDb("sick")).toBeNull();
    expect(uiToCoachDb("izin")).toBeNull();
    expect(uiToCoachDb("present")).toBe("present");
  });
});

describe("present-like", () => {
  it("counts student hadir and telat as present", () => {
    expect(isStudentPresentLike("hadir")).toBe(true);
    expect(isStudentPresentLike("telat")).toBe(true);
    expect(isStudentPresentLike("izin")).toBe(false);
    expect(isStudentPresentLike("sakit")).toBe(false);
    expect(isStudentPresentLike("tidak_hadir")).toBe(false);
  });

  it("counts coach present and late", () => {
    expect(isCoachPresentLike("present")).toBe(true);
    expect(isCoachPresentLike("late")).toBe(true);
    expect(isCoachPresentLike("absent")).toBe(false);
  });

  it("staff present only (no late)", () => {
    expect(isStaffPresentLike("present")).toBe(true);
    expect(isStaffPresentLike("izin")).toBe(false);
  });
});

describe("studentStatusKind", () => {
  it("uses Status kinds the UI already understands", () => {
    expect(studentStatusKind("hadir")).toBe("present");
    expect(studentStatusKind("telat")).toBe("late");
    expect(studentStatusKind("izin")).toBe("excused");
    expect(studentStatusKind("sakit")).toBe("sick");
    expect(studentStatusKind("tidak_hadir")).toBe("absent");
  });
});

describe("late classification", () => {
  it("coach late after 15 minutes", () => {
    expect(classifyCoachClockIn(COACH_LATE_THRESHOLD_MINUTES)).toBe("present");
    expect(classifyCoachClockIn(COACH_LATE_THRESHOLD_MINUTES + 1)).toBe("late");
    expect(classifyCoachClockIn(-5)).toBe("present");
  });

  it("student QR late after 1 minute", () => {
    expect(classifyStudentScan(STUDENT_QR_LATE_THRESHOLD_MINUTES)).toBe("hadir");
    expect(classifyStudentScan(STUDENT_QR_LATE_THRESHOLD_MINUTES + 1)).toBe("telat");
    expect(classifyStudentScan(-999)).toBe("hadir");
  });

  it("minutesAfterStart handles HH:MM and HH:MM:SS", () => {
    expect(minutesAfterStart("08:16:00", "08:00")).toBe(16);
    expect(minutesAfterStart("08:00", "08:00:00")).toBe(0);
    expect(minutesAfterStart("07:50", "08:00")).toBe(-10);
  });
});

describe("studentLeaveTypeToStatus", () => {
  it("maps sakit, and everything else to izin", () => {
    expect(studentLeaveTypeToStatus("sakit")).toBe("sakit");
    expect(studentLeaveTypeToStatus("izin")).toBe("izin");
    expect(studentLeaveTypeToStatus("ujian")).toBe("izin");
    expect(studentLeaveTypeToStatus("lainnya")).toBe("izin");
  });
});

describe("isUniqueViolation", () => {
  it("detects postgres duplicate messages", () => {
    expect(isUniqueViolation("duplicate key value violates unique constraint")).toBe(true);
    expect(isUniqueViolation("UNIQUE constraint failed")).toBe(true);
    expect(isUniqueViolation("permission denied")).toBe(false);
  });
});

describe("uiToStaffDb full round-trip", () => {
  it("round-trips every UI status staff supports", () => {
    for (const ui of ["present", "absent", "izin", "sick"] as const) {
      expect(staffDbToUi(uiToStaffDb(ui)!)).toBe(ui);
    }
  });
});

describe("uiToStudentDb direct mapping", () => {
  it("maps each UI status to its exact DB value", () => {
    expect(uiToStudentDb("present")).toBe("hadir");
    expect(uiToStudentDb("late")).toBe("telat");
    expect(uiToStudentDb("absent")).toBe("tidak_hadir");
    expect(uiToStudentDb("sick")).toBe("sakit");
    expect(uiToStudentDb("izin")).toBe("izin");
  });
});

describe("coachStatusKind / staffStatusKind", () => {
  it("coach: present/late/absent map straight through, no excused", () => {
    expect(coachStatusKind("present")).toBe("present");
    expect(coachStatusKind("late")).toBe("late");
    expect(coachStatusKind("absent")).toBe("absent");
  });

  it("staff: izin maps to excused, sakit to sick, no late", () => {
    expect(staffStatusKind("izin")).toBe("excused");
    expect(staffStatusKind("sakit")).toBe("sick");
    expect(staffStatusKind("present")).toBe("present");
    expect(staffStatusKind("absent")).toBe("absent");
  });
});

describe("studentStatusIcon", () => {
  it("maps each UI status to its icon", () => {
    expect(studentStatusIcon("hadir")).toBe("check");
    expect(studentStatusIcon("izin")).toBe("clipboard");
    expect(studentStatusIcon("sakit")).toBe("warning");
    expect(studentStatusIcon("tidak_hadir")).toBe("close");
    expect(studentStatusIcon("telat")).toBe("info");
  });
});

describe("legacy-alias branches", () => {
  it("coachDbToUi accepts legacy hadir/telat aliases", () => {
    expect(coachDbToUi("hadir")).toBe("present");
    expect(coachDbToUi("telat")).toBe("late");
  });

  it("staffDbToUi accepts legacy late/hadir aliases (staff has no real Late)", () => {
    expect(staffDbToUi("late")).toBe("present");
    expect(staffDbToUi("hadir")).toBe("present");
  });
});

describe("case sensitivity (characterization, not an endorsement)", () => {
  it("uppercase/mixed-case input is not recognized and falls back to absent", () => {
    expect(studentDbToUi("HADIR")).toBe("absent");
    expect(coachDbToUi("Present")).toBe("absent");
    expect(staffDbToUi("SAKIT")).toBe("absent");
  });
});

describe("staffLeaveTypeToStatus", () => {
  it("maps 1:1 onto staff_attendances' status values", () => {
    expect(staffLeaveTypeToStatus("izin")).toBe("izin");
    expect(staffLeaveTypeToStatus("sakit")).toBe("sakit");
  });
});

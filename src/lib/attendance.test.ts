import { describe, it, expect } from "vitest";
import {
  memberDbToUi,
  coachDbToUi,
  staffDbToUi,
  uiToMemberDb,
  uiToCoachDb,
  uiToStaffDb,
  memberStatusKind,
  coachStatusKind,
  staffStatusKind,
  memberStatusIcon,
  isMemberPresentLike,
  isCoachPresentLike,
  isStaffPresentLike,
  minutesAfterStart,
  classifyCoachClockIn,
  classifyMemberScan,
  memberLeaveTypeToStatus,
  staffLeaveTypeToStatus,
  isUniqueViolation,
  COACH_LATE_THRESHOLD_MINUTES,
  MEMBER_QR_LATE_THRESHOLD_MINUTES,
} from "./attendance";

describe("memberDbToUi", () => {
  it("maps every member enum value", () => {
    expect(memberDbToUi("hadir")).toBe("present");
    expect(memberDbToUi("telat")).toBe("late");
    expect(memberDbToUi("tidak_hadir")).toBe("absent");
    expect(memberDbToUi("sakit")).toBe("sick");
    expect(memberDbToUi("izin")).toBe("izin");
  });

  it("accepts UI aliases and unknown as absent", () => {
    expect(memberDbToUi("present")).toBe("present");
    expect(memberDbToUi("alpha")).toBe("absent");
    expect(memberDbToUi(null)).toBe("absent");
    expect(memberDbToUi("nope")).toBe("absent");
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

describe("round-trip UI ↔ member DB", () => {
  it("round-trips the five UI statuses", () => {
    for (const ui of ["present", "late", "absent", "sick", "izin"] as const) {
      expect(memberDbToUi(uiToMemberDb(ui))).toBe(ui);
    }
  });

  it("coach UI sick/izin have no session status", () => {
    expect(uiToCoachDb("sick")).toBeNull();
    expect(uiToCoachDb("izin")).toBeNull();
    expect(uiToCoachDb("present")).toBe("present");
  });
});

describe("present-like", () => {
  it("counts member hadir and telat as present", () => {
    expect(isMemberPresentLike("hadir")).toBe(true);
    expect(isMemberPresentLike("telat")).toBe(true);
    expect(isMemberPresentLike("izin")).toBe(false);
    expect(isMemberPresentLike("sakit")).toBe(false);
    expect(isMemberPresentLike("tidak_hadir")).toBe(false);
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

describe("memberStatusKind", () => {
  it("uses Status kinds the UI already understands", () => {
    expect(memberStatusKind("hadir")).toBe("present");
    expect(memberStatusKind("telat")).toBe("late");
    expect(memberStatusKind("izin")).toBe("excused");
    expect(memberStatusKind("sakit")).toBe("sick");
    expect(memberStatusKind("tidak_hadir")).toBe("absent");
  });
});

describe("late classification", () => {
  it("coach late after 15 minutes", () => {
    expect(classifyCoachClockIn(COACH_LATE_THRESHOLD_MINUTES)).toBe("present");
    expect(classifyCoachClockIn(COACH_LATE_THRESHOLD_MINUTES + 1)).toBe("late");
    expect(classifyCoachClockIn(-5)).toBe("present");
  });

  it("member QR late after 1 minute", () => {
    expect(classifyMemberScan(MEMBER_QR_LATE_THRESHOLD_MINUTES)).toBe("hadir");
    expect(classifyMemberScan(MEMBER_QR_LATE_THRESHOLD_MINUTES + 1)).toBe("telat");
    expect(classifyMemberScan(-999)).toBe("hadir");
  });

  it("minutesAfterStart handles HH:MM and HH:MM:SS", () => {
    expect(minutesAfterStart("08:16:00", "08:00")).toBe(16);
    expect(minutesAfterStart("08:00", "08:00:00")).toBe(0);
    expect(minutesAfterStart("07:50", "08:00")).toBe(-10);
  });
});

describe("memberLeaveTypeToStatus", () => {
  it("maps sakit, and everything else to izin", () => {
    expect(memberLeaveTypeToStatus("sakit")).toBe("sakit");
    expect(memberLeaveTypeToStatus("izin")).toBe("izin");
    expect(memberLeaveTypeToStatus("ujian")).toBe("izin");
    expect(memberLeaveTypeToStatus("lainnya")).toBe("izin");
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

describe("uiToMemberDb direct mapping", () => {
  it("maps each UI status to its exact DB value", () => {
    expect(uiToMemberDb("present")).toBe("hadir");
    expect(uiToMemberDb("late")).toBe("telat");
    expect(uiToMemberDb("absent")).toBe("tidak_hadir");
    expect(uiToMemberDb("sick")).toBe("sakit");
    expect(uiToMemberDb("izin")).toBe("izin");
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

describe("memberStatusIcon", () => {
  it("maps each UI status to its icon", () => {
    expect(memberStatusIcon("hadir")).toBe("check");
    expect(memberStatusIcon("izin")).toBe("clipboard");
    expect(memberStatusIcon("sakit")).toBe("warning");
    expect(memberStatusIcon("tidak_hadir")).toBe("close");
    expect(memberStatusIcon("telat")).toBe("info");
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
    expect(memberDbToUi("HADIR")).toBe("absent");
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

"use client";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { coachDbToUi, studentDbToUi } from "@/lib/attendance";
import type { OwnerClassesMasterHook } from "./_hook";

const ATT_STATUS_LABELS: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  sick: "Sick",
  izin: "Leave",
  leave: "Leave",
  holiday: "Holiday",
  substitute: "Substitute",
  hadir: "Present",
  telat: "Late",
  tidak_hadir: "Absent",
  sakit: "Sick",
  alpha: "Absent",
};

export function ClassCoachAttendanceTab({ hook }: { hook: OwnerClassesMasterHook }) {
  const { detailLoading, detailCoachAtt } = hook;

  return (
    <div>
      {detailLoading ? (
        <div className="text-center py-8 text-ink-mute text-sm">{"Loading…"}</div>
      ) : detailCoachAtt.length === 0 ? (
        <div className="text-center py-8 text-ink-mute text-sm">{"No coach attendance data yet."}</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-paper-tint border-b border-line text-[10px] uppercase tracking-widest text-ink-faint">
                <th className="text-left py-2.5 px-3 font-bold">{"Date"}</th>
                <th className="text-left py-2.5 px-3 font-bold">{"Coach"}</th>
                <th className="text-left py-2.5 px-3 font-bold">{"Status"}</th>
                <th className="text-left py-2.5 px-3 font-bold">{"Note / Distance"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {detailCoachAtt.map((a) => (
                <tr key={a.id} className="hover:bg-paper-tint/50">
                  <td className="py-2 px-3 font-mono font-semibold text-ink">
                    {a.session_date} {a.clock_in_time && <span className="text-ink-mute">({a.clock_in_time})</span>}
                  </td>
                  <td className="py-2 px-3 font-bold text-ink"><NoTranslate>{a.profile?.full_name ?? "—"}</NoTranslate></td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        coachDbToUi(a.status) === "present"
                          ? "bg-ok-50 text-ok-700"
                          : coachDbToUi(a.status) === "absent"
                          ? "bg-danger-50 text-danger-700"
                          : "bg-warn-50 text-warn-700"
                      }`}
                    >
                      {ATT_STATUS_LABELS[coachDbToUi(a.status)] ?? a.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-ink-mute">
                    {a.is_manual ? (
                      <>
                        Manual: <NoTranslate>{a.manual_note || "—"}</NoTranslate>
                      </>
                    ) : a.distance_meters ? (
                      `${a.distance_meters}m`
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ClassStudentAttendanceTab({ hook }: { hook: OwnerClassesMasterHook }) {
  const { detailLoading, detailStudentAtt } = hook;

  return (
    <div>
      {detailLoading ? (
        <div className="text-center py-8 text-ink-mute text-sm">{"Loading…"}</div>
      ) : detailStudentAtt.length === 0 ? (
        <div className="text-center py-8 text-ink-mute text-sm">{"No student attendance data yet."}</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-paper-tint border-b border-line text-[10px] uppercase tracking-widest text-ink-faint">
                <th className="text-left py-2.5 px-3 font-bold">{"Date"}</th>
                <th className="text-left py-2.5 px-3 font-bold">{"Student"}</th>
                <th className="text-left py-2.5 px-3 font-bold">{"Status"}</th>
                <th className="text-left py-2.5 px-3 font-bold">{"Method"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {detailStudentAtt.map((a) => (
                <tr key={a.id} className="hover:bg-paper-tint/50">
                  <td className="py-2 px-3 font-mono font-semibold text-ink">{a.session_date}</td>
                  <td className="py-2 px-3 font-bold text-ink">
                    <NoTranslate>{a.student?.profile?.full_name ?? a.student?.student_no ?? "—"}</NoTranslate>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        studentDbToUi(a.status) === "present"
                          ? "bg-ok-50 text-ok-700"
                          : studentDbToUi(a.status) === "absent"
                          ? "bg-danger-50 text-danger-700"
                          : "bg-warn-50 text-warn-700"
                      }`}
                    >
                      {ATT_STATUS_LABELS[studentDbToUi(a.status)] ?? a.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-ink-mute uppercase font-mono text-[10px]">
                    {a.method ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

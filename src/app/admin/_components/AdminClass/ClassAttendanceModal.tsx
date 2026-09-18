"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Status from "@/components/ui/Status";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import { studentDbToUi, studentStatusKind } from "@/lib/attendance";
import type { useClassData } from "./useClassData";

type ClassDataHook = ReturnType<typeof useClassData>;

export default function ClassAttendanceModal({ hook }: { hook: ClassDataHook }) {
  const { attClass, setAttClass, attSessions, loadingAtt2, attExpanded, setAttExpanded, isStudentPresentLike } = hook;

  return (
    <Modal open={!!attClass} onClose={() => setAttClass(null)} title={(<>{"Student Attendance — "}<NoTranslate>{attClass?.name ?? ""}</NoTranslate></>)} size="lg"
      footer={<Btn variant="ghost" onClick={() => setAttClass(null)}>{"Close"}</Btn>}>
      {loadingAtt2 ? (
        <div className="py-8 text-center text-ink-mute text-sm">{"Loading…"}</div>
      ) : attSessions.length === 0 ? (
        <div className="py-8 text-center text-ink-mute text-sm">{"No attendance data for this class yet."}</div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {attSessions.map(s => {
            const hadirCount = s.rows.filter(r => isStudentPresentLike(r.status)).length;
            const isOpen = attExpanded.has(s.date);
            return (
              <div key={s.date} className="border border-line rounded-xl overflow-hidden">
                <button type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-paper-tint text-left"
                  onClick={() => setAttExpanded(prev => {
                    const next = new Set(prev);
                    if (next.has(s.date)) next.delete(s.date); else next.add(s.date);
                    return next;
                  })}>
                  <span className="flex-1 font-semibold text-sm text-ink">{fmtDate(s.date)}</span>
                  <span className="text-xs font-bold text-ok-600">{`${hadirCount} present`}</span>
                  <span className="text-xs text-ink-mute">{`${s.rows.length} total`}</span>
                  <Icon name="chevronD" className={`w-4 h-4 text-ink-faint transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-line divide-y divide-line">
                    {s.rows.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex-1 text-sm text-ink"><NoTranslate>{r.student?.profile?.full_name ?? "—"}</NoTranslate></span>
                        <span className="text-xs text-ink-mute capitalize">{r.method === "manual" ? "Manual" : r.method === "qr" ? "QR" : r.method ?? "—"}</span>
                        {(() => {
                          const ui = studentDbToUi(r.status);
                          const label = ui === "present" ? "Present"
                            : ui === "late" ? "Late"
                            : ui === "izin" ? "Excused"
                            : ui === "sick" ? "Sick"
                            : "Absent";
                          return <Status kind={studentStatusKind(r.status)} dot={false}>{label}</Status>;
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

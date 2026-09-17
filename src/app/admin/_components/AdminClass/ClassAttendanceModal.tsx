"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Status from "@/components/ui/Status";
import Modal from "@/components/ui/Modal";
import { fmtDate } from "@/lib/utils";
import { memberDbToUi, memberStatusKind } from "@/lib/attendance";
import type { useClassData } from "./useClassData";

type ClassDataHook = ReturnType<typeof useClassData>;

export default function ClassAttendanceModal({ hook }: { hook: ClassDataHook }) {
  const { t, attClass, setAttClass, attSessions, loadingAtt2, attExpanded, setAttExpanded, isMemberPresentLike } = hook;

  return (
    <Modal open={!!attClass} onClose={() => setAttClass(null)} title={t("admin.classes.attendanceModalTitle", { name: attClass?.name ?? "" })} size="lg"
      footer={<Btn variant="ghost" onClick={() => setAttClass(null)}>{t("common.actions.close")}</Btn>}>
      {loadingAtt2 ? (
        <div className="py-8 text-center text-ink-mute text-sm">{t("admin.classes.loadingEllipsis")}</div>
      ) : attSessions.length === 0 ? (
        <div className="py-8 text-center text-ink-mute text-sm">{t("admin.classes.noAttendanceDataForClass")}</div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {attSessions.map(s => {
            const hadirCount = s.rows.filter(r => isMemberPresentLike(r.status)).length;
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
                  <span className="text-xs font-bold text-ok-600">{t("admin.classes.presentCountSuffix", { count: hadirCount })}</span>
                  <span className="text-xs text-ink-mute">{t("admin.classes.totalCountSuffix", { count: s.rows.length })}</span>
                  <Icon name="chevronD" className={`w-4 h-4 text-ink-faint transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-line divide-y divide-line">
                    {s.rows.map(r => (
                      <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex-1 text-sm text-ink">{r.member?.profile?.full_name ?? "—"}</span>
                        <span className="text-xs text-ink-mute capitalize">{r.method === "manual" ? t("admin.classes.methodManual2") : r.method === "qr" ? t("admin.classes.methodQr2") : r.method ?? "—"}</span>
                        {(() => {
                          const ui = memberDbToUi(r.status);
                          const label = ui === "present" ? t("admin.absensi.statusPresent")
                            : ui === "late" ? t("admin.absensi.statusLate")
                            : ui === "izin" ? t("admin.absensi.statusExcused")
                            : ui === "sick" ? t("admin.absensi.statusSick")
                            : t("admin.absensi.statusAbsent");
                          return <Status kind={memberStatusKind(r.status)} dot={false}>{label}</Status>;
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

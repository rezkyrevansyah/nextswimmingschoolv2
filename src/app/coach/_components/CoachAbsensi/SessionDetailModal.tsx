"use client";
import Icon from "@/components/ui/Icon";
import Btn from "@/components/ui/Btn";
import Modal from "@/components/ui/Modal";
import Status from "@/components/ui/Status";
import { useLocale } from "@/components/providers/LocaleProvider";
import { fmtDate } from "@/lib/utils";
import { memberDbToUi, memberStatusKind, memberStatusIcon } from "@/lib/attendance";
import type { useCoachAbsensi } from "./useCoachAbsensi";

export default function SessionDetailModal({ hook }: { hook: ReturnType<typeof useCoachAbsensi> }) {
  const { t } = useLocale();
  const { detailSesi, setDetailSesi, loadingDetail, detailRows } = hook;

  return (
    <Modal
      open={detailSesi !== null}
      onClose={() => setDetailSesi(null)}
      title={detailSesi ? `${detailSesi.className} — ${fmtDate(detailSesi.date)}` : ""}
      size="sm"
      footer={<Btn variant="ghost" onClick={() => setDetailSesi(null)}>{t("common.actions.close")}</Btn>}
    >
      {loadingDetail ? (
        <div className="py-6 text-center text-ink-mute text-sm">{t("coach.leave.loadingEllipsis")}</div>
      ) : (
        <div>
          {/* Summary bar */}
          <div className="flex gap-4 text-xs font-bold mb-4 pb-3 border-b border-line flex-wrap">
            <span className="flex items-center gap-1 text-ok-600">
              <span className="w-4 h-4 rounded-full bg-ok-100 flex items-center justify-center"><Icon name="check" className="w-2.5 h-2.5" strokeWidth={3} /></span>
              {detailRows.filter(r => memberDbToUi(r.status) === "present").length} {t("coach.absen.attStatusHadir")}
            </span>
            <span className="flex items-center gap-1 text-warn-600">
              <span className="w-4 h-4 rounded-full bg-warn-100 flex items-center justify-center"><Icon name="info" className="w-2.5 h-2.5" /></span>
              {detailRows.filter(r => memberDbToUi(r.status) === "late").length} {t("coach.absen.attStatusTelat")}
            </span>
            <span className="flex items-center gap-1 text-warn-600">
              <span className="w-4 h-4 rounded-full bg-warn-100 flex items-center justify-center"><Icon name="clipboard" className="w-2.5 h-2.5" /></span>
              {detailRows.filter(r => memberDbToUi(r.status) === "izin").length} {t("coach.absen.attStatusIzin")}
            </span>
            <span className="flex items-center gap-1 text-orange-500">
              <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center"><Icon name="warning" className="w-2.5 h-2.5" /></span>
              {detailRows.filter(r => memberDbToUi(r.status) === "sick").length} {t("coach.absen.attStatusSakit")}
            </span>
            <span className="flex items-center gap-1 text-danger-500">
              <span className="w-4 h-4 rounded-full bg-danger-100 flex items-center justify-center"><Icon name="close" className="w-2.5 h-2.5" /></span>
              {detailRows.filter(r => memberDbToUi(r.status) === "absent").length} {t("coach.absen.attStatusTidakHadirShort")}
            </span>
          </div>
          <div className="space-y-0.5">
            {detailRows.map(r => {
              const ui = memberDbToUi(r.status);
              const kind = memberStatusKind(r.status);
              const icon = memberStatusIcon(r.status);
              const label = ui === "present" ? t("coach.absen.attStatusHadir")
                : ui === "late" ? t("coach.absen.attStatusTelat")
                : ui === "izin" ? t("coach.absen.attStatusIzin")
                : ui === "sick" ? t("coach.absen.attStatusSakit")
                : t("coach.absen.attStatusTidakHadirFull");
              return (
              <div key={r.member_id} className="flex items-center gap-3 py-2.5 border-b border-line last:border-0">
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  ui === "present" ? "bg-ok-50 text-ok-600" :
                  ui === "absent" ? "bg-danger-50 text-danger-500" :
                  "bg-warn-50 text-warn-600"
                }`}>
                  <Icon name={icon} className="w-4 h-4" strokeWidth={ui === "present" ? 2.5 : 2} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink truncate">{r.full_name}</div>
                </div>
                <Status kind={kind}>
                  {label}
                </Status>
              </div>
              );
            })}
            {detailRows.length === 0 && (
              <div className="py-4 text-center text-ink-mute text-sm">{t("coach.absen.noAttendanceDataForSession")}</div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

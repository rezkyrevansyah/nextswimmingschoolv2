"use client";
import Btn from "@/components/ui/Btn";
import Status from "@/components/ui/Status";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import { fmtDate } from "@/lib/utils";
import type { useIzinData } from "./useIzinData";

type IzinDataHook = ReturnType<typeof useIzinData>;

export default function DetailLeaveModal({ hook }: { hook: IzinDataHook }) {
  const {
    t, typeLabel, statusLabel, tab,
    detailTarget, setDetailTarget, setRejectTarget, setRejectReason, decide,
  } = hook;

  return (
    <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title={t("admin.izin.detailModalTitle2")} size="md"
      footer={
        <div className="flex gap-2 w-full">
          {detailTarget?.status === "pending" && (
            <>
              <Btn variant="ghost" className="text-danger-500"
                onClick={() => { setRejectTarget(detailTarget); setRejectReason(""); setDetailTarget(null); }}>{t("common.actions.reject")}</Btn>
              <Btn variant="soft" icon="check"
                onClick={() => { decide(detailTarget.id, "approved"); setDetailTarget(null); }}>{t("common.actions.approve")}</Btn>
            </>
          )}
          <Btn variant="ghost" className="ml-auto" onClick={() => setDetailTarget(null)}>{t("common.actions.close")}</Btn>
        </div>
      }>
      {detailTarget && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4 p-4 bg-paper-tint rounded-2xl">
            <Avatar name={detailTarget.profile?.full_name ?? "?"} size={48} />
            <div className="min-w-0">
              <div className="font-display font-bold text-lg text-ink leading-tight truncate">{detailTarget.profile?.full_name ?? "—"}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Status kind={detailTarget.status as "pending" | "approved" | "rejected"}>
                  {statusLabel(detailTarget.status)}
                </Status>
                <span className="text-xs text-ink-mute capitalize">{typeLabel(detailTarget.type)}</span>
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className="bg-paper-tint rounded-xl divide-y divide-line">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-ink-mute">{t("admin.izin.colType")}</span>
              <span className="text-sm text-ink font-medium capitalize">{typeLabel(detailTarget.type)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-ink-mute">{t("admin.izin.rowStartDate")}</span>
              <span className="text-sm text-ink">{fmtDate(detailTarget.date_from)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-ink-mute">{t("admin.izin.rowEndDate")}</span>
              <span className="text-sm text-ink">{fmtDate(detailTarget.date_to)}</span>
            </div>
            {detailTarget.date_from !== detailTarget.date_to && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-ink-mute">{t("admin.izin.rowDuration")}</span>
                <span className="text-sm text-ink tabular-nums">
                  {t("admin.izin.daysCountSuffix", { n: Math.round((new Date(detailTarget.date_to).getTime() - new Date(detailTarget.date_from).getTime()) / 86400000) + 1 })}
                </span>
              </div>
            )}
          </div>

          {/* Reason — main ask */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.izin.reasonNotesLabel")}</div>
            {detailTarget.reason
              ? <p className="text-sm text-ink bg-paper-tint rounded-xl px-4 py-3 leading-relaxed whitespace-pre-wrap">{detailTarget.reason}</p>
              : <p className="text-sm text-ink-faint italic px-4 py-3 bg-paper-tint rounded-xl">{t("admin.izin.noNotes")}</p>
            }
          </div>

          {/* Per-class substitutes (coach, new format) */}
          {tab === "coach" && detailTarget.coach_leave_classes && detailTarget.coach_leave_classes.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest font-bold text-ink-faint">{t("admin.izin.classesAndSubstitutesLabel")}</div>
              <div className="bg-paper-tint rounded-xl divide-y divide-line">
                {detailTarget.coach_leave_classes.map(lc => (
                  <div key={lc.class_id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-ink">{lc.class?.name ?? "—"}</span>
                    {lc.substitute?.full_name
                      ? <span className="text-xs font-semibold text-ok-600">{lc.substitute.full_name}</span>
                      : <span className="text-xs text-warn-600">{t("admin.izin.noSubstituteYet")}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback: old single substitute (pre-migration) */}
          {tab === "coach" && !(detailTarget.coach_leave_classes?.length) && detailTarget.substitute_profile && (
            <div className="bg-paper-tint rounded-xl divide-y divide-line">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-ink-mute">{t("admin.izin.colSubstitute")}</span>
                <span className="text-sm font-semibold text-ok-600">{detailTarget.substitute_profile.full_name}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

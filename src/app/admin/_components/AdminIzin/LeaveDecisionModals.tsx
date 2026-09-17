"use client";
import Btn from "@/components/ui/Btn";
import { Field, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { fmtDate } from "@/lib/utils";
import type { useIzinData } from "./useIzinData";

type IzinDataHook = ReturnType<typeof useIzinData>;

export default function LeaveDecisionModals({ hook }: { hook: IzinDataHook }) {
  const {
    t, typeLabel, tab,
    approveTarget, setApproveTarget, classSubstitutes, setClassSubstitutes, approving, allCoaches, confirmApprove,
    rejectTarget, setRejectTarget, rejectReason, setRejectReason, rejecting, confirmReject,
  } = hook;

  return (
    <>
      {/* Approve coach leave + assign per-class substitute modal */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title={t("admin.izin.approveCoachLeaveModalTitle")} size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setApproveTarget(null)}>{t("common.actions.cancel")}</Btn>
          <Btn variant="primary" icon="check" onClick={confirmApprove}
            disabled={approving || (approveTarget?.coach_leave_classes?.length ? approveTarget.coach_leave_classes.some(lc => !classSubstitutes[lc.class_id]) : false)}>
            {approving ? t("admin.izin.approvingBtn") : t("admin.izin.approveLeaveBtn")}
          </Btn>
        </>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="text-sm font-semibold text-ink">{approveTarget?.profile?.full_name}</div>
            <div className="text-xs text-ink-mute mt-0.5">{fmtDate(approveTarget?.date_from ?? "")} – {fmtDate(approveTarget?.date_to ?? "")} · {typeLabel(approveTarget?.type ?? "")}</div>
            {approveTarget?.reason && <div className="text-xs text-ink-soft mt-1">{approveTarget.reason}</div>}
          </Card>
          {approveTarget?.coach_leave_classes && approveTarget.coach_leave_classes.length > 0 ? (
            <div>
              <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider mb-2">{t("admin.izin.substitutePerClassLabel")}</div>
              <div className="space-y-3">
                {approveTarget.coach_leave_classes.map(lc => (
                  <div key={lc.class_id} className="space-y-1.5">
                    <div className="text-sm font-semibold text-ink">{lc.class?.name ?? "—"}</div>
                    <Select
                      value={classSubstitutes[lc.class_id] ?? ""}
                      onChange={e => setClassSubstitutes(prev => ({ ...prev, [lc.class_id]: e.target.value }))}
                    >
                      <option value="">{t("admin.izin.selectSubstitutePlaceholder")}</option>
                      {allCoaches
                        .filter(c => c.full_name !== approveTarget?.profile?.full_name)
                        .map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </Select>
                    {!classSubstitutes[lc.class_id] && (
                      <p className="text-xs text-warn-600">{t("admin.izin.substituteRequiredHint")}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Field label={t("admin.izin.assignSubstituteLabel")} hint={t("admin.izin.assignSubstituteHint")}>
              <Select value={classSubstitutes["__single__"] ?? ""} onChange={e => setClassSubstitutes({ "__single__": e.target.value })}>
                <option value="">{t("admin.izin.noSubstitutePlaceholder")}</option>
                {allCoaches
                  .filter(c => c.full_name !== approveTarget?.profile?.full_name)
                  .map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
            </Field>
          )}
        </div>
      </Modal>

      {/* Reject leave + reason modal (coach & member) */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={t("admin.izin.rejectLeaveModalTitle", { role: tab === "coach" ? t("admin.izin.roleCoach") : t("admin.izin.roleMember") })} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectTarget(null)}>{t("common.actions.cancel")}</Btn><Btn variant="danger" onClick={confirmReject} disabled={rejecting}>{rejecting ? t("admin.izin.rejectingBtn2") : t("admin.izin.rejectLeaveBtn")}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="text-sm font-semibold text-ink">{rejectTarget?.profile?.full_name}</div>
            <div className="text-xs text-ink-mute mt-0.5">{fmtDate(rejectTarget?.date_from ?? "")} – {fmtDate(rejectTarget?.date_to ?? "")} · {typeLabel(rejectTarget?.type ?? "")}</div>
            {rejectTarget?.reason && <div className="text-xs text-ink-soft mt-1">{rejectTarget.reason}</div>}
          </Card>
          <Field label={t("admin.izin.fieldRejectReason2")} required hint={t("admin.izin.rejectReasonHint")}>
            <Textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={t("admin.izin.rejectReasonPlaceholder")} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

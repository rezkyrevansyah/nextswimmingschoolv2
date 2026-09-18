"use client";
import Btn from "@/components/ui/Btn";
import { Field, Select, Textarea } from "@/components/ui/FormFields";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { NoTranslate } from "@/components/ui/NoTranslate";
import { fmtDate } from "@/lib/utils";
import type { useIzinData } from "./useIzinData";

type IzinDataHook = ReturnType<typeof useIzinData>;

export default function LeaveDecisionModals({ hook }: { hook: IzinDataHook }) {
  const {
    typeLabel, tab,
    approveTarget, setApproveTarget, classSubstitutes, setClassSubstitutes, approving, allCoaches, confirmApprove,
    rejectTarget, setRejectTarget, rejectReason, setRejectReason, rejecting, confirmReject,
  } = hook;

  return (
    <>
      {/* Approve coach leave + assign per-class substitute modal */}
      <Modal open={!!approveTarget} onClose={() => setApproveTarget(null)} title={"Approve Coach Leave"} size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setApproveTarget(null)}>{"Cancel"}</Btn>
          <Btn variant="primary" icon="check" onClick={confirmApprove}
            disabled={approving || (approveTarget?.coach_leave_classes?.length ? approveTarget.coach_leave_classes.some(lc => !classSubstitutes[lc.class_id]) : false)}>
            {approving ? "Approving…" : "Approve Leave"}
          </Btn>
        </>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="text-sm font-semibold text-ink"><NoTranslate>{approveTarget?.profile?.full_name}</NoTranslate></div>
            <div className="text-xs text-ink-mute mt-0.5">{fmtDate(approveTarget?.date_from ?? "")} – {fmtDate(approveTarget?.date_to ?? "")} · {typeLabel(approveTarget?.type ?? "")}</div>
            {approveTarget?.reason && <div className="text-xs text-ink-soft mt-1"><NoTranslate>{approveTarget.reason}</NoTranslate></div>}
          </Card>
          {approveTarget?.coach_leave_classes && approveTarget.coach_leave_classes.length > 0 ? (
            <div>
              <div className="text-xs font-semibold text-ink-mute uppercase tracking-wider mb-2">{"Substitute per Class"}</div>
              <div className="space-y-3">
                {approveTarget.coach_leave_classes.map(lc => (
                  <div key={lc.class_id} className="space-y-1.5">
                    <div className="text-sm font-semibold text-ink"><NoTranslate>{lc.class?.name ?? "—"}</NoTranslate></div>
                    <Select
                      value={classSubstitutes[lc.class_id] ?? ""}
                      onChange={e => setClassSubstitutes(prev => ({ ...prev, [lc.class_id]: e.target.value }))}
                    >
                      <option value="">{"— select substitute coach —"}</option>
                      {allCoaches
                        .filter(c => c.full_name !== approveTarget?.profile?.full_name)
                        .map(c => <option key={c.id} value={c.id} translate="no">{c.full_name}</option>)}
                    </Select>
                    {!classSubstitutes[lc.class_id] && (
                      <p className="text-xs text-warn-600">{"A substitute is required for this class"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Field label={"Assign Substitute Coach"} hint={"Optional. The substitute appears on their coach page with a 'Substitute' label during the leave dates."}>
              <Select value={classSubstitutes["__single__"] ?? ""} onChange={e => setClassSubstitutes({ "__single__": e.target.value })}>
                <option value="">{"— no substitute —"}</option>
                {allCoaches
                  .filter(c => c.full_name !== approveTarget?.profile?.full_name)
                  .map(c => <option key={c.id} value={c.id} translate="no">{c.full_name}</option>)}
              </Select>
            </Field>
          )}
        </div>
      </Modal>

      {/* Reject leave + reason modal (coach & student) */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title={`Reject ${tab === "coach" ? "Coach" : "Student"} Leave`} size="sm"
        footer={<><Btn variant="ghost" onClick={() => setRejectTarget(null)}>{"Cancel"}</Btn><Btn variant="danger" onClick={confirmReject} disabled={rejecting}>{rejecting ? "Rejecting…" : "Reject Leave"}</Btn></>}>
        <div className="space-y-4">
          <Card className="!p-3 bg-paper-tint">
            <div className="text-sm font-semibold text-ink"><NoTranslate>{rejectTarget?.profile?.full_name}</NoTranslate></div>
            <div className="text-xs text-ink-mute mt-0.5">{fmtDate(rejectTarget?.date_from ?? "")} – {fmtDate(rejectTarget?.date_to ?? "")} · {typeLabel(rejectTarget?.type ?? "")}</div>
            {rejectTarget?.reason && <div className="text-xs text-ink-soft mt-1"><NoTranslate>{rejectTarget.reason}</NoTranslate></div>}
          </Card>
          <Field label={"Rejection reason"} required hint={"Required — will be seen by the coach/student."}>
            <Textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={"E.g. Date clashes with a branch event."} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
